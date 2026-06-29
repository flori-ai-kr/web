import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  generateBlogDraft,
  getToneProfile,
  saveToneProfile,
  listBlogContents,
  getBlogContent,
  updateBlogContent,
  deleteBlogContent,
} from '../marketing'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

const sampleDraft = {
  title: '제목',
  sections: [{ heading: '소제목', body: '본문' }],
  faq: [{ q: '질문', a: '답변' }],
  hashtags: ['#꽃'],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

describe('generateBlogDraft', () => {
  it('유효 입력은 /ai/marketing/blog로 POST', async () => {
    mockApiFetch.mockResolvedValue({ contentId: 'c1', draft: sampleDraft })
    await generateBlogDraft({
      keyword: '어버이날 카네이션',
      situation: '어버이날',
      memo: '비누꽃도',
      photoUrls: ['https://cdn.example.com/a.jpg'],
    })
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/marketing/blog', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({
      keyword: '어버이날 카네이션',
      situation: '어버이날',
      memo: '비누꽃도',
      photoUrls: ['https://cdn.example.com/a.jpg'],
    })
  })

  it('키워드만으로도 POST (선택 필드 생략)', async () => {
    mockApiFetch.mockResolvedValue({ contentId: 'c1', draft: sampleDraft })
    await generateBlogDraft({ keyword: '꽃다발' })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.keyword).toBe('꽃다발')
    expect(body.situation).toBeUndefined()
  })

  it('빈 키워드는 거부', async () => {
    await expect(generateBlogDraft({ keyword: '   ' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('너무 긴 키워드는 거부', async () => {
    await expect(generateBlogDraft({ keyword: 'x'.repeat(201) })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('사진 5장 이상은 거부', async () => {
    const urls = Array.from({ length: 5 }, (_, i) => `https://cdn.example.com/${i}.jpg`)
    await expect(generateBlogDraft({ keyword: '꽃', photoUrls: urls })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('잘못된 사진 URL은 거부', async () => {
    await expect(generateBlogDraft({ keyword: '꽃', photoUrls: ['not-a-url'] })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('getToneProfile', () => {
  it('samples 배열을 반환', async () => {
    mockApiFetch.mockResolvedValue({ samples: ['글1', '글2'] })
    expect(await getToneProfile()).toEqual({ samples: ['글1', '글2'] })
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/marketing/tone-profile')
  })

  it('samples가 null이면 빈 배열', async () => {
    mockApiFetch.mockResolvedValue({ samples: null })
    expect(await getToneProfile()).toEqual({ samples: [] })
  })
})

describe('saveToneProfile', () => {
  it('유효 샘플은 PUT', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    const result = await saveToneProfile({ samples: ['내 블로그 글입니다'] })
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/marketing/tone-profile', expect.objectContaining({ method: 'PUT' }))
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ samples: ['내 블로그 글입니다'] })
    expect(result.samples).toEqual(['내 블로그 글입니다'])
  })

  it('빈 배열도 허용 (말투 초기화)', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await saveToneProfile({ samples: [] })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ samples: [] })
  })

  it('샘플 4개 이상은 거부', async () => {
    await expect(saveToneProfile({ samples: ['a', 'b', 'c', 'd'] })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('listBlogContents', () => {
  it('channel=blog로 GET, 목록 반환', async () => {
    mockApiFetch.mockResolvedValue({ contents: [{ id: '1' }], hasMore: true })
    const page = await listBlogContents({ offset: 0, limit: 10 })
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/ai/marketing/contents?channel=blog'))
    expect(page.hasMore).toBe(true)
    expect(page.contents).toHaveLength(1)
  })

  it('contents가 배열 아니면 빈 배열', async () => {
    mockApiFetch.mockResolvedValue({ contents: null })
    const page = await listBlogContents()
    expect(page.contents).toEqual([])
    expect(page.hasMore).toBe(false)
  })
})

describe('getBlogContent', () => {
  it('유효 식별자는 GET', async () => {
    mockApiFetch.mockResolvedValue({ id: 'abc_1', draft: sampleDraft })
    await getBlogContent('abc_1')
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/marketing/contents/abc_1')
  })

  it('잘못된 식별자는 거부', async () => {
    await expect(getBlogContent('bad id!')).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateBlogContent', () => {
  it('유효 입력은 /ai/marketing/contents/{id}로 PUT (draft 본문 전달)', async () => {
    mockApiFetch.mockResolvedValue({ id: 'abc_1', draft: sampleDraft })
    const result = await updateBlogContent('abc_1', sampleDraft)
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/ai/marketing/contents/abc_1',
      expect.objectContaining({ method: 'PUT' }),
    )
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({
      title: '제목',
      sections: [{ heading: '소제목', body: '본문' }],
      faq: [{ q: '질문', a: '답변' }],
      hashtags: ['#꽃'],
    })
    expect(result.id).toBe('abc_1')
  })

  it('빈 제목은 거부', async () => {
    await expect(updateBlogContent('abc_1', { ...sampleDraft, title: '   ' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('섹션이 없으면 거부', async () => {
    await expect(updateBlogContent('abc_1', { ...sampleDraft, sections: [] })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('잘못된 식별자는 거부', async () => {
    await expect(updateBlogContent('bad id!', sampleDraft)).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('deleteBlogContent', () => {
  it('유효 식별자는 DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteBlogContent('abc_1')
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/marketing/contents/abc_1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('잘못된 식별자는 거부', async () => {
    await expect(deleteBlogContent('bad id!')).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
