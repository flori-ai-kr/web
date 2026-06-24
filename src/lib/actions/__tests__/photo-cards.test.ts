import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getPhotoCards,
  getPhotoCardById,
  createPhotoCard,
  updatePhotoCard,
  deletePhotoCard,
  createPhotoUploadTargets,
  createPhotoUploadTargetsStandalone,
  deletePhoto,
  reorderPhotos,
  downloadPhoto,
  downloadAllPhotos,
  getPhotoCardBySaleId,
  getSaleIdsWithPhotos,
  createOrUpdatePhotoCardForSale,
} from '../photo-cards'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kCard = {
  id: 'pc1', title: '봄 부케', description: '메모', tags: ['봄'],
  photos: [{ url: 'https://cdn/a.jpg', originalName: 'a.jpg' }],
  saleId: null, createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const validFile = { name: 'a.jpg', type: 'image/jpeg', size: 1024 }
const body = (call = 0) => JSON.parse(mockApiFetch.mock.calls[call][1]!.body as string)

describe('getPhotoCards', () => {
  it('tag/cursor/customerId 쿼리 + 매핑', async () => {
    mockApiFetch.mockResolvedValue({ cards: [kCard], nextCursor: 'c2', hasMore: true })
    const res = await getPhotoCards('봄', 'c1', '5')
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toContain('tag=')
    expect(url).toContain('cursor=c1')
    expect(url).toContain('customerId=5')
    expect(res.cards[0].id).toBe('pc1')
    expect(res.hasMore).toBe(true)
  })

  it('잘못된 customerId 거부', async () => {
    await expect(getPhotoCards(undefined, undefined, 'x')).rejects.toThrow('고객 ID')
  })
})

describe('getPhotoCardById', () => {
  it('정상 조회', async () => {
    mockApiFetch.mockResolvedValue(kCard)
    expect((await getPhotoCardById('1'))?.id).toBe('pc1')
  })
  it('잘못된 id 거부', async () => {
    await expect(getPhotoCardById('x')).rejects.toThrow('ID 형식')
  })
})

describe('createPhotoCard', () => {
  const cardForm = (over: Record<string, string> = {}) => {
    const fd = new FormData()
    fd.set('title', '봄 부케')
    fd.set('tags', JSON.stringify(['봄']))
    fd.set('photos', JSON.stringify([{ url: 'https://cdn/a.jpg', originalName: 'a.jpg' }]))
    for (const [k, v] of Object.entries(over)) fd.set(k, v)
    return fd
  }

  it('유효 입력은 POST', async () => {
    mockApiFetch.mockResolvedValue(kCard)
    await createPhotoCard(cardForm())
    expect(body()).toMatchObject({ title: '봄 부케', tags: ['봄'] })
  })

  it('잘못된 JSON은 거부', async () => {
    await expect(createPhotoCard(cardForm({ tags: '{bad' }))).rejects.toThrow('형식')
  })

  it('제목 누락은 스키마 거부', async () => {
    await expect(createPhotoCard(cardForm({ title: '' }))).rejects.toThrow()
  })
})

describe('updatePhotoCard / deletePhotoCard', () => {
  const fd = () => {
    const f = new FormData()
    f.set('title', '수정')
    f.set('tags', '[]')
    f.set('photos', '[]')
    return f
  }

  it('PATCH', async () => {
    mockApiFetch.mockResolvedValue(kCard)
    await updatePhotoCard('1', fd())
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-cards/1', expect.objectContaining({ method: 'PATCH' }))
  })

  it('update 잘못된 id 거부', async () => {
    await expect(updatePhotoCard('x', fd())).rejects.toThrow('ID 형식')
  })

  it('DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deletePhotoCard('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-cards/1', { method: 'DELETE' })
  })
})

describe('createPhotoUploadTargets', () => {
  it('presigned 발급 후 fileUrl→publicUrl 매핑', async () => {
    mockApiFetch.mockResolvedValue([{ uploadUrl: 'u', fileUrl: 'f', originalName: 'a.jpg' }])
    const res = await createPhotoUploadTargets('1', [validFile])
    expect(res[0]).toEqual({ uploadUrl: 'u', publicUrl: 'f', originalName: 'a.jpg' })
  })

  it('10장 초과 거부', async () => {
    const files = Array.from({ length: 11 }, () => validFile)
    await expect(createPhotoUploadTargets('1', files)).rejects.toThrow('최대 10장')
  })

  it('이미지 메타 위반 거부', async () => {
    await expect(createPhotoUploadTargets('1', [{ name: 'a.gif', type: 'image/gif', size: 1 }])).rejects.toThrow()
  })

  it('잘못된 cardId 거부', async () => {
    await expect(createPhotoUploadTargets('x', [validFile])).rejects.toThrow('ID 형식')
  })
})

describe('createPhotoUploadTargetsStandalone', () => {
  it('presigned 발급', async () => {
    mockApiFetch.mockResolvedValue([{ uploadUrl: 'u', fileUrl: 'f', originalName: 'a.jpg' }])
    const res = await createPhotoUploadTargetsStandalone([validFile])
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-cards/upload-targets', expect.objectContaining({ method: 'POST' }))
    expect(res[0].publicUrl).toBe('f')
  })

  it('10장 초과 거부', async () => {
    await expect(createPhotoUploadTargetsStandalone(Array.from({ length: 11 }, () => validFile))).rejects.toThrow('최대 10장')
  })
})

describe('deletePhoto / reorderPhotos', () => {
  it('deletePhoto: url 인코딩 DELETE', async () => {
    mockApiFetch.mockResolvedValue(kCard)
    await deletePhoto('1', 'https://cdn/a.jpg')
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toContain('/photo-cards/1/photos?url=https%3A%2F%2Fcdn%2Fa.jpg')
  })

  it('reorderPhotos: PATCH', async () => {
    mockApiFetch.mockResolvedValue(kCard)
    await reorderPhotos('1', [{ url: 'https://cdn/a.jpg', originalName: 'a.jpg' }])
    expect(mockApiFetch).toHaveBeenCalledWith('/photo-cards/1/photos/reorder', expect.objectContaining({ method: 'PATCH' }))
  })

  it('잘못된 id 거부', async () => {
    await expect(deletePhoto('x', 'u')).rejects.toThrow('ID 형식')
    await expect(reorderPhotos('x', [])).rejects.toThrow('ID 형식')
  })
})

describe('downloadPhoto', () => {
  const photo = { url: 'https://cdn/a.jpg', originalName: 'a.jpg' }

  it('downloadUrl이 있으면 url/filename 반환', async () => {
    mockApiFetch.mockResolvedValue({ downloadUrl: 'https://signed/a' })
    expect(await downloadPhoto('1', photo)).toEqual({ url: 'https://signed/a', filename: 'a.jpg' })
  })

  it('downloadUrl 없으면 null', async () => {
    mockApiFetch.mockResolvedValue({})
    expect(await downloadPhoto('1', photo)).toBeNull()
  })

  it('에러 시 null', async () => {
    mockApiFetch.mockRejectedValue(new Error('x'))
    expect(await downloadPhoto('1', photo)).toBeNull()
  })

  it('잘못된 id 거부', async () => {
    await expect(downloadPhoto('x', photo)).rejects.toThrow('ID 형식')
  })
})

describe('downloadAllPhotos', () => {
  it('사진 없으면 빈 배열', async () => {
    mockApiFetch.mockResolvedValue({ ...kCard, photos: [] })
    expect(await downloadAllPhotos('1')).toEqual({ urls: [] })
  })

  it('각 사진의 다운로드 URL을 모은다', async () => {
    mockApiFetch
      .mockResolvedValueOnce(kCard) // 카드 조회
      .mockResolvedValue({ downloadUrl: 'https://signed/a' }) // downloadPhoto 호출
    const res = await downloadAllPhotos('1')
    expect(res.urls).toEqual([{ url: 'https://signed/a', filename: 'a.jpg' }])
  })
})

describe('getPhotoCardBySaleId', () => {
  it('카드 있으면 매핑', async () => {
    mockApiFetch.mockResolvedValue(kCard)
    expect((await getPhotoCardBySaleId('1'))?.id).toBe('pc1')
  })
  it('204(undefined)면 null', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await getPhotoCardBySaleId('1')).toBeNull()
  })
})

describe('getSaleIdsWithPhotos', () => {
  it('빈 입력은 빈 배열', async () => {
    expect(await getSaleIdsWithPhotos([])).toEqual([])
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('카드 있는 saleId만 반환', async () => {
    mockApiFetch
      .mockResolvedValueOnce(kCard)
      .mockResolvedValueOnce(undefined)
    const res = await getSaleIdsWithPhotos(['1', '2'])
    expect(res).toEqual(['1'])
  })
})

describe('createOrUpdatePhotoCardForSale', () => {
  it('기존 카드가 있으면 PATCH', async () => {
    mockApiFetch
      .mockResolvedValueOnce(kCard) // getPhotoCardBySaleId
      .mockResolvedValueOnce(kCard) // PATCH
    await createOrUpdatePhotoCardForSale('9', '제목', [{ url: 'https://cdn/a.jpg', originalName: 'a.jpg' }])
    expect(mockApiFetch.mock.calls[1][0]).toBe('/photo-cards/pc1')
    expect(mockApiFetch.mock.calls[1][1]).toMatchObject({ method: 'PATCH' })
  })

  it('기존 카드가 없으면 POST(saleId 포함)', async () => {
    mockApiFetch
      .mockResolvedValueOnce(undefined) // getPhotoCardBySaleId → null
      .mockResolvedValueOnce(kCard) // POST
    await createOrUpdatePhotoCardForSale('9', '제목', [{ url: 'https://cdn/a.jpg', originalName: 'a.jpg' }])
    expect(mockApiFetch.mock.calls[1][0]).toBe('/photo-cards')
    expect(body(1)).toMatchObject({ title: '제목', saleId: '9', customerId: null })
  })

  it('신규 생성 시 customerId를 숫자로 POST(고객 연결)', async () => {
    mockApiFetch
      .mockResolvedValueOnce(undefined) // getPhotoCardBySaleId → null
      .mockResolvedValueOnce(kCard) // POST
    await createOrUpdatePhotoCardForSale('9', '제목', [], null, [], '42')
    expect(body(1)).toMatchObject({ saleId: '9', customerId: 42 })
  })

  it('PATCH(기존 카드)에는 고객 신호를 보내지 않는다(수동 연결 보존)', async () => {
    mockApiFetch
      .mockResolvedValueOnce(kCard) // getPhotoCardBySaleId
      .mockResolvedValueOnce(kCard) // PATCH
    await createOrUpdatePhotoCardForSale('9', '제목', [], null, [], '42')
    const patchBody = body(1)
    expect(patchBody).not.toHaveProperty('customerId')
    expect(patchBody).not.toHaveProperty('clearCustomer')
  })
})
