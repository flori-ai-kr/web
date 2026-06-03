import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAdmin } from '@/lib/admin-guard'
import { apiFetch } from '@/lib/api/client'
import { getAiHealth } from '../admin-health'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAdmin = vi.mocked(requireAdmin)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAdmin.mockResolvedValue(undefined as never)
})

describe('getAiHealth', () => {
  it('운영자 검증 후 헬스 프록시를 조회', async () => {
    mockApiFetch.mockResolvedValue({ status: 'ok' })
    const res = await getAiHealth()
    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/health/ai')
    expect(res).toEqual({ status: 'ok' })
  })
})
