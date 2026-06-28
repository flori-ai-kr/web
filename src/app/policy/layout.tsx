import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * flori admin 정책 문서 전용 레이아웃 (이용약관 · 개인정보 처리방침 · 마케팅 수신 동의).
 *
 * `/policy/*` 는 (admin)/(console) 그룹 밖의 공개 라우트로, 미들웨어가 자동 통과시킨다.
 * 가입 동의 화면의 "보기" 링크가 홈페이지로 튕기지 않고 admin 내부에서 바로 뜨도록 둔다.
 * 색상은 전부 globals.css 시맨틱 토큰 기반 → 다크모드 자동 대응(루트 ThemeProvider 상속).
 * 내용은 홈페이지 flori.ai.kr 의 정책과 동일하게 동기화한다(legal SSOT).
 */
export default function PolicyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {/* 상단 바: 로고 + 홈 복귀 링크 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="flori 홈으로 이동"
          >
            <svg viewBox="0 0 100 100" width={28} height={28} aria-hidden="true">
              <defs>
                <path
                  id="policy-petal"
                  d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z"
                />
              </defs>
              <g transform="translate(0 3.5)">
                <use href="#policy-petal" fill="#A85475" />
                <use href="#policy-petal" transform="rotate(72 50 50)" fill="#E0739A" />
                <use href="#policy-petal" transform="rotate(144 50 50)" fill="#A85475" />
                <use href="#policy-petal" transform="rotate(216 50 50)" fill="#E0739A" />
                <use href="#policy-petal" transform="rotate(288 50 50)" fill="#8E3F5F" />
                <circle cx="50" cy="50" r="6" fill="#ffffff" />
                <circle cx="50" cy="50" r="3.2" fill="#A85475" />
              </g>
            </svg>
            <span
              className="font-display text-foreground"
              style={{ fontSize: '26px', fontWeight: 600, fontVariantLigatures: 'none', letterSpacing: '0.14rem' }}
            >
              flori<span className="text-brand">.</span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>홈으로</span>
          </Link>
        </div>
      </header>

      {/* 본문: 가독성 폭 + 넉넉한 행간 + 모바일 패딩 */}
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  )
}
