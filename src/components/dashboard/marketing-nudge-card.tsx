import Link from 'next/link';
import {ArrowRight, PenLine, Sparkles} from 'lucide-react';

/**
 * 대시보드 'AI 블로그' 유도 카드.
 * 구 '오늘의 브리핑'(개발 중 잠금 티저)을 대체하며, 완성된
 * 네이버 검색 AI 블로그 글쓰기(/admin/marketing)로 자연스럽게 유도한다.
 */
export function MarketingNudgeCard() {
  return (
    <Link
      href="/admin/marketing"
      aria-label="네이버 검색 AI 블로그 글쓰기로 이동"
      className="group relative block overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-brand-muted to-card p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] shadow-sm"
          style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
          aria-hidden="true"
        >
          <PenLine className="h-[18px] w-[18px] text-white" />
        </span>
        <p className="text-sm font-bold tracking-tight text-foreground">
          <span className="text-brand">네이버 검색 AI</span> · 블로그 글쓰기
        </p>
        <span
          className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm"
          style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Premium
        </span>
      </div>

      {/* Body */}
      <p className="mt-4 text-[14.5px] leading-[1.62] text-foreground">
        오늘 만드신 꽃·예약·분위기로 <span className="font-semibold text-brand">네이버 블로그 초안</span>을 1분 만에.
        <br />
        네이버 AI 검색에 잘 걸리는 글, 플로리가 대신 써드릴게요.
      </p>

      {/* CTA */}
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-semibold text-brand-foreground shadow-sm transition-transform group-hover:translate-x-0.5">
        AI 블로그 쓰러 가기
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
