'use client'

import { useId } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { BarChart3, CalendarClock, Sparkles, Newspaper, type LucideIcon } from 'lucide-react'
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/constants'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid: '잘못된 로그인 요청입니다. 다시 시도해 주세요.',
  kakao_failed: '카카오 로그인에 실패했습니다. 다시 시도해 주세요.',
  kakao_unconfigured: '카카오 로그인이 아직 설정되지 않았습니다.',
  google_failed: '구글 로그인에 실패했습니다. 다시 시도해 주세요.',
  google_unconfigured: '구글 로그인이 아직 설정되지 않았습니다.',
  naver_failed: '네이버 로그인에 실패했습니다. 다시 시도해 주세요.',
  naver_unconfigured: '네이버 로그인이 아직 설정되지 않았습니다.',
}

// 가이드(매장 운영·성장·인사이트)에서 가져온 실제 기능을 핵심 가치로 노출한다.
const BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BarChart3,
    title: '매출·지출이 저절로 정리돼요',
    desc: '장부 없이도 이번 달 순이익이 한눈에 보여요',
  },
  {
    icon: CalendarClock,
    title: '픽업 시간을 놓치지 않아요',
    desc: '예약을 등록하면 픽업 전에 알림으로 챙겨드려요',
  },
  {
    icon: Sparkles,
    title: '사진 한 장이면 홍보 문구 완성',
    desc: 'AI가 가게 분위기에 맞는 SNS 문구를 만들어줘요',
  },
  {
    icon: Newspaper,
    title: '꽃 시세·지원사업까지 챙겨요',
    desc: '매일 경매 낙찰가와 소상공인 지원 소식을 모아줘요',
  },
]

/** flori 투톤 꽃 마크. tone='white'는 어두운 패널 위, 'color'는 밝은 배경용. */
function FloriMark({ size = 60, tone = 'color' }: { size?: number; tone?: 'color' | 'white' }) {
  const id = useId().replace(/:/g, '')
  const petals =
    tone === 'white'
      ? ['#ffffff', 'rgba(255,255,255,.78)', '#ffffff', 'rgba(255,255,255,.78)', 'rgba(255,255,255,.6)']
      : ['#A85475', '#E0739A', '#A85475', '#E0739A', '#8E3F5F']
  const coreOuter = tone === 'white' ? '#A85475' : '#ffffff'
  const coreInner = tone === 'white' ? '#ffffff' : '#A85475'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <path id={id} d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z" />
      </defs>
      <g transform="translate(0 3.5)">
        <use href={`#${id}`} fill={petals[0]} />
        <use href={`#${id}`} transform="rotate(72 50 50)" fill={petals[1]} />
        <use href={`#${id}`} transform="rotate(144 50 50)" fill={petals[2]} />
        <use href={`#${id}`} transform="rotate(216 50 50)" fill={petals[3]} />
        <use href={`#${id}`} transform="rotate(288 50 50)" fill={petals[4]} />
        <circle cx="50" cy="50" r="6" fill={coreOuter} />
        <circle cx="50" cy="50" r="3.2" fill={coreInner} />
      </g>
    </svg>
  )
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

const BTN_BASE =
  'relative flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function ReadyBadge({ className }: { className: string }) {
  return (
    <span
      className={`absolute right-3 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${className}`}
    >
      준비중
    </span>
  )
}

export function LoginForm({ available }: { available: SocialProviders }) {
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')
  const oauthMessage = oauthError ? OAUTH_ERROR_MESSAGES[oauthError] : null

  const buttons = (
    <div className="space-y-2.5">
      {/* 카카오 */}
      {available.kakao ? (
        // OAuth 개시 라우트(Route Handler, 302 리다이렉트)로의 전체 네비게이션 — next/link 아님.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/auth/login/kakao" className={`${BTN_BASE} hover:opacity-90`} style={{ backgroundColor: '#FEE500', color: '#191600' }}>
          <KakaoIcon className="size-[18px]" />
          카카오로 시작하기
        </a>
      ) : (
        <button
          type="button"
          onClick={() => toast.error('카카오 로그인은 준비 중입니다')}
          className={`${BTN_BASE} opacity-60 hover:opacity-70`}
          style={{ backgroundColor: '#FEE500', color: '#191600' }}
        >
          <KakaoIcon className="size-[18px]" />
          카카오로 시작하기
          <ReadyBadge className="bg-black/15 text-black/70" />
        </button>
      )}

      {/* 네이버 */}
      {available.naver ? (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/auth/login/naver" className={`${BTN_BASE} text-white hover:opacity-90`} style={{ backgroundColor: '#03C75A' }}>
          <NaverIcon className="h-4 w-4" />
          네이버로 시작하기
        </a>
      ) : (
        <button
          type="button"
          onClick={() => toast.error('네이버 로그인은 준비 중입니다')}
          className={`${BTN_BASE} text-white opacity-60 hover:opacity-70`}
          style={{ backgroundColor: '#03C75A' }}
        >
          <NaverIcon className="h-4 w-4" />
          네이버로 시작하기
          <ReadyBadge className="bg-white/25 text-white" />
        </button>
      )}

      {/* 구글 */}
      {available.google ? (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a
          href="/auth/login/google"
          className={`${BTN_BASE} border border-border bg-card text-foreground hover:opacity-90`}
        >
          <GoogleIcon className="size-[18px]" />
          구글로 시작하기
        </a>
      ) : (
        <button
          type="button"
          onClick={() => toast.error('구글 로그인은 준비 중입니다')}
          className={`${BTN_BASE} border border-border bg-card text-foreground opacity-60 hover:opacity-70`}
        >
          <GoogleIcon className="size-[18px]" />
          구글로 시작하기
          <ReadyBadge className="bg-muted text-muted-foreground" />
        </button>
      )}
    </div>
  )

  const trust = (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <span>무료로 시작</span>
      <span className="size-1 rounded-full bg-border" />
      <span>카드 등록 필요 없어요</span>
      <span className="size-1 rounded-full bg-border" />
      <span>30초면 끝</span>
    </div>
  )

  const legalLinkClass =
    'underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm'
  const legal = (
    <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
      시작하면 flori{' '}
      <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
        이용약관
      </a>
      과{' '}
      <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
        개인정보처리방침
      </a>
      에 동의하게 됩니다.
    </p>
  )

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ── 좌측 브랜드 스토리 패널 (데스크탑 전용) ── */}
      <aside
        className="relative hidden w-[46%] max-w-2xl shrink-0 flex-col justify-between overflow-hidden px-12 py-14 text-white lg:flex"
        style={{ background: 'linear-gradient(150deg, #8E3F5F 0%, #A85475 46%, #C56A8C 100%)' }}
      >
        {/* 장식용 글로우 */}
        <div className="pointer-events-none absolute -right-24 -bottom-28 size-80 rounded-full bg-white/[0.07]" />
        <div className="pointer-events-none absolute right-16 -top-16 size-44 rounded-full bg-white/[0.05]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <FloriMark size={34} tone="white" />
          <span
            className="font-display text-[26px] font-semibold leading-none"
            style={{ fontVariantLigatures: 'none', letterSpacing: '0.2rem' }}
          >
            flori<span className="text-white/60">.</span>
          </span>
        </div>

        <div className="relative z-10">
          <h2 className="text-[30px] font-bold leading-snug tracking-tight">
            꽃집 운영,
            <br />
            이제 가볍게 시작하세요.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            매출·지출·고객·예약부터 AI 마케팅까지.
            <br />
            사장님은 꽃에만 집중하세요, 번거로운 운영은 flori가 대신 챙길게요.
          </p>
        </div>

        <ul className="relative z-10 space-y-4">
          {BENEFITS.map(b => (
            <li key={b.title} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <b.icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-white">{b.title}</p>
                <p className="text-[13px] leading-snug text-white/75">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── 우측 로그인 패널 ── */}
      <main className="flex flex-1 items-center justify-center overflow-y-auto bg-background px-4 py-10">
        <div className="w-full max-w-sm space-y-7">
          {/* 모바일 브랜드 히어로 — 좌측 패널 대신 데스크탑과 동일한 로즈 그라데이션으로 통일감을 준다 */}
          <div
            className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl px-6 pb-7 pt-9 text-center text-white lg:hidden"
            style={{ background: 'linear-gradient(150deg, #8E3F5F 0%, #A85475 46%, #C56A8C 100%)' }}
          >
            <div className="pointer-events-none absolute -right-16 -top-14 size-36 rounded-full bg-white/[0.07]" />
            <FloriMark size={54} tone="white" />
            <div className="relative z-10">
              <h1
                className="font-display text-3xl font-semibold leading-none"
                style={{ fontVariantLigatures: 'none', letterSpacing: '0.2rem' }}
              >
                flori<span className="text-white/60">.</span>
              </h1>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/90">
                꽃에만 집중하세요.
                <br />
                운영은 flori가 챙길게요.
              </p>
            </div>
          </div>

          {/* 데스크탑 헤더 — 좌측이 브랜딩을 맡으므로 간결하게 */}
          <div className="hidden flex-col items-center gap-2.5 text-center lg:flex">
            <FloriMark size={48} />
            <div>
              <h2 className="text-[21px] font-bold text-foreground">3초 만에 시작하기</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                카카오·네이버·구글 계정으로 바로 시작해요.
                <br />
                따로 비밀번호를 만들 필요 없어요.
              </p>
            </div>
          </div>

          {/* OAuth 에러 (쿼리 파라미터) */}
          {oauthMessage && (
            <p className="text-center text-sm text-destructive" role="alert">
              {oauthMessage}
            </p>
          )}

          {buttons}
          {trust}
          {legal}
        </div>
      </main>
    </div>
  )
}
