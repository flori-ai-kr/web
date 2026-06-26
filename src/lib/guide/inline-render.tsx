import type { ReactNode } from 'react';
import Link from 'next/link';
import { parseInline } from './inline';

// 인라인 토큰을 JSX로 변환. 내부 링크(/로 시작)는 next/link, 외부는 새 탭.
export function renderInline(text: string): ReactNode[] {
  return parseInline(text).map((token, i) => {
    if (token.kind === 'bold') {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {token.value}
        </strong>
      );
    }
    if (token.kind === 'link') {
      const className =
        'font-medium text-brand underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';
      if (token.href.startsWith('/')) {
        return (
          <Link key={i} href={token.href} className={className}>
            {token.label}
          </Link>
        );
      }
      return (
        <a key={i} href={token.href} target="_blank" rel="noopener noreferrer" className={className}>
          {token.label}
        </a>
      );
    }
    return <span key={i}>{token.value}</span>;
  });
}
