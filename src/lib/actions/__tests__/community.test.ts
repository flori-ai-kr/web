import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import { AppError, ErrorCode } from '@/lib/errors'
import {
  getCommunityPosts,
  getLatestCommunityPosts,
  getCommunityPost,
  getComments,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  togglePostLike,
  createComment,
  deleteComment,
} from '../community'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kPost = {
  id: 42, authorNickname: '플로리스트', category: 'daily', title: '제목',
  content: { type: 'doc' }, contentText: '본문', imageUrls: ['https://img/1'],
  isSecret: false, isPinned: true, likeCount: 3, commentCount: 1, liked: false,
  isMine: true, canView: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}
const kComment = {
  id: 7, postId: 42, parentId: null, authorNickname: '댓글러', content: '댓글',
  isSecret: false, isMine: false, canView: true, isDeleted: false, createdAt: '2026-01-01',
}

const postInput = {
  category: 'daily' as const, title: '제목', content: { type: 'doc' },
  contentText: '본문', isSecret: false, imageUrls: ['https://img/1'],
}

describe('getCommunityPosts', () => {
  it('필터를 쿼리로 전달하고 id를 string으로 매핑', async () => {
    mockApiFetch.mockResolvedValue({ posts: [kPost], hasMore: false })
    const res = await getCommunityPosts({ category: 'daily', search: '꽃' })
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toContain('category=daily')
    expect(url).toContain('search=')
    expect(url).toContain('limit=100')
    expect(res[0].id).toBe('42')
    expect(res[0].image_urls).toEqual(['https://img/1'])
  })

  it('필터 없으면 limit만', async () => {
    mockApiFetch.mockResolvedValue({ posts: [], hasMore: false })
    await getCommunityPosts()
    expect(mockApiFetch).toHaveBeenCalledWith('/community/posts?limit=100')
  })
})

describe('getLatestCommunityPosts', () => {
  it('limit을 쿼리로 전달하고 최소 형태로 매핑 (비밀글 필터 대비 ×3 오버페치)', async () => {
    mockApiFetch.mockResolvedValue({ posts: [kPost], hasMore: false })
    const res = await getLatestCommunityPosts(3)
    expect(mockApiFetch).toHaveBeenCalledWith('/community/posts?limit=9')
    expect(res).toEqual([{ id: '42', title: '제목', category: 'daily', createdAt: '2026-01-01' }])
  })

  it('비밀글은 제외하고 limit으로 자른다', async () => {
    const secret = { ...kPost, id: 99, isSecret: true }
    const a = { ...kPost, id: 1 }
    const b = { ...kPost, id: 2 }
    mockApiFetch.mockResolvedValue({ posts: [secret, a, b], hasMore: false })
    const res = await getLatestCommunityPosts(1)
    expect(res.map((p) => p.id)).toEqual(['1'])
  })

  it('기본 limit은 8 (비밀글 필터 대비 ×3 오버페치 → 24)', async () => {
    mockApiFetch.mockResolvedValue({ posts: [], hasMore: false })
    await getLatestCommunityPosts()
    expect(mockApiFetch).toHaveBeenCalledWith('/community/posts?limit=24')
  })
})

describe('getCommunityPost', () => {
  it('정상 조회', async () => {
    mockApiFetch.mockResolvedValue(kPost)
    expect((await getCommunityPost('42'))?.id).toBe('42')
  })

  it('NOT_FOUND는 null', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.NOT_FOUND, '없음'))
    expect(await getCommunityPost('42')).toBeNull()
  })

  it('잘못된 id는 거부', async () => {
    await expect(getCommunityPost('x')).rejects.toThrow('ID 형식')
  })
})

describe('getComments', () => {
  it('댓글을 매핑하고 parentId null 처리', async () => {
    mockApiFetch.mockResolvedValue([kComment])
    const res = await getComments('42')
    expect(res[0]).toMatchObject({ id: '7', post_id: '42', parent_id: null })
  })

  it('잘못된 postId 거부', async () => {
    await expect(getComments('x')).rejects.toThrow('ID 형식')
  })
})

describe('createCommunityPost', () => {
  it('제목을 trim해 POST하고 revalidate', async () => {
    mockApiFetch.mockResolvedValue(kPost)
    await createCommunityPost({ ...postInput, title: '  제목  ' })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toMatchObject({ category: 'daily', title: '제목', contentText: '본문' })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/community')
  })

  it('제목 누락 거부', async () => {
    await expect(createCommunityPost({ ...postInput, title: '  ' })).rejects.toThrow('제목')
  })

  it('내용 누락 거부', async () => {
    await expect(createCommunityPost({ ...postInput, contentText: '' })).rejects.toThrow('내용')
  })
})

describe('updateCommunityPost', () => {
  it('PATCH 후 두 경로 revalidate', async () => {
    mockApiFetch.mockResolvedValue(kPost)
    await updateCommunityPost('42', postInput)
    expect(mockApiFetch).toHaveBeenCalledWith('/community/posts/42', expect.objectContaining({ method: 'PATCH' }))
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/community')
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/community/42')
  })

  it('잘못된 id 거부', async () => {
    await expect(updateCommunityPost('x', postInput)).rejects.toThrow('ID 형식')
  })
})

describe('deleteCommunityPost', () => {
  it('DELETE 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteCommunityPost('42')
    expect(mockApiFetch).toHaveBeenCalledWith('/community/posts/42', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(deleteCommunityPost('x')).rejects.toThrow('ID 형식')
  })
})

describe('togglePostLike', () => {
  it('like 토글 상태를 반환', async () => {
    mockApiFetch.mockResolvedValue({ liked: true, likeCount: 4 })
    expect(await togglePostLike('42')).toEqual({ liked: true, likeCount: 4 })
    expect(mockApiFetch).toHaveBeenCalledWith('/community/posts/42/like', { method: 'POST' })
  })

  it('잘못된 id 거부', async () => {
    await expect(togglePostLike('x')).rejects.toThrow('ID 형식')
  })
})

describe('createComment', () => {
  it('parentId를 Number로 변환해 POST', async () => {
    mockApiFetch.mockResolvedValue(kComment)
    await createComment('42', { content: '  댓글  ', parentId: '9', isSecret: false })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ content: '댓글', parentId: 9, isSecret: false })
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/community/42')
  })

  it('parentId 없으면 null', async () => {
    mockApiFetch.mockResolvedValue(kComment)
    await createComment('42', { content: '댓글', isSecret: false })
    expect(JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string).parentId).toBeNull()
  })

  it('빈 내용 거부', async () => {
    await expect(createComment('42', { content: '  ', isSecret: false })).rejects.toThrow('댓글 내용')
  })
})

describe('deleteComment', () => {
  it('DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteComment('7')
    expect(mockApiFetch).toHaveBeenCalledWith('/community/comments/7', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(deleteComment('x')).rejects.toThrow('ID 형식')
  })
})
