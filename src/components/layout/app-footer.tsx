import Link from 'next/link';
import {BookOpen, FileText, MessageCircle, ShieldCheck} from 'lucide-react';
import {PRIVACY_POLICY_URL, TERMS_URL} from '@/lib/constants';

/**
 * 어드민 공통 푸터. 본문 하단(짧은 페이지에선 화면 바닥)에 구분선과 함께 붙는다.
 * 가벼운 유틸 링크(가이드·정책·문의)를 픽토그램과 함께 모으되 메인 네비를 어지럽히지 않는다.
 */
export function AppFooter() {
  const linkClass =
    'inline-flex items-center gap-1.5 font-medium text-foreground/80 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

  return (
    <footer className="mt-8 border-t border-border pt-4">
      <nav
        aria-label="푸터"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
      >
        <Link href="/admin/guide" className={linkClass}>
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          이용 가이드
        </Link>
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          개인정보 처리방침
        </a>
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          이용약관
        </a>
        <Link href="/admin/support" className={linkClass}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          고객센터
        </Link>
        <span className="ml-auto text-xs text-muted-foreground/70">© flori</span>
      </nav>
    </footer>
  );
}
