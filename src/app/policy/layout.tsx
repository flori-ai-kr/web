import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * flori 정책 문서 전용 레이아웃 (개인정보 처리방침 · 이용약관).
 *
 * 헤이즐 공개 사이트의 `(public)` 레이아웃과 무관한 독립 라우트로,
 * 로그인/회원가입과 동일한 flori 브랜드 톤(로고 + 「flori」)을 사용한다.
 * 색상은 전부 globals.css 토큰 기반 → 다크모드 자동 대응(루트 ThemeProvider 상속).
 */
export default function PolicyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {/* 상단 바: 로고 + 앱/홈 복귀 링크 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="flori 홈으로 이동"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted">
              <Image src="/flori-logo.png" alt="" width={22} height={22} className="object-contain" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">flori</span>
          </Link>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>돌아가기</span>
          </Link>
        </div>
      </header>

      {/* 본문: 가독성 폭 + 넉넉한 행간 + 모바일 패딩 */}
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  )
}
