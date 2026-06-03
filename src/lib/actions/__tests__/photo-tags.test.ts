import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import { getPhotoTags, createPhotoTag, updatePhotoTag, deletePhotoTag } from '../photo-tags'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const dto = { id: '1', name: '봄', color: '#ec4899', createdAt: '2026-01-01' }

describe('getPhotoTags', () => {
  it('매핑해서 반환', async () => {
    mockApiFetch.mockResolvedValue([dto])
    const res = await getPhotoTags()
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-tags')
    expect(res[0]).toEqual({ id: '1', name: '봄', color: '#ec4899', created_at: '2026-01-01' })
  })

  it('null 응답은 빈 배열', async () => {
    mockApiFetch.mockResolvedValue(null)
    expect(await getPhotoTags()).toEqual([])
  })
})

describe('createPhotoTag', () => {
  it('이름을 trim해 POST', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await createPhotoTag('  봄  ', '#ec4899')
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ name: '봄', color: '#ec4899' })
  })

  it('color 미지정은 null', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await createPhotoTag('봄')
    expect(JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string).color).toBeNull()
  })

  it('빈 이름은 거부', async () => {
    await expect(createPhotoTag('   ')).rejects.toThrow('태그 이름')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updatePhotoTag', () => {
  it('정상 PUT', async () => {
    mockApiFetch.mockResolvedValue(dto)
    await updatePhotoTag('1', '여름', '#3b82f6')
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-tags/1', expect.objectContaining({ method: 'PUT' }))
  })

  it('잘못된 id 거부', async () => {
    await expect(updatePhotoTag('x', '여름', '#3b82f6')).rejects.toThrow('ID 형식')
  })

  it('빈 이름 거부', async () => {
    await expect(updatePhotoTag('1', '  ', '#3b82f6')).rejects.toThrow('태그 이름')
  })
})

describe('deletePhotoTag', () => {
  it('정상 DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deletePhotoTag('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-tags/1', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(deletePhotoTag('x')).rejects.toThrow('ID 형식')
  })
})
