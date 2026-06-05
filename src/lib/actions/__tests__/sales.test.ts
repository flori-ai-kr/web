import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
vi.mock('../customers', () => ({ findOrCreateCustomer: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import { AppError, ErrorCode } from '@/lib/errors'
import { findOrCreateCustomer } from '../customers'
import {
  getSales,
  loadMoreSales,
  getSalesSummary,
  createSale,
  updateSale,
  completeUnpaidSale,
  revertUnpaidSale,
  deleteSale,
  getSaleById,
  getSaleSuggestions,
} from '../sales'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockFindOrCreate = vi.mocked(findOrCreateCustomer)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kSale = {
  id: 's1', date: '2026-01-01', productName: '꽃다발', productCategory: null,
  amount: 50000, paymentMethod: 'card', cardCompany: '신한', fee: 750,
  expectedDeposit: 49250, expectedDepositDate: '2026-01-03', depositStatus: 'pending',
  depositedAt: null, reservationChannel: 'phone', customerName: '홍', customerPhone: null,
  customerId: null, note: null, isUnpaid: false, hasReview: false,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const saleForm = (over: Record<string, string> = {}) => {
  const fd = new FormData()
  fd.set('date', '2026-01-01')
  fd.set('product_category', '꽃다발')
  fd.set('amount', '50000')
  fd.set('payment_method', 'card')
  for (const [k, v] of Object.entries(over)) fd.set(k, v)
  return fd
}

const body = (call = 0) => JSON.parse(mockApiFetch.mock.calls[call][1]!.body as string)

describe('getSales', () => {
  it('offset/limit/month/다중필터/search를 쿼리로 구성', async () => {
    mockApiFetch.mockResolvedValue({ sales: [kSale], hasMore: true })
    const res = await getSales('2026-01', 100, 50, { category: ['a', 'b'], payment: ['card'], channel: ['phone'], search: '홍' })
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toContain('offset=100')
    expect(url).toContain('limit=50')
    expect(url).toContain('month=2026-01')
    expect(url).toContain('category=a')
    expect(url).toContain('category=b')
    expect(url).toContain('payment=card')
    expect(url).toContain('channel=phone')
    expect(res.hasMore).toBe(true)
    expect(res.sales[0].product_category).toBe('꽃다발') // null이면 productName
  })

  it('기본 offset/limit', async () => {
    mockApiFetch.mockResolvedValue({ sales: [], hasMore: false })
    await getSales()
    expect(mockApiFetch).toHaveBeenCalledWith('/sales?offset=0&limit=100')
  })
})

describe('loadMoreSales', () => {
  it('month null을 undefined로 위임', async () => {
    mockApiFetch.mockResolvedValue({ sales: [], hasMore: false })
    await loadMoreSales(null, 200)
    expect(mockApiFetch).toHaveBeenCalledWith('/sales?offset=200&limit=100')
  })
})

describe('getSalesSummary', () => {
  it('집계를 반환하고 누락은 0으로 보정', async () => {
    mockApiFetch.mockResolvedValue({ total: 100, card: 60 })
    const res = await getSalesSummary('2026-01', { category: ['x'] })
    expect(res).toEqual({ total: 100, card: 60, naverpay: 0, transfer: 0, cash: 0, count: 0 })
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toContain('/sales/summary?')
    expect(url).toContain('category=x')
  })
})

describe('createSale', () => {
  it('customer_id가 있으면 그대로 사용해 POST', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    await createSale(saleForm({ customer_id: 'c9', customer_name: '홍' }))
    expect(body().customerId).toBe('c9')
    expect(mockFindOrCreate).not.toHaveBeenCalled()
  })

  it('이름+전화번호면 findOrCreateCustomer로 해석', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    mockFindOrCreate.mockResolvedValue({ id: 'c1' } as never)
    await createSale(saleForm({ customer_name: '홍길동', customer_phone: '010-1234-5678' }))
    expect(mockFindOrCreate).toHaveBeenCalledWith('홍길동', '010-1234-5678')
    expect(body().customerId).toBe('c1')
  })

  it('findOrCreate 실패 시 customerId는 null', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    mockFindOrCreate.mockRejectedValue(new Error('boom'))
    await createSale(saleForm({ customer_name: '홍길동', customer_phone: '010-1234-5678' }))
    expect(body().customerId).toBeNull()
  })

  it('이름만 있고 전화 없으면 null', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    await createSale(saleForm({ customer_name: '홍길동' }))
    expect(body().customerId).toBeNull()
    expect(mockFindOrCreate).not.toHaveBeenCalled()
  })

  it('필수값(payment_method) 누락은 거부', async () => {
    await expect(createSale(saleForm({ payment_method: '' }))).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('성공 시 세 경로를 revalidate', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    await createSale(saleForm())
    expect(body().reservationChannel).toBe('other') // 기본값
  })
})

describe('updateSale', () => {
  it('잘못된 id 거부', async () => {
    await expect(updateSale('x', saleForm())).rejects.toThrow('올바르지 않은 ID')
  })

  it('제공된 필드만 PATCH 본문에 포함', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    const fd = new FormData()
    fd.set('amount', '70000')
    await updateSale('1', fd)
    expect(body()).toEqual({ amount: 70000 })
  })

  it('has_review 플래그를 boolean으로 변환', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    const fd = new FormData()
    fd.set('has_review', 'true')
    await updateSale('1', fd)
    expect(body().hasReview).toBe(true)
  })

  it('customer_name 전송 시 고객을 해석해 customerId 포함', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    mockFindOrCreate.mockResolvedValue({ id: 'c5' } as never)
    const fd = new FormData()
    fd.set('customer_name', '홍길동')
    fd.set('customer_phone', '010-1234-5678')
    await updateSale('1', fd)
    expect(body().customerId).toBe('c5')
  })
})

describe('completeUnpaidSale', () => {
  it('id+결제방식 검증 후 POST', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    await completeUnpaidSale('1', 'card')
    expect(mockApiFetch).toHaveBeenCalledWith('/sales/1/complete-unpaid', expect.objectContaining({ method: 'POST' }))
    expect(body().paymentMethod).toBe('card')
  })

  it('잘못된 결제방식 거부', async () => {
    await expect(completeUnpaidSale('1', 'bitcoin')).rejects.toThrow('결제방식')
  })

  it('잘못된 id 거부', async () => {
    await expect(completeUnpaidSale('x', 'card')).rejects.toThrow('올바르지 않은 ID')
  })
})

describe('revertUnpaidSale / deleteSale', () => {
  it('revert POST', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    await revertUnpaidSale('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/sales/1/revert-unpaid', { method: 'POST' })
  })

  it('delete DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteSale('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/sales/1', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(revertUnpaidSale('x')).rejects.toThrow('올바르지 않은 ID')
    await expect(deleteSale('x')).rejects.toThrow('올바르지 않은 ID')
  })
})

describe('getSaleById', () => {
  it('정상 조회', async () => {
    mockApiFetch.mockResolvedValue(kSale)
    expect((await getSaleById('s1'))?.id).toBe('s1')
  })

  it('NOT_FOUND는 null', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.NOT_FOUND, '없음'))
    expect(await getSaleById('s1')).toBeNull()
  })

  it('다른 에러는 전파', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.UNKNOWN, 'x'))
    await expect(getSaleById('s1')).rejects.toThrow()
  })
})

describe('getSaleSuggestions', () => {
  it('memos를 반환', async () => {
    mockApiFetch.mockResolvedValue({ memos: ['리본 포장'] })
    expect(await getSaleSuggestions()).toEqual({ memos: ['리본 포장'] })
    expect(mockApiFetch).toHaveBeenCalledWith('/sales/suggestions')
  })
})
