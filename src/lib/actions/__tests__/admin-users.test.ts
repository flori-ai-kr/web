import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { apiFetch } from '@/lib/api/client'
import { listAdminUsers, setUserActive, getAdminUserDetail } from '../admin-users'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAdmin = vi.mocked(requireAdmin)
const mockRevalidate = vi.mocked(revalidatePath)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAdmin.mockResolvedValue(undefined as never)
})

describe('listAdminUsers', () => {
  it('page/size 쿼리로 조회하고 query가 있으면 포함', async () => {
    mockApiFetch.mockResolvedValue({ content: [], totalPages: 0 })
    await listAdminUsers('홍길동', 2)
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/users?page=2&size=50&query=%ED%99%8D%EA%B8%B8%EB%8F%99')
  })

  it('빈 query는 쿼리에서 생략', async () => {
    mockApiFetch.mockResolvedValue({ content: [], totalPages: 0 })
    await listAdminUsers('   ', 0)
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/users?page=0&size=50')
  })
})

describe('setUserActive', () => {
  it('active를 POST하고 console/users를 revalidate', async () => {
    mockApiFetch.mockResolvedValue({ id: 1, isActive: false })
    await setUserActive(1, false)
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/users/1/active', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)).toEqual({ active: false })
    expect(mockRevalidate).toHaveBeenCalledWith('/console/users')
  })

  it('유효하지 않은 id는 거부', async () => {
    await expect(setUserActive(0, true)).rejects.toThrow('유효하지 않은 사용자 ID')
    await expect(setUserActive(-3, true)).rejects.toThrow()
    await expect(setUserActive(1.5, true)).rejects.toThrow()
  })
})

describe('getAdminUserDetail', () => {
  it('정상 id로 상세 조회', async () => {
    mockApiFetch.mockResolvedValue({ id: 5 })
    await getAdminUserDetail(5)
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/users/5')
  })

  it('유효하지 않은 id는 거부', async () => {
    await expect(getAdminUserDetail(0)).rejects.toThrow('유효하지 않은 사용자 ID')
  })
})
