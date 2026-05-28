import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { OAUTH_STATE_COOKIE } from '@/lib/api/cookie-names'
import { setAuthTokens, setRegisterToken } from '@/lib/api/auth-cookies'
import { isOAuthProvider } from '../../oauth-providers'

interface OAuthResult {
  registered: boolean
  token: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    tokenType: string
  } | null
  registerToken: string | null
  socialEmail: string | null
  socialNickname: string | null
}

// 소셜 OAuth 콜백 라우트 (kakao·google·naver 공용).
// state(CSRF) 검증 → Kotlin BFF로 code 교환 → OAuthResult 분기.
//  - registered=true  → 토큰 쿠키 저장 → /admin
//  - registered=false → registerToken 쿠키 저장 + 프리필 쿼리 → /onboarding
// 실패 시 /login?error={provider}_failed.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params

  // 화이트리스트 검증 — 맵에 없는 provider는 일반 실패로 처리.
  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url))
  }

  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  const store = await cookies()
  const savedState = store.get(OAUTH_STATE_COOKIE)?.value
  // state 쿠키는 1회용 — 검증 결과와 무관하게 즉시 삭제.
  store.delete(OAUTH_STATE_COOKIE)

  const failed = NextResponse.redirect(
    new URL(`/login?error=${provider}_failed`, request.url),
  )

  if (!code || !state || !savedState || state !== savedState) {
    return failed
  }

  try {
    const base = process.env.API_URL ?? 'http://localhost:8080'
    const redirectUri = `${origin}/auth/callback/${provider}`
    // 네이버는 토큰 교환 시 state도 함께 검증한다.
    const body =
      provider === 'naver' ? { code, redirectUri, state } : { code, redirectUri }
    const res = await fetch(`${base}/auth/oauth/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      return failed
    }

    const result = (await res.json()) as OAuthResult

    if (result.registered && result.token) {
      await setAuthTokens(
        result.token.accessToken,
        result.token.refreshToken,
        result.token.expiresIn,
      )
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    if (!result.registered && result.registerToken) {
      await setRegisterToken(result.registerToken)
      const onboardingUrl = new URL('/onboarding', request.url)
      if (result.socialEmail) {
        onboardingUrl.searchParams.set('email', result.socialEmail)
      }
      if (result.socialNickname) {
        onboardingUrl.searchParams.set('nickname', result.socialNickname)
      }
      return NextResponse.redirect(onboardingUrl)
    }

    return failed
  } catch {
    return failed
  }
}
