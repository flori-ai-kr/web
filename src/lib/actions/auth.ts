'use server'

import { redirect } from 'next/navigation'
import { withErrorLogging } from '@/lib/errors'
import { clearAuthTokens, getRefreshToken } from '@/lib/api/auth-cookies'

async function _signOut() {
  const refresh = await getRefreshToken()

  // 서버측 refresh 토큰 무효화 (실패해도 로컬 쿠키는 비운다)
  if (refresh) {
    const base = process.env.KOTLIN_API_URL ?? 'http://localhost:8080'
    try {
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
        cache: 'no-store',
      })
    } catch {
      // 네트워크 오류 등은 무시 — 로컬 로그아웃은 진행
    }
  }

  await clearAuthTokens()
  redirect('/login')
}

export const signOut = withErrorLogging('signOut', _signOut);
