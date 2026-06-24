import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getUserPreferences,
  updateBottomNavItems,
} from '../insights'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

describe('user preferences', () => {
  it('getUserPreferences: bottomNavItems를 반영', async () => {
    mockApiFetch.mockResolvedValue({ bottomNavItems: ['dashboard', 'sales', 'calendar', 'customers'] })
    const res = await getUserPreferences()
    expect(res.bottom_nav_items).toEqual(['dashboard', 'sales', 'calendar', 'customers'])
  })

  it('updateBottomNavItems: 유효 항목은 PUT', async () => {
    mockApiFetch.mockResolvedValue({ bottomNavItems: ['dashboard', 'sales', 'calendar', 'customers'] })
    await updateBottomNavItems(['dashboard', 'sales', 'calendar', 'customers'])
    expect(mockApiFetch).toHaveBeenCalledWith('/settings/preferences/bottom-nav', expect.objectContaining({ method: 'PUT' }))
  })

  it('updateBottomNavItems: 4개 미만은 거부', async () => {
    await expect(updateBottomNavItems(['dashboard', 'sales'])).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
