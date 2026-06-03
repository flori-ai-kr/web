import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))

import { requireAuth } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api/client'
import { AppError, ErrorCode } from '@/lib/errors'
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscriptionStatus,
  sendTestNotification,
} from '../push'

const mockApiFetch = vi.mocked(apiFetch)
const mockRequireAuth = vi.mocked(requireAuth)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockRequireAuth.mockResolvedValue({ id: 'u1', name: 'T', email: 't@e.com' })
})

const sub = { endpoint: 'https://push/abc', keys: { p256dh: 'p', auth: 'a' } }

describe('subscribeToPush', () => {
  it('endpoint/keys를 평탄화해 POST하고 success', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    const res = await subscribeToPush(sub)
    expect(res).toEqual({ success: true })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body).toEqual({ endpoint: 'https://push/abc', p256dh: 'p', auth: 'a' })
  })

  it('AppError는 success:false + 메시지로 변환', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.VALIDATION, '구독 실패'))
    expect(await subscribeToPush(sub)).toEqual({ success: false, error: '구독 실패' })
  })

  it('AppError가 아닌 에러는 전파', async () => {
    mockApiFetch.mockRejectedValue(new Error('네트워크'))
    await expect(subscribeToPush(sub)).rejects.toThrow()
  })
})

describe('unsubscribeFromPush', () => {
  it('endpoint를 인코딩해 POST', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    const res = await unsubscribeFromPush('https://push/abc?x=1')
    expect(res).toEqual({ success: true })
    const url = mockApiFetch.mock.calls[0][0] as string
    expect(url).toBe('/push/unsubscribe?endpoint=https%3A%2F%2Fpush%2Fabc%3Fx%3D1')
  })

  it('AppError는 success:false', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.NOT_FOUND, '없음'))
    expect(await unsubscribeFromPush('e')).toEqual({ success: false, error: '없음' })
  })
})

describe('getPushSubscriptionStatus', () => {
  it('subscribed를 isSubscribed로 매핑', async () => {
    mockApiFetch.mockResolvedValue({ subscribed: true })
    expect(await getPushSubscriptionStatus()).toEqual({ success: true, isSubscribed: true })
    expect(mockApiFetch).toHaveBeenCalledWith('/push/status')
  })
})

describe('sendTestNotification', () => {
  it('sent>0이면 success', async () => {
    mockApiFetch.mockResolvedValue({ sent: 2 })
    expect(await sendTestNotification()).toEqual({ success: true })
    expect(mockApiFetch).toHaveBeenCalledWith('/push/test', { method: 'POST' })
  })

  it('sent=0이면 활성 구독 없음', async () => {
    mockApiFetch.mockResolvedValue({ sent: 0 })
    expect(await sendTestNotification()).toEqual({ success: false, error: '활성 구독이 없습니다' })
  })

  it('void 응답(서버 미구현)은 success로 간주', async () => {
    mockApiFetch.mockResolvedValue(undefined)
    expect(await sendTestNotification()).toEqual({ success: true })
  })

  it('AppError는 success:false', async () => {
    mockApiFetch.mockRejectedValue(new AppError(ErrorCode.UNKNOWN, '전송 실패'))
    expect(await sendTestNotification()).toEqual({ success: false, error: '전송 실패' })
  })
})
