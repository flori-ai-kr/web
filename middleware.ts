import { NextResponse, type NextRequest } from 'next/server'
import { REFRESH_COOKIE } from '@/lib/api/cookie-names'

// /admin/* 만 인증 강제. refresh 쿠키가 없으면 로그인으로 보낸다.
// 토큰 갱신은 미들웨어에서 하지 않는다(API 클라이언트가 처리).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const hasRefresh = request.cookies.has(REFRESH_COOKIE)
    if (!hasRefresh) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
