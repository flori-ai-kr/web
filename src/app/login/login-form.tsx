'use client'

import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AuthHeader } from '@/components/auth/auth-header'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid: '잘못된 로그인 요청입니다. 다시 시도해 주세요.',
  kakao_failed: '카카오 로그인에 실패했습니다. 다시 시도해 주세요.',
  kakao_unconfigured: '카카오 로그인이 아직 설정되지 않았습니다.',
  google_failed: '구글 로그인에 실패했습니다. 다시 시도해 주세요.',
  google_unconfigured: '구글 로그인이 아직 설정되지 않았습니다.',
  naver_failed: '네이버 로그인에 실패했습니다. 다시 시도해 주세요.',
  naver_unconfigured: '네이버 로그인이 아직 설정되지 않았습니다.',
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.79 1.86 5.235 4.65 6.615-.205.735-.74 2.67-.847 3.084-.133.513.188.506.395.368.162-.108 2.583-1.755 3.633-2.47.567.082 1.15.123 1.719.123 5.523 0 10-3.477 10-7.8C21.55 6.477 17.523 3 12 3Z" />
    </svg>
  )
}

function NaverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.51 12.36 9.21 4.8H4.8v14.4h4.69v-7.56l5.3 7.56h4.41V4.8h-4.69v7.56Z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.45 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  )
}

interface SocialProviders {
  kakao: boolean
  google: boolean
  naver: boolean
}

const READY_BADGE = (
  <span className="absolute right-3 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
    준비중
  </span>
)

export function LoginForm({ available }: { available: SocialProviders }) {
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')
  const oauthMessage = oauthError ? OAUTH_ERROR_MESSAGES[oauthError] : null

  return (
    <div className="min-h-dvh flex items-center justify-center overflow-y-auto bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <AuthHeader
          subtitle={
            <>
              꽃에만 집중하세요.
              <br />
              <span className="text-brand">운영은 flori가</span> 챙길게요.
            </>
          }
        />

        {/* OAuth 에러 (쿼리 파라미터) */}
        {oauthMessage && (
          <p className="text-sm text-destructive text-center" role="alert">
            {oauthMessage}
          </p>
        )}

        {/* 소셜 로그인 (카카오 → 네이버 → 구글) */}
        <div className="space-y-2.5">
          {/* 카카오 */}
          {available.kakao ? (
            // OAuth 개시 라우트(Route Handler, 302 리다이렉트)로의 전체 네비게이션 — next/link 아님.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/auth/login/kakao"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: '#FEE500', color: '#191600' }}
            >
              <KakaoIcon className="h-4 w-4" />
              카카오로 시작하기
            </a>
          ) : (
            <button
              type="button"
              onClick={() => toast.error('카카오 로그인은 준비 중입니다')}
              className="relative flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium opacity-60 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: '#FEE500', color: '#191600' }}
            >
              <KakaoIcon className="h-4 w-4" />
              카카오로 시작하기
              <span className="absolute right-3 rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                준비중
              </span>
            </button>
          )}

          {/* 네이버 */}
          {available.naver ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/auth/login/naver"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: '#03C75A' }}
            >
              <NaverIcon className="h-4 w-4" />
              네이버로 시작하기
            </a>
          ) : (
            <button
              type="button"
              onClick={() => toast.error('네이버 로그인은 준비 중입니다')}
              className="relative flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white opacity-60 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: '#03C75A' }}
            >
              <NaverIcon className="h-4 w-4" />
              네이버로 시작하기
              {READY_BADGE}
            </button>
          )}

          {/* 구글 */}
          {available.google ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/auth/login/google"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <GoogleIcon className="h-4 w-4" />
              구글로 시작하기
            </a>
          ) : (
            <button
              type="button"
              onClick={() => toast.error('구글 로그인은 준비 중입니다')}
              className="relative flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground opacity-60 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <GoogleIcon className="h-4 w-4" />
              구글로 시작하기
              <span className="absolute right-3 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                준비중
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
