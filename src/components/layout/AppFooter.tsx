import Link from 'next/link';

/**
 * 어드민 공통 푸터. 본문 하단에 가벼운 유틸 링크(가이드·정책·문의)를 모은다.
 * 메인 네비를 어지럽히지 않으면서 가이드/정책 진입점을 제공한다.
 */
export function AppFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-6 pb-2">
      <nav
        aria-label="푸터"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
      >
        <Link
          href="/admin/guide"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          사용 가이드
        </Link>
        <span aria-hidden="true" className="text-border">·</span>
        <Link
          href="/policy/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          개인정보 처리방침
        </Link>
        <span aria-hidden="true" className="text-border">·</span>
        <Link
          href="/policy/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          이용약관
        </Link>
        <span aria-hidden="true" className="text-border">·</span>
        {/* 버그 제보/문의 — 연결 대상 미정(추후 활성화) */}
        <span className="cursor-not-allowed text-muted-foreground/50" aria-disabled="true">
          버그 제보 · 문의
        </span>
        <span className="ml-auto text-muted-foreground/60">© flori</span>
      </nav>
    </footer>
  );
}
