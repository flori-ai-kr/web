import Link from 'next/link';

/**
 * 어드민 공통 푸터. 본문 하단(짧은 페이지에선 화면 바닥)에 구분선과 함께 붙는다.
 * 가벼운 유틸 링크(가이드·정책·문의)를 모으되 메인 네비를 어지럽히지 않는다.
 */
export function AppFooter() {
  return (
    <footer className="mt-8 border-t border-border pt-4">
      <nav
        aria-label="푸터"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
      >
        <Link
          href="/admin/guide"
          className="font-medium text-foreground/80 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          사용 가이드
        </Link>
        <span aria-hidden="true" className="text-border">·</span>
        <Link
          href="/policy/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/80 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          개인정보 처리방침
        </Link>
        <span aria-hidden="true" className="text-border">·</span>
        <Link
          href="/policy/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/80 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          이용약관
        </Link>
        <span aria-hidden="true" className="text-border">·</span>
        {/* 버그 제보/문의 — 연결 대상 미정(추후 활성화) */}
        <span className="cursor-not-allowed text-muted-foreground/50" aria-disabled="true">
          버그 제보 · 문의
        </span>
        <span className="ml-auto text-xs text-muted-foreground/70">© flori</span>
      </nav>
    </footer>
  );
}
