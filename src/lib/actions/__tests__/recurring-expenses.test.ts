import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import type { RecurringExpense } from '@/types/database'
import {
  nextOccurrenceISO,
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpenseActive,
  quickAddFromRecurring,
  updateExpenseInstanceOnly,
  updateRecurringFromInstance,
  deleteExpenseInstanceOnly,
  deleteRecurringFromInstance,
} from '../recurring-expenses'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const rule = (over: Partial<RecurringExpense>): RecurringExpense =>
  ({
    id: 'r1', user_id: '', item_name: '정기', category_id: '5', category_label: '꽃', unit_price: 1000,
    quantity: 1, payment_method: 'card', vendor: null, memo: null,
    frequency: 'weekly', interval_count: 1, days_of_week: [], days_of_month: [],
    yearly_dates: [], start_date: '2026-01-01', end_date: null, is_active: true,
    created_at: '', updated_at: '', ...over,
  } as RecurringExpense)

describe('nextOccurrenceISO — 주간', () => {
  it('해당 요일이면 그 날을 반환', async () => {
    // 2026-01-05는 월요일
    const r = rule({ frequency: 'weekly', days_of_week: [1], start_date: '2026-01-05' })
    expect(await nextOccurrenceISO(r, '2026-01-05')).toBe('2026-01-05')
  })

  it('다음 해당 요일을 찾는다', async () => {
    const r = rule({ frequency: 'weekly', days_of_week: [1], start_date: '2026-01-05' })
    expect(await nextOccurrenceISO(r, '2026-01-06')).toBe('2026-01-12')
  })

  it('요일 미선택이면 null', async () => {
    const r = rule({ frequency: 'weekly', days_of_week: [], start_date: '2026-01-05' })
    expect(await nextOccurrenceISO(r, '2026-01-05')).toBeNull()
  })

  it('종료일을 넘으면 null', async () => {
    const r = rule({ frequency: 'weekly', days_of_week: [1], start_date: '2026-01-05', end_date: '2026-01-06' })
    expect(await nextOccurrenceISO(r, '2026-01-07')).toBeNull()
  })
})

describe('nextOccurrenceISO — 월간', () => {
  it('해당 월의 지정일을 반환', async () => {
    const r = rule({ frequency: 'monthly', days_of_month: [15], start_date: '2026-01-01' })
    expect(await nextOccurrenceISO(r, '2026-01-10')).toBe('2026-01-15')
  })

  it('말일 초과 지정일은 그 달 말일로 보정(2월 31→28)', async () => {
    const r = rule({ frequency: 'monthly', days_of_month: [31], start_date: '2026-01-31' })
    expect(await nextOccurrenceISO(r, '2026-02-01')).toBe('2026-02-28')
  })

  it('날짜 미선택이면 null', async () => {
    const r = rule({ frequency: 'monthly', days_of_month: [], start_date: '2026-01-01' })
    expect(await nextOccurrenceISO(r, '2026-01-01')).toBeNull()
  })
})

describe('nextOccurrenceISO — 연간', () => {
  it('지정 월일을 반환', async () => {
    const r = rule({ frequency: 'yearly', yearly_dates: [{ m: 5, d: 1 }], start_date: '2026-01-01' })
    expect(await nextOccurrenceISO(r, '2026-01-01')).toBe('2026-05-01')
  })

  it('일자 미선택이면 null', async () => {
    const r = rule({ frequency: 'yearly', yearly_dates: [], start_date: '2026-01-01' })
    expect(await nextOccurrenceISO(r, '2026-01-01')).toBeNull()
  })
})

const kRecurring = {
  id: 'r1', itemName: '정기', categoryId: 5, categoryLabel: '꽃', unitPrice: 1000, quantity: 1,
  paymentMethod: 'card', vendor: null, memo: null, frequency: 'weekly',
  intervalCount: 1, daysOfWeek: [1], daysOfMonth: [], yearlyDates: [],
  startDate: '2026-01-01', endDate: null, isActive: true,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const validInput = {
  item_name: '정기', category_id: '5', unit_price: 1000, quantity: 1,
  payment_method_id: '3', vendor: null, memo: null,
  frequency: 'weekly' as const, interval_count: 1, days_of_week: [1],
  days_of_month: [], yearly_dates: [], start_date: '2026-01-01',
  end_date: null, is_active: true,
}

const body = (call = 0) => JSON.parse(mockApiFetch.mock.calls[call][1]!.body as string)

describe('getRecurringExpenses', () => {
  it('매핑해서 반환', async () => {
    mockApiFetch.mockResolvedValue([kRecurring])
    const res = await getRecurringExpenses()
    expect(res[0]).toMatchObject({ id: 'r1', item_name: '정기', interval_count: 1, days_of_week: [1] })
  })
})

describe('createRecurringExpense', () => {
  it('camelCase로 POST하고 두 경로 revalidate', async () => {
    mockApiFetch.mockResolvedValue(kRecurring)
    await createRecurringExpense(validInput)
    expect(body()).toMatchObject({ itemName: '정기', frequency: 'weekly', daysOfWeek: [1], startDate: '2026-01-01' })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/expenses')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/settings')
  })

  it('주간인데 요일 미선택이면 거부', async () => {
    await expect(createRecurringExpense({ ...validInput, days_of_week: [] })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateRecurringExpense', () => {
  it('PUT', async () => {
    mockApiFetch.mockResolvedValue(kRecurring)
    await updateRecurringExpense('1', validInput)
    expect(mockApiFetch).toHaveBeenCalledWith('/recurring-expenses/1', expect.objectContaining({ method: 'PUT' }))
  })

  it('잘못된 id 거부', async () => {
    await expect(updateRecurringExpense('x', validInput)).rejects.toThrow('ID가 올바르지')
  })
})

describe('delete/toggle/quickAdd', () => {
  it('deleteRecurringExpense DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteRecurringExpense('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/recurring-expenses/1', { method: 'DELETE' })
  })

  it('toggle은 isActive POST', async () => {
    mockApiFetch.mockResolvedValue(kRecurring)
    await toggleRecurringExpenseActive('1', false)
    expect(mockApiFetch).toHaveBeenCalledWith('/recurring-expenses/1/toggle', expect.objectContaining({ method: 'POST' }))
    expect(body()).toEqual({ isActive: false })
  })

  it('quickAdd POST', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await quickAddFromRecurring('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/recurring-expenses/1/quick-add', { method: 'POST' })
  })

  it('잘못된 id 거부', async () => {
    await expect(deleteRecurringExpense('x')).rejects.toThrow('ID가 올바르지')
    await expect(toggleRecurringExpenseActive('x', true)).rejects.toThrow('ID가 올바르지')
    await expect(quickAddFromRecurring('x')).rejects.toThrow('ID가 올바르지')
  })
})

describe('인스턴스 scope 분기 (이것만/이후 모두)', () => {
  it('updateExpenseInstanceOnly: scope=this PATCH, 제공 필드만', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await updateExpenseInstanceOnly('1', { date: '2026-02-01', unit_price: 2000 })
    expect(mockApiFetch.mock.calls[0][0]).toBe('/recurring-expenses/instances/1?scope=this')
    expect(body()).toEqual({ date: '2026-02-01', unitPrice: 2000 })
  })

  it('updateRecurringFromInstance: scope=all PATCH', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await updateRecurringFromInstance('1', { item_name: '변경' })
    expect(mockApiFetch.mock.calls[0][0]).toBe('/recurring-expenses/instances/1?scope=all')
    expect(body()).toEqual({ itemName: '변경' })
  })

  it('deleteExpenseInstanceOnly: scope=this DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteExpenseInstanceOnly('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/recurring-expenses/instances/1?scope=this', { method: 'DELETE' })
  })

  it('deleteRecurringFromInstance: scope=all DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteRecurringFromInstance('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/recurring-expenses/instances/1?scope=all', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(updateExpenseInstanceOnly('x', { date: '2026-01-01' })).rejects.toThrow('ID가 올바르지')
    await expect(deleteRecurringFromInstance('x')).rejects.toThrow('ID가 올바르지')
  })
})
