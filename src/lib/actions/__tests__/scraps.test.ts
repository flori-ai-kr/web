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
  getGrantScraps,
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
  targetType: 'grant' as const,
  targetId: '12',
  memo: '메모',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-02',
}

const kProgram = {
  id: '99',
  source: '소진공',
  title: '정책자금',
  agency: '소상공인시장진흥공단',
  category: 'fund' as const,
  target: '업력 무관',
  summary: '한도 7000만원',
  applyStart: '2026-01-01',
  applyEnd: '2026-01-10',
  sourceUrl: 'https://grant.example.com',
  dDay: 3,
  createdAt: '2026-01-01',
}

describe('toggleScrap', () => {
  it('올바른 엔드포인트로 POST하고 insights를 revalidate한다', async () => {
    mockApiFetch.mockResolvedValue({ scraped: true })
    const res = await toggleScrap({ target_type: 'grant', target_id: '12' })
    expect(res).toEqual({ scraped: true })
    expect(mockRequireAuth).toHaveBeenCalled()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/toggle', {
      method: 'POST',
      body: JSON.stringify({ targetType: 'grant', targetId: '12' }),
    })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/insights', 'layout')
  })

  it('잘못된 target_type은 거부하고 apiFetch를 호출하지 않는다', async () => {
    await expect(toggleScrap({ target_type: 'trend', target_id: '12' })).rejects.toThrow()
    await expect(toggleScrap({ target_type: 'post', target_id: '12' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateScrapMemo', () => {
  it('메모를 PUT하고 매핑된 스크랩을 반환한다', async () => {
    mockApiFetch.mockResolvedValue(kScrap)
    const res = await updateScrapMemo({ target_type: 'grant', target_id: '12', memo: '메모' })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/memo', {
      method: 'PUT',
      body: JSON.stringify({ targetType: 'grant', targetId: '12', memo: '메모' }),
    })
    expect(res).toMatchObject({ id: 's1', target_type: 'grant', target_id: '12', memo: '메모' })
  })

  it('공백만 있는 메모는 null로 정규화한다', async () => {
    mockApiFetch.mockResolvedValue({ ...kScrap, memo: null })
    await updateScrapMemo({ target_type: 'grant', target_id: '12', memo: '   ' })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.memo).toBeNull()
  })
})

describe('getScrapMap', () => {
  it('targetType 쿼리로 조회하고 id/memo 맵으로 변환한다', async () => {
    mockApiFetch.mockResolvedValue({ '12': { id: 's1', memo: '메모' }, '13': { id: 's2', memo: null } })
    const map = await getScrapMap('grant')
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/map?targetType=grant')
    expect(map).toEqual({ '12': { id: 's1', memo: '메모' }, '13': { id: 's2', memo: null } })
  })

  it('빈/undefined 응답은 빈 맵을 반환한다', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await getScrapMap('grant')).toEqual({})
  })
})

describe('getGrantScraps', () => {
  it('scrap/program을 매핑한다', async () => {
    mockApiFetch.mockResolvedValue([{ scrap: { ...kScrap, targetType: 'grant', targetId: '99' }, program: kProgram }])
    const res = await getGrantScraps()
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/grants?limit=100')
    expect(res[0].program).toMatchObject({ id: '99', apply_end: '2026-01-10', d_day: 3, source_url: 'https://grant.example.com' })
    expect(res[0].scrap).toMatchObject({ target_type: 'grant', target_id: '99' })
  })

  it('빈 응답은 빈 배열', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await getGrantScraps()).toEqual([])
  })
})

describe('getScrapCounts', () => {
  it('grant 카운트를 반환한다', async () => {
    mockApiFetch.mockResolvedValue({ grant: 5 })
    expect(await getScrapCounts()).toEqual({ grant: 5 })
    expect(mockApiFetch).toHaveBeenCalledWith('/insights/scraps/counts')
  })

  it('누락된 카운트는 0으로 보정한다', async () => {
    mockApiFetch.mockResolvedValue({})
    expect(await getScrapCounts()).toEqual({ grant: 0 })
  })
})
