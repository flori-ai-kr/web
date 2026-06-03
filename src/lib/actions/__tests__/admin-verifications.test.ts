import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { apiFetch } from '@/lib/api/client'
import { listVerifications, approveVerification, rejectVerification } from '../admin-verifications'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAdmin = vi.mocked(requireAdmin)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAdmin.mockResolvedValue(undefined as never)
})

describe('listVerifications', () => {
  it('유효 status로 조회', async () => {
    mockApiFetch.mockResolvedValue([])
    await listVerifications('PENDING')
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/verifications?status=PENDING')
  })

  it('화이트리스트 밖 status는 거부', async () => {
    await expect(listVerifications('HACK' as never)).rejects.toThrow('유효하지 않은 상태값')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('approveVerification', () => {
  it('approve POST 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue({ id: 1, status: 'APPROVED' })
    await approveVerification(1)
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/verifications/1/approve', { method: 'POST' })
    expect(mockRevalidate).toHaveBeenCalledWith('/console/verifications')
  })
})

describe('rejectVerification', () => {
  it('reason과 함께 reject POST 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue({ id: 1, status: 'REJECTED' })
    await rejectVerification(1, '서류 불충분')
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/verifications/1/reject', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)).toEqual({ reason: '서류 불충분' })
    expect(mockRevalidate).toHaveBeenCalledWith('/console/verifications')
  })
})
