import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerGrade,
  deleteCustomer,
  findOrCreateCustomer,
  getCustomerSales,
  searchCustomersByName,
  checkPhoneDuplicate,
} from '../customers'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kCustomer = {
  id: 'c1',
  name: '홍길동',
  phone: '010-1234-5678',
  grade: 'regular',
  gender: 'male',
  note: '단골',
  totalPurchaseCount: 3,
  totalPurchaseAmount: 150000,
  firstPurchaseDate: '2026-01-01',
  lastPurchaseDate: '2026-03-01',
  createdAt: '2026-01-01',
  updatedAt: '2026-03-01',
}

const form = (fields: Record<string, string>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('getCustomers / getCustomerById', () => {
  it('목록을 조회해 snake_case로 매핑한다', async () => {
    mockApiFetch.mockResolvedValue([kCustomer])
    const res = await getCustomers()
    expect(mockApiFetch).toHaveBeenCalledWith('/customers')
    expect(res[0]).toMatchObject({
      id: 'c1',
      name: '홍길동',
      grade: 'regular',
      gender: 'male',
      total_purchase_count: 3,
      total_purchase_amount: 150000,
    })
  })

  it('단건 조회는 id 경로로 호출한다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    await getCustomerById('c1')
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/c1')
  })

  it('gender가 null이면 null로 매핑한다', async () => {
    mockApiFetch.mockResolvedValue({ ...kCustomer, gender: null, note: null, firstPurchaseDate: null })
    const res = await getCustomerById('c1')
    expect(res.gender).toBeNull()
    expect(res.note).toBeUndefined()
    expect(res.first_purchase_date).toBeUndefined()
  })
})

describe('createCustomer', () => {
  it('유효한 입력은 POST 후 매핑된 고객을 반환하고 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    const res = await createCustomer(form({ name: '홍길동', phone: '010-1234-5678', grade: 'regular', gender: 'male' }))
    expect(mockApiFetch).toHaveBeenCalledWith('/customers', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toMatchObject({ name: '홍길동', phone: '010-1234-5678', grade: 'regular', gender: 'male' })
    expect(res.id).toBe('c1')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/customers')
  })

  it('이름 누락은 VALIDATION 에러로 거부한다', async () => {
    await expect(createCustomer(form({ phone: '010-1234-5678' }))).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('gender가 male/female가 아니면 null로 보낸다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    await createCustomer(form({ name: '김', phone: '010-1234-5678', gender: 'unknown' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.gender).toBeNull()
  })

  it('grade 미지정 시 new로 기본값 처리한다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    await createCustomer(form({ name: '김', phone: '010-1234-5678' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.grade).toBe('new')
  })
})

describe('updateCustomer', () => {
  it('잘못된 id는 거부한다', async () => {
    await expect(updateCustomer('abc', form({ name: '김' }))).rejects.toThrow('올바르지 않은 ID')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('제공된 필드를 PATCH하고 두 경로를 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    await updateCustomer('5', form({ name: '새이름' }))
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/5', expect.objectContaining({ method: 'PATCH' }))
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/customers')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/customers/5')
  })
})

describe('updateCustomerGrade', () => {
  it('id/grade를 검증 후 PATCH한다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    await updateCustomerGrade('5', 'vip')
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/5/grade', expect.objectContaining({ method: 'PATCH' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.grade).toBe('vip')
  })

  it('잘못된 grade는 거부한다', async () => {
    await expect(updateCustomerGrade('5', 'bad' as never)).rejects.toThrow('올바르지 않은 등급')
  })
})

describe('deleteCustomer', () => {
  it('id 검증 후 DELETE하고 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteCustomer('7')
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/7', { method: 'DELETE' })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/customers')
  })

  it('잘못된 id는 거부한다', async () => {
    await expect(deleteCustomer('xx')).rejects.toThrow('올바르지 않은 ID')
  })
})

describe('findOrCreateCustomer', () => {
  it('find-or-create로 POST한다', async () => {
    mockApiFetch.mockResolvedValue(kCustomer)
    const res = await findOrCreateCustomer('홍길동', '010-1234-5678')
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/find-or-create', expect.objectContaining({ method: 'POST' }))
    expect(res.id).toBe('c1')
  })
})

describe('getCustomerSales', () => {
  const kSale = {
    id: 's1', date: '2026-01-01', productName: '꽃다발', productCategory: null,
    amount: 50000, paymentMethod: 'card', reservationChannel: 'phone',
    customerName: '홍', customerPhone: null, customerId: 'c1', note: null,
    isUnpaid: false, hasReview: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  }

  it('페이지네이션 파라미터로 조회하고 매핑한다', async () => {
    mockApiFetch.mockResolvedValue({ sales: [kSale], hasMore: true })
    const res = await getCustomerSales('c1', 2, 20)
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/c1/sales?page=2&size=20')
    expect(res.hasMore).toBe(true)
    // productCategory가 null이면 productName으로 대체
    expect(res.sales[0].product_category).toBe('꽃다발')
  })

  it('기본 페이지는 0, 사이즈 10', async () => {
    mockApiFetch.mockResolvedValue({ sales: [], hasMore: false })
    await getCustomerSales('c1')
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/c1/sales?page=0&size=10')
  })
})

describe('searchCustomersByName', () => {
  it('빈 쿼리는 빈 배열을 반환하고 인증/호출하지 않는다', async () => {
    expect(await searchCustomersByName('')).toEqual([])
    expect(mockRequireAuth).not.toHaveBeenCalled()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('쿼리로 검색해 결과를 매핑한다', async () => {
    mockApiFetch.mockResolvedValue([{ id: 'c1', name: '홍길동', phone: '010', grade: 'vip' }])
    const res = await searchCustomersByName('홍')
    expect(mockApiFetch).toHaveBeenCalledWith('/customers/search?q=%ED%99%8D')
    expect(res[0]).toEqual({ id: 'c1', name: '홍길동', phone: '010', grade: 'vip' })
  })
})

describe('checkPhoneDuplicate', () => {
  it('10자리 미만은 null', async () => {
    expect(await checkPhoneDuplicate('123')).toBeNull()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('중복 없음(undefined)은 null', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await checkPhoneDuplicate('010-1234-5678')).toBeNull()
  })

  it('중복이 있으면 객체를 반환하고 excludeId를 쿼리에 포함한다', async () => {
    mockApiFetch.mockResolvedValue({ id: 'c1', name: '홍', phone: '010-1234-5678', grade: 'new' })
    const res = await checkPhoneDuplicate('010-1234-5678', 'c9')
    expect(res).toEqual({ id: 'c1', name: '홍', phone: '010-1234-5678' })
    const calledUrl = mockApiFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('excludeId=c9')
  })
})
