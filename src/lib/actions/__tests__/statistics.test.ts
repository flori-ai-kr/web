import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getCategoryStats,
  getPaymentMethodStats,
  getChannelStats,
  getCustomerStats,
  getExpenseCategoryStats,
} from '../statistics'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const payload = {
  categoryStats: [{ name: '장미', count: 2, amount: 100, percentage: 50 }],
  paymentStats: [{ method: 'card', label: '카드', count: 2, amount: 100, percentage: 50 }],
  channelStats: [{ channel: 'phone', label: '전화', count: 1, amount: 50, percentage: 25 }],
  customerStats: { totalCustomers: 10, returningCustomers: 4, newCustomers: 6 },
  expenseStats: [{ category: 'rent', label: '임대료', amount: 300, percentage: 60 }],
}

describe('statistics actions', () => {
  it('getCategoryStats: month 쿼리 + 매핑', async () => {
    mockApiFetch.mockResolvedValue(payload)
    const res = await getCategoryStats('2026-01')
    expect(mockApiFetch).toHaveBeenCalledWith('/dashboard/month?month=2026-01')
    expect(res[0]).toEqual({ name: '장미', count: 2, amount: 100, percentage: 50 })
  })

  it('getPaymentMethodStats', async () => {
    mockApiFetch.mockResolvedValue(payload)
    expect((await getPaymentMethodStats())[0].method).toBe('card')
    expect(mockApiFetch).toHaveBeenCalledWith('/dashboard/month?')
  })

  it('getChannelStats', async () => {
    mockApiFetch.mockResolvedValue(payload)
    expect((await getChannelStats())[0].channel).toBe('phone')
  })

  it('getCustomerStats', async () => {
    mockApiFetch.mockResolvedValue(payload)
    expect(await getCustomerStats()).toEqual({ totalCustomers: 10, returningCustomers: 4, newCustomers: 6 })
  })

  it('getExpenseCategoryStats', async () => {
    mockApiFetch.mockResolvedValue(payload)
    expect((await getExpenseCategoryStats())[0].category).toBe('rent')
  })
})
