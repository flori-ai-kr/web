import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  toggleScrap,
  updateScrapMemo,
  getScrapMap,
  getTrendScraps,
  getPostScraps,
  getScrapCounts,
} from '../scraps'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'user-1', name: 'T', email: 't@e.com' })
})

const kScrap = {
  id: 's1',
  targetType: 'trend' as const,
  targetId: '12',
  memo: '메모',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-02',
}

const kArticle = {
  id: 'a1',
  category: 'flower' as const,
  title: '제목',
  summary: '요약',
  keyPoints: ['p1'],
  sourceUrl: 'https://x.com',
  sourceName: '출처',
  publishedAt: '2026-01-01',
  collectedAt: '2026-01-01',
  createdAt: '2026-01-01',
}

const kAccount = {
  id: 'acc1',
  username: 'flori',
  displayName: '플로리',
  profileUrl: 'https://insta/flori',
  region: 'domestic' as const,
  sortOrder: 1,
  active: true,
  notes: null,
}

const kPost = {
  id: 'p1',
  accountId: 'acc1',
  shortcode: 'sc',
  permalink: 'https://insta/p/sc',
  imageUrls: ['https://img/1.jpg'],
  caption: '캡션',
  likeCount: 10,
  postedAt: '2026-01-01',
  account: kAccount,
}

describe('toggleScrap', () => {
  it('올바른 엔드포인트로 POST하고 insights를 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue({ scraped: true })
    const res = await toggleScrap({ target_type: 'trend', target_id: '12' })
    expect(res).toEqual({ scraped: true })
    expect(mockRequireAuth).toHaveBeenCalled()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/toggle', {
      method: 'POST',
      body: JSON.stringify({ targetType: 'trend', targetId: '12' }),
    })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/insights', 'layout')
  })

  it('잘못된 target_type은 거부하고 apiFetch를 호출하지 않는다', async () => {
    await expect(toggleScrap({ target_type: 'bad', target_id: '12' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateScrapMemo', () => {
  it('메모를 PUT하고 매핑된 스크랩을 반환한다', async () => {
    mockApiFetch.mockResolvedValue(kScrap)
    const res = await updateScrapMemo({ target_type: 'trend', target_id: '12', memo: '메모' })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/memo', {
      method: 'PUT',
      body: JSON.stringify({ targetType: 'trend', targetId: '12', memo: '메모' }),
    })
    expect(res).toMatchObject({ id: 's1', target_type: 'trend', target_id: '12', memo: '메모' })
  })

  it('공백만 있는 메모는 null로 정규화한다', async () => {
    mockApiFetch.mockResolvedValue({ ...kScrap, memo: null })
    await updateScrapMemo({ target_type: 'trend', target_id: '12', memo: '   ' })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.memo).toBeNull()
  })
})

describe('getScrapMap', () => {
  it('targetType 쿼리로 조회하고 id/memo 맵으로 변환한다', async () => {
    mockApiFetch.mockResolvedValue({ '12': { id: 's1', memo: '메모' }, '13': { id: 's2', memo: null } })
    const map = await getScrapMap('trend')
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/map?targetType=trend')
    expect(map).toEqual({ '12': { id: 's1', memo: '메모' }, '13': { id: 's2', memo: null } })
  })

  it('빈/undefined 응답은 빈 맵을 반환한다', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await getScrapMap('post')).toEqual({})
  })
})

describe('getTrendScraps', () => {
  it('limit 쿼리로 조회하고 scrap/article을 매핑한다', async () => {
    mockApiFetch.mockResolvedValue([{ scrap: kScrap, article: kArticle }])
    const res = await getTrendScraps(50)
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/trends?limit=50')
    expect(res[0].article).toMatchObject({ id: 'a1', key_points: ['p1'], source_url: 'https://x.com' })
    expect(res[0].scrap).toMatchObject({ id: 's1' })
  })

  it('기본 limit은 100이고 빈 응답은 빈 배열', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await getTrendScraps()).toEqual([])
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/trends?limit=100')
  })
})

describe('getPostScraps', () => {
  it('scrap/post를 매핑하고 account를 포함한다', async () => {
    mockApiFetch.mockResolvedValue([{ scrap: kScrap, post: kPost }])
    const res = await getPostScraps()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/posts?limit=100')
    expect(res[0].post).toMatchObject({ id: 'p1', image_urls: ['https://img/1.jpg'], like_count: 10 })
    expect(res[0].post.account).toMatchObject({ username: 'flori', display_name: '플로리' })
  })

  it('account가 null이면 빈 account 객체로 매핑한다', async () => {
    mockApiFetch.mockResolvedValue([{ scrap: kScrap, post: { ...kPost, account: null } }])
    const res = await getPostScraps()
    expect(res[0].post.account).toEqual({})
  })
})

describe('getScrapCounts', () => {
  it('trend/post 카운트를 반환한다', async () => {
    mockApiFetch.mockResolvedValue({ trend: 3, post: 5 })
    expect(await getScrapCounts()).toEqual({ trend: 3, post: 5 })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/counts')
  })

  it('누락된 카운트는 0으로 보정한다', async () => {
    mockApiFetch.mockResolvedValue({})
    expect(await getScrapCounts()).toEqual({ trend: 0, post: 0 })
  })
})
