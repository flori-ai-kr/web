import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAdmin } from '@/lib/admin-guard'
import { apiFetch } from '@/lib/api/client'
import { AppError, ErrorCode } from '@/lib/errors'
import { getAdminOverview, getTimeseries } from '../admin-stats'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAdmin = vi.mocked(requireAdmin)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAdmin.mockResolvedValue(undefined as never)
})

describe('getAdminOverview', () => {
  it('기본 range는 30d', async () => {
    mockApiFetch.mockResolvedValue({ totalUsers: 10 })
    await getAdminOverview()
    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/stats/overview?range=30d')
  })

  it('range를 쿼리에 반영', async () => {
    mockApiFetch.mockResolvedValue({ totalUsers: 10 })
    await getAdminOverview('7d')
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/stats/overview?range=7d')
  })
})

describe('getTimeseries', () => {
  it('metric/range 쿼리로 조회', async () => {
    mockApiFetch.mockResolvedValue([{ date: '2026-01-01', value: 1 }])
    const res = await getTimeseries('signups', '7d')
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/stats/timeseries?metric=signups&range=7d')
    expect(res).toHaveLength(1)
  })

  it('NOT_FOUND(미배포)는 빈 배열로 degrade', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.NOT_FOUND, '없음'))
    expect(await getTimeseries('sales')).toEqual([])
  })

  it('인증 실패 등 다른 에러는 전파', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.UNAUTHORIZED, '권한'))
    await expect(getTimeseries('sales')).rejects.toBeInstanceOf(AppError)
  })
})
