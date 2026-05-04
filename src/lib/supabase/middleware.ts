import {createServerClient} from '@supabase/ssr'
import {type NextRequest, NextResponse} from 'next/server'

// @MX:ANCHOR: [AUTO] Auth boundary for /admin/* — first defense line of 3-tier (middleware → requireAuth → RLS).
// @MX:REASON: fan_in >= 3 (root middleware.ts, login flow, every admin route group); SPEC-ROUTE-ADMIN-001 REQ-ROUTE-002.
// @MX:SPEC: SPEC-ROUTE-ADMIN-001
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 공개 홈페이지(/)·공개 라우트는 인증 불필요. /admin/* 에만 인증 강제.
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/admin')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (
    user &&
    request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
