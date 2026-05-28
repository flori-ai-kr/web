import { randomBytes } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { OAUTH_STATE_COOKIE } from '@/lib/api/cookie-names'
import { OAUTH_PROVIDERS, isOAuthProvider } from '../../oauth-providers'

// 소셜 OAuth 개시 라우트 (kakao·google·naver 공용).
// provider별 client-id 환경변수가 있으면 랜덤 state를 httpOnly 쿠키에 저장하고
// 해당 공급자 authorize 화면으로 302 리다이렉트한다.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params

  // 화이트리스트 검증 — 맵에 없는 provider는 404.
  if (!isOAuthProvider(provider)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const config = OAUTH_PROVIDERS[provider]
  const clientId = process.env[config.envKey]

  if (!clientId) {
    return NextResponse.redirect(new URL(`/login?error=${provider}_unconfigured`, request.url))
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/auth/callback/${provider}`
  const state = randomBytes(16).toString('hex')

  let authorizeUrl =
    config.authorize +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code' +
    `&state=${state}`
  if (config.scope) {
    authorizeUrl += `&scope=${encodeURIComponent(config.scope)}`
  }

  const res = NextResponse.redirect(authorizeUrl)
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
