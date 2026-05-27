'use client';

import {AlertCircle, ArrowUp, Flower2, Heart, RefreshCw} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

// TODO: replace with real data when AI/aggregation backend is ready
const MOCK_BRIEFING = {
  body: '지난주는 금요일이 정점이었어요. 어버이날 주간이라 카네이션 어레인지 문의가 평소보다 40% 많습니다. 오늘 픽업 2건과 미수 1건을 먼저 챙기는 걸 추천드려요.',
  suggestions: [
    {
      icon: AlertCircle,
      tone: 'danger' as const,
      text: '미수 1건 — 이도현 님 15만원, 회수 7일 경과',
    },
    {
      icon: RefreshCw,
      tone: 'warning' as const,
      text: '라넌큘러스 재고 소진 임박 — 발주 검토',
    },
    {
      icon: Heart,
      tone: 'brand' as const,
      text: 'VIP 김서연 님 90일 미방문 — 안부 메시지',
    },
  ] satisfies {icon: LucideIcon; tone: 'danger' | 'warning' | 'brand'; text: string}[],
  askPlaceholder: '이번 달 카드 수수료 얼마 나갔어? 라고 물어보세요…',
};

const TONE_TILE: Record<'danger' | 'warning' | 'brand', string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  brand: 'bg-brand-muted text-brand',
};

export function AiBriefingCard() {
  return (
    <section
      aria-label="Flori AI 오늘의 브리핑"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-brand-muted to-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] shadow-sm"
          style={{background: 'linear-gradient(135deg,#E89BB6,#D2789A)'}}
          aria-hidden="true"
        >
          <Flower2 className="h-[18px] w-[18px] text-white" />
        </span>
        <p className="text-sm font-bold tracking-tight text-foreground">
          <span className="text-brand">Flori AI</span> · 오늘의 브리핑
        </p>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
          <span
            className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse"
            style={{boxShadow: '0 0 0 4px var(--brand-muted)'}}
            aria-hidden="true"
          />
          실시간
        </span>
      </div>

      {/* Body */}
      <p className="mt-4 text-[14.5px] leading-[1.62] text-foreground">{MOCK_BRIEFING.body}</p>

      {/* Suggestions */}
      <ul className="mt-4 flex flex-col gap-2">
        {MOCK_BRIEFING.suggestions.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-[12.5px] text-foreground transition-colors hover:bg-muted"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${TONE_TILE[s.tone]}`}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1">{s.text}</span>
                <ArrowUp className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Ask input (visual only for now) */}
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
        <input
          type="text"
          disabled
          aria-label="Flori AI에게 질문하기"
          placeholder={MOCK_BRIEFING.askPlaceholder}
          className="flex-1 bg-transparent text-[13px] text-muted-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled
          aria-label="질문 보내기"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground disabled:cursor-not-allowed disabled:opacity-90"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
