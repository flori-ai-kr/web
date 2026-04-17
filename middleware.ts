import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Cron 및 내부 API(/api/internal/*)는 Bearer 인증을 직접 수행하므로 세션 미들웨어 제외.
    '/((?!_next/static|_next/image|favicon.ico|api/cron/|api/internal/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
