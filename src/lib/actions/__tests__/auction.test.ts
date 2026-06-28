import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getAuctionCategories,
  getAuctionDates,
  getAuctionSummary,
  getAuctionPrices,
} from '../auction'
import { AUCTION_CATEGORIES, AUCTION_SOURCE } from '@/types/auction'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kSummaryItem = {
  pumName: '장미', repAvg: 8044, repChangeRate: 0.12, variantCount: 383,
}

const kPrice = {
  flowerGubn: '절화', pumName: '거베라', goodName: '미니(혼합)', lvNm: '특2',
  avgAmt: 3243, maxAmt: 4300, minAmt: 1050, totQty: 3952, totAmt: 12816580,
  prevAvgAmt: 3100, changeRate: 0.046,
}

describe('getAuctionCategories', () => {
  it('BFF가 카테고리를 주면 그대로 반환', async () => {
    mockApiFetch.mockResolvedValue([{ code: '1', label: '절화' }])
    const res = await getAuctionCategories()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/categories')
    expect(res).toEqual([{ code: '1', label: '절화' }])
  })

  it('BFF 실패/빈 응답 시 정적 폴백을 반환', async () => {
    mockApiFetch.mockRejectedValue(new Error('boom'))
    const res = await getAuctionCategories()
    expect(res).toEqual([...AUCTION_CATEGORIES])
  })
})

describe('getAuctionDates', () => {
  it('옵션 없이 보유 일자 목록 조회', async () => {
    mockApiFetch.mockResolvedValue(['2026-06-18', '2026-06-17'])
    const res = await getAuctionDates()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/dates')
    expect(res).toEqual(['2026-06-18', '2026-06-17'])
  })

  it('gubn 을 쿼리에 반영', async () => {
    mockApiFetch.mockResolvedValue([])
    await getAuctionDates('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/dates?gubn=1')
  })

  it('null 응답 방어', async () => {
    mockApiFetch.mockResolvedValue(null)
    const res = await getAuctionDates()
    expect(res).toEqual([])
  })
})

describe('getAuctionSummary', () => {
  it('옵션 없이 품목 요약 조회 + camelCase→snake 매핑', async () => {
    mockApiFetch.mockResolvedValue({ date: '2026-06-17', source: AUCTION_SOURCE, items: [kSummaryItem] })
    const res = await getAuctionSummary()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/summary')
    expect(res.date).toBe('2026-06-17')
    expect(res.source).toBe(AUCTION_SOURCE)
    expect(res.items[0]).toEqual({
      pum_name: '장미', rep_avg: 8044, rep_change_rate: 0.12, variant_count: 383,
    })
  })

  it('gubn/date 옵션을 쿼리에 반영', async () => {
    mockApiFetch.mockResolvedValue({ date: '2026-06-17', source: AUCTION_SOURCE, items: [] })
    await getAuctionSummary({ date: '2026-06-17', gubn: '1' })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/summary?date=2026-06-17&gubn=1')
  })

  it('repChangeRate null 유지', async () => {
    mockApiFetch.mockResolvedValue({
      date: '2026-06-17', source: AUCTION_SOURCE,
      items: [{ pumName: '백합', repAvg: 6661, repChangeRate: null, variantCount: 25 }],
    })
    const res = await getAuctionSummary()
    expect(res.items[0].rep_change_rate).toBeNull()
  })

  it('데이터 없을 때 빈 결과 + source 폴백', async () => {
    mockApiFetch.mockResolvedValue({ date: null, source: null, items: [] })
    const res = await getAuctionSummary()
    expect(res).toEqual({ date: null, source: AUCTION_SOURCE, items: [] })
  })

  it('null 응답 방어', async () => {
    mockApiFetch.mockResolvedValue(null)
    const res = await getAuctionSummary()
    expect(res).toEqual({ date: null, source: AUCTION_SOURCE, items: [] })
  })
})

describe('getAuctionPrices (드릴다운)', () => {
  it('item 필수 + gubn/date 옵션을 쿼리에 반영', async () => {
    mockApiFetch.mockResolvedValue({ date: '2026-06-17', source: AUCTION_SOURCE, prices: [kPrice] })
    const res = await getAuctionPrices({ date: '2026-06-17', gubn: '1', item: '거베라' })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/prices?date=2026-06-17&gubn=1&item=%EA%B1%B0%EB%B2%A0%EB%9D%BC')
    expect(res.prices[0]).toMatchObject({
      flower_gubn: '절화', pum_name: '거베라', good_name: '미니(혼합)', lv_nm: '특2',
      avg_amt: 3243, change_rate: 0.046,
    })
  })

  it('item 만 있어도 조회', async () => {
    mockApiFetch.mockResolvedValue({ date: '2026-06-17', source: AUCTION_SOURCE, prices: [] })
    await getAuctionPrices({ item: '장미' })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/auction/prices?item=%EC%9E%A5%EB%AF%B8')
  })

  it('null 응답 방어', async () => {
    mockApiFetch.mockResolvedValue(null)
    const res = await getAuctionPrices({ item: '장미' })
    expect(res).toEqual({ date: null, source: AUCTION_SOURCE, prices: [] })
  })
})
