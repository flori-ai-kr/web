import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/api/auth-cookies', () => ({
  getRefreshToken: vi.fn(),
  clearAuthTokens: vi.fn(),
}))

import { redirect } from 'next/navigation'
import { getRefreshToken, clearAuthTokens } from '@/lib/api/auth-cookies'
import { signOut } from '../auth'

const mockRedirect = vi.mocked(redirect)
const mockGetRefresh = vi.mocked(getRefreshToken)
const mockClear = vi.mocked(clearAuthTokens)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true })
  mockClear.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('signOut', () => {
  it('refresh 토큰이 있으면 서버 로그아웃 호출 후 쿠키 정리·리다이렉트', async () => {
    mockGetRefresh.mockResolvedValue('refresh-token')
    await signOut()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/auth/logout')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ refreshToken: 'refresh-token' })
    expect(mockClear).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('refresh 토큰이 없으면 서버 호출 없이 정리·리다이렉트', async () => {
    mockGetRefresh.mockResolvedValue(null)
    await signOut()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockClear).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('서버 로그아웃이 실패해도 로컬 정리·리다이렉트는 진행', async () => {
    mockGetRefresh.mockResolvedValue('refresh-token')
    fetchMock.mockRejectedValue(new Error('network'))
    await signOut()
    expect(mockClear).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
