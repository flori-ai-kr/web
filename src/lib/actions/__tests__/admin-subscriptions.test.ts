import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAdmin } from '@/lib/admin-guard'
import { apiFetch } from '@/lib/api/client'
import { listSubscriptions } from '../admin-subscriptions'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAdmin = vi.mocked(requireAdmin)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAdmin.mockResolvedValue(undefined as never)
})

describe('listSubscriptions', () => {
  it('status가 있으면 쿼리에 포함', async () => {
    mockApiFetch.mockResolvedValue([])
    await listSubscriptions('ACTIVE')
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/subscriptions?status=ACTIVE')
  })

  it('status 없으면(또는 공백) 쿼리 생략', async () => {
    mockApiFetch.mockResolvedValue([])
    await listSubscriptions('   ')
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/subscriptions')
    await listSubscriptions()
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/subscriptions')
  })
})
