import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import { AppError, ErrorCode } from '@/lib/errors'
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSuggestions,
} from '../expenses'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kExpense = {
  id: 'e1', date: '2026-01-01', itemName: '포장지', categoryId: 7, categoryLabel: '소모품',
  unitPrice: 1000, quantity: 5, totalAmount: 5000, paymentMethodId: 3, paymentMethodLabel: '카드',
  cardCompany: '신한', vendor: '도매상', note: null, recurringId: null,
  isRecurringModified: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const expenseForm = (over: Record<string, string> = {}) => {
  const fd = new FormData()
  fd.set('date', '2026-01-01')
  fd.set('item_name', '포장지')
  fd.set('category_id', '7')
  fd.set('unit_price', '1000')
  fd.set('quantity', '5')
  fd.set('payment_method_id', '3')
  for (const [k, v] of Object.entries(over)) fd.set(k, v)
  return fd
}

describe('getExpenses', () => {
  it('month 없이 조회', async () => {
    mockApiFetch.mockResolvedValue({ expenses: [kExpense], hasMore: false })
    const res = await getExpenses()
    expect(mockApiFetch).toHaveBeenCalledWith('/expenses?offset=0&limit=100')
    expect(res.expenses[0]).toMatchObject({ id: 'e1', item_name: '포장지', total_amount: 5000, card_company: '신한' })
    expect(res.hasMore).toBe(false)
  })

  it('month가 있으면 쿼리로 전달', async () => {
    mockApiFetch.mockResolvedValue({ expenses: [], hasMore: false })
    await getExpenses('2026-01')
    expect(mockApiFetch).toHaveBeenCalledWith('/expenses?offset=0&limit=100&month=2026-01')
  })
})

describe('getExpenseById', () => {
  it('정상 조회', async () => {
    mockApiFetch.mockResolvedValue(kExpense)
    const res = await getExpenseById('e1')
    expect(res?.id).toBe('e1')
  })

  it('NOT_FOUND는 null을 반환한다', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.NOT_FOUND, '없음'))
    expect(await getExpenseById('e1')).toBeNull()
  })

  it('다른 에러는 전파한다', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.UNAUTHORIZED, '권한'))
    await expect(getExpenseById('e1')).rejects.toBeInstanceOf(AppError)
  })
})

describe('createExpense', () => {
  it('유효 입력은 camelCase로 POST하고 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(kExpense)
    await createExpense(expenseForm())
    const [url, init] = mockApiFetch.mock.calls[0]
    expect(url).toBe('/expenses')
    const body = JSON.parse(init!.body as string)
    expect(body).toMatchObject({ itemName: '포장지', unitPrice: 1000, quantity: 5, paymentMethodId: 3 })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/expenses')
  })

  it('잘못된 unit_price 문자열은 0으로 보정되어 검증 통과한다', async () => {
    mockApiFetch.mockResolvedValue(kExpense)
    await createExpense(expenseForm({ unit_price: 'abc' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.unitPrice).toBe(0)
  })

  it('필수값 누락(item_name)은 거부한다', async () => {
    await expect(createExpense(expenseForm({ item_name: '' }))).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateExpense', () => {
  it('PATCH 후 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(kExpense)
    await updateExpense('e1', expenseForm())
    expect(mockApiFetch).toHaveBeenCalledWith('/expenses/e1', expect.objectContaining({ method: 'PATCH' }))
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/expenses')
  })

  it('검증 실패 시 호출하지 않는다', async () => {
    await expect(updateExpense('e1', expenseForm({ payment_method_id: 'invalid' }))).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('deleteExpense', () => {
  it('DELETE 후 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteExpense('e1')
    expect(mockApiFetch).toHaveBeenCalledWith('/expenses/e1', { method: 'DELETE' })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/expenses')
  })
})

describe('getExpenseSuggestions', () => {
  it('자동완성 후보를 그대로 반환한다', async () => {
    const payload = { itemNames: ['포장지'], vendors: ['도매상'], notes: [] }
    mockApiFetch.mockResolvedValue(payload)
    expect(await getExpenseSuggestions()).toEqual(payload)
    expect(mockApiFetch).toHaveBeenCalledWith('/expenses/suggestions')
  })
})
