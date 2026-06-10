import { NextResponse, type NextRequest } from 'next/server'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/api/cookie-names'
import { rootRedirectTarget } from '@/lib/middleware-routing'

// JWT payload에서 exp를 디코딩 (Edge Runtime 호환 — jsonwebtoken 사용 불가)
// 주의: 여기서는 서명을 검증하지 않는다(만료 시점 판단용 디코딩일 뿐).
// 토큰의 진위/서명 검증은 BFF(@RequiresAuth)가 최종 방어선으로 수행한다.
// middleware는 "refresh 쿠키 존재" 게이트 + 선제 갱신만 담당한다.
function getJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch {
    return null
  }
}

// access 토큰이 만료됐거나 60초 이내 만료 예정이면 true
function isExpiredOrExpiring(token: string): boolean {
  const exp = getJwtExp(token)
  if (exp === null) return true // 파싱 불가 → 만료 취급
  const now = Math.floor(Date.now() / 1000)
  return exp - now < 60
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 루트 분기: 인증 쿠키 있으면 /admin, 없으면 랜딩 렌더
  const rootTarget = rootRedirectTarget(pathname, {
    hasAccess: request.cookies.has(ACCESS_COOKIE),
    hasRefresh: request.cookies.has(REFRESH_COOKIE),
  });
  if (rootTarget) {
    return NextResponse.redirect(new URL(rootTarget, request.url));
  }

  // 인증이 필요한 경로만 체크
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/console')) {
    return NextResponse.next()
  }

  const hasRefresh = request.cookies.has(REFRESH_COOKIE)
  if (!hasRefresh) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Server Action(POST)은 미들웨어에서 refresh하지 않는다.
  // apiFetch 내부 refresh 로직이 처리하며, 미들웨어 동시 refresh로 인한
  // rotation race condition(토큰 이중 소비 → INVALID_TOKEN)을 방지한다.
  if (request.method !== 'GET') {
    return NextResponse.next()
  }

  // access 토큰이 유효하면 그대로 통과
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  if (accessToken && !isExpiredOrExpiring(accessToken)) {
    return NextResponse.next()
  }

  // access 만료/없음 → refresh로 갱신
  const refreshToken = request.cookies.get(REFRESH_COOKIE)!.value
  const apiUrl = process.env.API_URL ?? 'http://localhost:8080'

  let tokens: { accessToken: string; refreshToken: string; expiresIn: number }
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      // refresh 실패 → 로그인으로
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(ACCESS_COOKIE)
      response.cookies.delete(REFRESH_COOKIE)
      return response
    }

    tokens = await res.json()
  } catch {
    // 네트워크 에러 → 그냥 통과 (Server Component에서 재시도)
    return NextResponse.next()
  }

  // 새 토큰을 request 헤더에 주입 → 같은 요청의 Server Component가 cookies()로 읽을 수 있게
  const requestHeaders = new Headers(request.headers)
  const updatedCookies = request.cookies.getAll()
    .filter(c => c.name !== ACCESS_COOKIE && c.name !== REFRESH_COOKIE)
    .map(c => `${c.name}=${c.value}`)
  updatedCookies.push(`${ACCESS_COOKIE}=${tokens.accessToken}`)
  updatedCookies.push(`${REFRESH_COOKIE}=${tokens.refreshToken}`)
  requestHeaders.set('cookie', updatedCookies.join('; '))

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // 브라우저에도 Set-Cookie로 영속
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOptions,
    maxAge: Math.max(1, tokens.expiresIn),
  })
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 14,
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|healthz|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
