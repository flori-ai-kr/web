'use server'

import {redirect} from 'next/navigation'
import {setAuthTokens} from '@/lib/api/auth-cookies'

interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: '이메일과 비밀번호를 입력해주세요.' }
  }

  const base = process.env.KOTLIN_API_URL ?? 'http://localhost:8080'
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  const tokens = (await res.json()) as TokenResponse
  await setAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn)

  redirect('/admin')
}
