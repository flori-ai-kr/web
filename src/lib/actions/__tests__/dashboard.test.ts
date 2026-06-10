import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getTodaySummary,
  getRecentSales,
  getMonthSummary,
  getDashboardTodayData,
  getDashboardMonthData,
} from '../dashboard'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const summary = {
  totalAmount: 100, cardAmount: 60, cashAmount: 20, transferAmount: 10,
  naverpayAmount: 5, kakaopayAmount: 5, pendingCount: 1, pendingAmount: 30,
}

const kSale = (id: string) => ({
  id, date: '2026-01-01', categoryId: 1, categoryLabel: '꽃', amount: 50,
  paymentMethod: 'card', channelId: 1, channelLabel: '전화',
  customerName: null, customerPhone: null,
  customerId: null, memo: null, isUnpaid: false, hasReview: false, photos: null,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
})

const kRes = (id: string, date: string, time: string | null) => ({
  id, date, time, customerName: '홍', customerPhone: null, title: '픽업',
  description: null, status: 'pending', saleId: null, amount: 0, reminderAt: null,
  reminderSent: false, pickupCompleted: false, createdAt: '', updatedAt: '',
})

const todayPayload = {
  summary,
  upcomingReservations: [kRes('r2', '2026-01-02', '10:00'), kRes('r1', '2026-01-01', '14:00')],
  triggeredReminders: [kRes('r1', '2026-01-01', '14:00')], // r1 중복
  recentSales: [kSale('s1'), kSale('s2')],
  saleCategories: [{ value: 'rose', label: '장미' }],
}

describe('getTodaySummary / getMonthSummary', () => {
  it('today summary를 매핑(pending 필드는 제외)', async () => {
    mockApiFetch.mockResolvedValue(todayPayload)
    const res = await getTodaySummary()
    expect(mockApiFetch).toHaveBeenCalledWith('/dashboard/today')
    expect(res).toEqual({
      totalAmount: 100, cardAmount: 60, cashAmount: 20,
      transferAmount: 10, naverpayAmount: 5, kakaopayAmount: 5,
    })
  })

  it('month summary는 month 쿼리로 조회', async () => {
    mockApiFetch.mockResolvedValue({ summary, expenseTotal: 0, categoryStats: [], paymentStats: [], channelStats: [], customerStats: { totalCustomers: 0, returningCustomers: 0, newCustomers: 0 }, expenseStats: [] })
    await getMonthSummary('2026-01')
    expect(mockApiFetch).toHaveBeenCalledWith('/dashboard/month?month=2026-01')
  })
})

describe('getRecentSales', () => {
  it('limit으로 잘라 매핑하고 productCategory null은 productName으로 대체', async () => {
    mockApiFetch.mockResolvedValue(todayPayload)
    const res = await getRecentSales(1)
    expect(res).toHaveLength(1)
    expect(res[0].category_label).toBe('꽃')
  })
})

describe('getDashboardTodayData', () => {
  it('예약을 id로 dedup하고 날짜+시간 오름차순 정렬한다', async () => {
    mockApiFetch.mockResolvedValue(todayPayload)
    const res = await getDashboardTodayData()
    expect(res.reservations.map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(res.recentSales).toHaveLength(2)
    expect(res.saleCategories).toEqual([{ value: 'rose', label: '장미' }])
  })
})

describe('getDashboardMonthData', () => {
  it('모든 통계 매퍼를 적용한다', async () => {
    mockApiFetch.mockResolvedValue({
      summary,
      expenseTotal: 500,
      categoryStats: [{ categoryId: 5, label: '장미', count: 2, amount: 100, percentage: 50 }],
      paymentStats: [{ paymentMethodId: 3, label: '카드', count: 2, amount: 100, percentage: 50 }],
      channelStats: [{ channelId: 1, label: '전화', count: 1, amount: 50, percentage: 25 }],
      customerStats: { totalCustomers: 10, returningCustomers: 4, newCustomers: 6 },
      expenseStats: [{ categoryId: 9, label: '임대료', amount: 300, percentage: 60 }],
    })
    const res = await getDashboardMonthData('2026-01')
    expect(res.expenseTotal).toBe(500)
    expect(res.categoryStats[0]).toMatchObject({ label: '장미', percentage: 50 })
    expect(res.paymentStats[0].paymentMethodId).toBe('3')
    expect(res.channelStats[0].channelId).toBe('1')
    expect(res.customerStats).toEqual({ totalCustomers: 10, returningCustomers: 4, newCustomers: 6 })
    expect(res.expenseStats[0].categoryId).toBe('9')
  })

  it('month 없이도 조회 가능', async () => {
    mockApiFetch.mockResolvedValue({ summary, expenseTotal: 0, categoryStats: [], paymentStats: [], channelStats: [], customerStats: { totalCustomers: 0, returningCustomers: 0, newCustomers: 0 }, expenseStats: [] })
    await getDashboardMonthData()
    expect(mockApiFetch).toHaveBeenCalledWith('/dashboard/month?')
  })
})
