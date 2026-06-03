import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn(), apiFetchInternal: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch, apiFetchInternal } from '@/lib/api/client'
import {
  getTrendArticles,
  getRecentTrendsByCategory,
  getTrendCountsByCategory,
  getInstagramAccounts,
  createInstagramAccount,
  updateInstagramAccount,
  deleteInstagramAccount,
  getInstagramPosts,
  getLatestInstagramTimestamp,
  getUserPreferences,
  updateBottomNavItems,
} from '../insights'

const mockApiFetch = vi.mocked(apiFetch)
const mockInternal = vi.mocked(apiFetchInternal)
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
const kAccount = {
  id: 'ac1', username: 'flori', displayName: null, profileUrl: 'https://insta/flori',
  region: 'domestic', sortOrder: 1, active: true, notes: null,
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

describe('getInstagramAccounts', () => {
  it('activeOnly 옵션 반영', async () => {
    mockApiFetch.mockResolvedValue([kAccount])
    await getInstagramAccounts({ activeOnly: true })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/accounts?activeOnly=true')
  })

  it('옵션 없으면 빈 쿼리', async () => {
    mockApiFetch.mockResolvedValue(null)
    expect(await getInstagramAccounts()).toEqual([])
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/accounts?')
  })
})

describe('createInstagramAccount', () => {
  it('내부 API로 POST하고 기본값을 채운다', async () => {
    mockInternal.mockResolvedValue(kAccount)
    await createInstagramAccount({ username: 'flori', region: 'domestic' })
    expect(mockInternal).toHaveBeenCalledWith('/internal/instagram-accounts', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse(mockInternal.mock.calls[0][1]!.body as string)
    expect(body).toMatchObject({ username: 'flori', region: 'domestic', sortOrder: 0, active: true })
  })

  it('잘못된 username은 거부', async () => {
    await expect(createInstagramAccount({ username: 'bad user!', region: 'domestic' })).rejects.toThrow()
    expect(mockInternal).not.toHaveBeenCalled()
  })
})

describe('updateInstagramAccount', () => {
  it('제공된 필드만 PUT 본문에 포함', async () => {
    mockInternal.mockResolvedValue(kAccount)
    await updateInstagramAccount('ac1', { active: false })
    expect(mockInternal).toHaveBeenCalledWith('/internal/instagram-accounts/ac1', expect.objectContaining({ method: 'PUT' }))
    expect(JSON.parse(mockInternal.mock.calls[0][1]!.body as string)).toEqual({ active: false })
  })
})

describe('deleteInstagramAccount', () => {
  it('내부 API로 DELETE', async () => {
    mockInternal.mockResolvedValue(undefined)
    await deleteInstagramAccount('ac1')
    expect(mockInternal).toHaveBeenCalledWith('/internal/instagram-accounts/ac1', { method: 'DELETE' })
  })
})

describe('getInstagramPosts', () => {
  it('모든 옵션을 쿼리에 반영', async () => {
    mockApiFetch.mockResolvedValue([])
    await getInstagramPosts({ accountId: 'ac1', region: 'international', sortBy: 'likes', daysAgo: 7, limit: 30 })
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toContain('accountId=ac1')
    expect(url).toContain('region=international')
    expect(url).toContain('sortBy=likes')
    expect(url).toContain('daysAgo=7')
    expect(url).toContain('limit=30')
  })
})

describe('getLatestInstagramTimestamp', () => {
  it('latest를 반환, 없으면 null', async () => {
    mockApiFetch.mockResolvedValue({ latest: '2026-01-01' })
    expect(await getLatestInstagramTimestamp()).toBe('2026-01-01')
    mockApiFetch.mockResolvedValue({ latest: null })
    expect(await getLatestInstagramTimestamp()).toBeNull()
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
