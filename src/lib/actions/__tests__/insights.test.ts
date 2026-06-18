import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getTrendArticles,
  loadMoreTrendArticles,
  getRecentTrendsByCategory,
  getTrendCountsByCategory,
  getUserPreferences,
  updateBottomNavItems,
} from '../insights'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kArticle = {
  id: 'a1', category: 'flower', title: '제목', summary: '요약', keyPoints: ['p'],
  sourceUrl: 'https://x', sourceName: null, publishedAt: null, collectedAt: '2026-01-01', createdAt: '2026-01-01',
}

describe('getTrendArticles', () => {
  it('기본 limit/offset으로 조회', async () => {
    mockApiFetch.mockResolvedValue([kArticle])
    const res = await getTrendArticles()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/trends?limit=50&offset=0')
    expect(res[0]).toMatchObject({ id: 'a1', key_points: ['p'], source_url: 'https://x' })
  })

  it('category/limit/offset 옵션 반영', async () => {
    mockApiFetch.mockResolvedValue(null)
    await getTrendArticles({ category: 'business', limit: 10, offset: 20 })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/trends?category=business&limit=10&offset=20')
  })
})

describe('loadMoreTrendArticles', () => {
  it('offset과 category를 쿼리에 반영한다', async () => {
    mockApiFetch.mockResolvedValue([])
    await loadMoreTrendArticles(50, { category: 'flower', limit: 50 })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/trends?category=flower&limit=50&offset=50')
  })
})

describe('getRecentTrendsByCategory', () => {
  it('4개 카테고리를 모두 채운다', async () => {
    mockApiFetch.mockResolvedValue({ flower: [kArticle], business: [] })
    const res = await getRecentTrendsByCategory(3)
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/trends/recent?perCategory=3')
    expect(res.flower).toHaveLength(1)
    expect(res.inspiration).toEqual([])
    expect(res.industry).toEqual([])
  })
})

describe('getTrendCountsByCategory', () => {
  it('since 옵션과 카테고리 기본 0', async () => {
    mockApiFetch.mockResolvedValue({ flower: 5 })
    const res = await getTrendCountsByCategory('2026-01-01')
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/trends/counts?since=2026-01-01')
    expect(res).toEqual({ flower: 5, inspiration: 0, business: 0, industry: 0 })
  })
})

describe('user preferences', () => {
  it('getUserPreferences: bottomNavItems를 반영', async () => {
    mockApiFetch.mockResolvedValue({ bottomNavItems: ['dashboard', 'sales', 'calendar', 'customers'] })
    const res = await getUserPreferences()
    expect(res.bottom_nav_items).toEqual(['dashboard', 'sales', 'calendar', 'customers'])
  })

  it('updateBottomNavItems: 유효 항목은 PUT', async () => {
    mockApiFetch.mockResolvedValue({ bottomNavItems: ['dashboard', 'sales', 'calendar', 'customers'] })
    await updateBottomNavItems(['dashboard', 'sales', 'calendar', 'customers'])
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/preferences/bottom-nav', expect.objectContaining({ method: 'PUT' }))
  })

  it('updateBottomNavItems: 4개 미만은 거부', async () => {
    await expect(updateBottomNavItems(['dashboard', 'sales'])).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
