import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../schedules'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const kEvent = {
  id: '1', title: '행사', startDate: '2026-01-01', endDate: '2026-01-03',
  color: '#f43f5e', memo: '메모', createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

const body = () => JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)

describe('getSchedules', () => {
  it('month 쿼리로 조회 후 매핑', async () => {
    mockApiFetch.mockResolvedValue([kEvent])
    const res = await getSchedules('2026-01')
    expect(mockApiFetch).toHaveBeenCalledWith('/schedules?month=2026-01')
    expect(res[0]).toMatchObject({ id: '1', start_date: '2026-01-01', end_date: '2026-01-03' })
  })
})

describe('createSchedule', () => {
  it('유효 입력은 POST하고 기본 색상을 채운다', async () => {
    mockApiFetch.mockResolvedValue(kEvent)
    await createSchedule({ title: '행사', start_date: '2026-01-01', end_date: '2026-01-03' })
    expect(body()).toMatchObject({ title: '행사', startDate: '2026-01-01', endDate: '2026-01-03', color: '#f43f5e' })
  })

  it('종료일이 시작일보다 빠르면 거부', async () => {
    await expect(createSchedule({ title: '행사', start_date: '2026-01-03', end_date: '2026-01-01' })).rejects.toThrow()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('updateSchedule', () => {
  it('제공된 필드만 PATCH 본문에 포함', async () => {
    mockApiFetch.mockResolvedValue(kEvent)
    await updateSchedule('1', { title: '변경' })
    expect(body()).toEqual({ title: '변경' })
    expect(mockApiFetch).toHaveBeenCalledWith('/schedules/1', expect.objectContaining({ method: 'PATCH' }))
  })

  it('잘못된 id 거부', async () => {
    await expect(updateSchedule('x', { title: 'a' })).rejects.toThrow('올바르지 않은 ID')
  })

  it('start>end 날짜 범위 위반 거부', async () => {
    await expect(updateSchedule('1', { start_date: '2026-01-05', end_date: '2026-01-01' })).rejects.toThrow('종료일')
  })
})

describe('deleteSchedule', () => {
  it('정상 DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    await deleteSchedule('1')
    expect(mockApiFetch).toHaveBeenCalledWith('/schedules/1', { method: 'DELETE' })
  })

  it('잘못된 id 거부', async () => {
    await expect(deleteSchedule('x')).rejects.toThrow('올바르지 않은 ID')
  })
})
