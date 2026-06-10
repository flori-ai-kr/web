import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getMyBusinessVerification,
  createBusinessLicenseUploadTarget,
  submitBusinessVerification,
} from '../business-verification'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const validInput = {
  businessNumber: '123-45-67890',
  businessName: '플로리',
  representativeName: '홍길동',
  businessLicenseUrl: 'https://cdn.example.com/license.jpg',
}

describe('getMyBusinessVerification', () => {
  it('상태를 매핑한다', async () => {
    mockApiFetch.mockResolvedValue({ status: 'APPROVED', submittedAt: '2026-01-01' })
    const res = await getMyBusinessVerification()
    expect(mockApiFetch).toHaveBeenCalledWith('/verification/business/me')
    expect(res).toEqual({ status: 'APPROVED', rejectReason: null, submittedAt: '2026-01-01', reviewedAt: null })
  })

  it('빈 status는 NONE으로 기본 처리', async () => {
    mockApiFetch.mockResolvedValue({ status: '' })
    expect((await getMyBusinessVerification()).status).toBe('NONE')
  })
})

describe('createBusinessLicenseUploadTarget', () => {
  it('허용 contentType은 presigned 발급', async () => {
    mockApiFetch.mockResolvedValue({ uploadUrl: 'u', fileUrl: 'f', expiresInSeconds: 60 })
    const res = await createBusinessLicenseUploadTarget('image/jpeg')
    expect(res).toEqual({ uploadUrl: 'u', fileUrl: 'f' })
  })

  it('허용되지 않는 형식은 거부', async () => {
    await expect(createBusinessLicenseUploadTarget('image/gif')).rejects.toThrow('허용되지 않는 파일')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('submitBusinessVerification', () => {
  it('사업자번호를 숫자만 추출해 POST', async () => {
    mockApiFetch.mockResolvedValue({ status: 'PENDING' })
    await submitBusinessVerification(validInput)
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.businessNumber).toBe('1234567890')
    expect(body.businessName).toBe('플로리')
  })

  it('사업자번호가 10자리가 아니면 거부', async () => {
    await expect(submitBusinessVerification({ ...validInput, businessNumber: '123' })).rejects.toThrow('10자리')
  })

  it('상호 누락 거부', async () => {
    await expect(submitBusinessVerification({ ...validInput, businessName: '  ' })).rejects.toThrow('상호')
  })

  it('대표자명 누락 거부', async () => {
    await expect(submitBusinessVerification({ ...validInput, representativeName: '' })).rejects.toThrow('대표자명')
  })

  it('등록증 URL 누락 거부', async () => {
    await expect(submitBusinessVerification({ ...validInput, businessLicenseUrl: '' })).rejects.toThrow('사업자등록증')
  })

  it('STORAGE_PUBLIC_URL과 다른 도메인 URL은 거부', async () => {
    vi.stubEnv('STORAGE_PUBLIC_URL', 'https://storage.flori.kr')
    await expect(submitBusinessVerification(validInput)).rejects.toThrow('허용되지 않은 등록증 URL')
  })

  it('STORAGE_PUBLIC_URL 접두사가 맞으면 통과', async () => {
    vi.stubEnv('STORAGE_PUBLIC_URL', 'https://cdn.example.com')
    mockApiFetch.mockResolvedValue({ status: 'PENDING' })
    expect((await submitBusinessVerification(validInput)).status).toBe('PENDING')
  })
})
