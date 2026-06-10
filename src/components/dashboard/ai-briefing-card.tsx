'use client';

import {useEffect, useRef, useState} from 'react';
import {AlertCircle, ArrowUp, Flower2, Heart, Lock, RefreshCw} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

// TODO: replace with real data when AI/aggregation backend is ready (프리미엄 기능)
const MOCK_BRIEFING = {
  // 잠금 영역 위에서 "AI가 답변 중"처럼 흘러나오는 teaser 문장들 (순환 타이핑)
  typingLines: [
    '지난주는 금요일이 정점이었어요. 어버이날 주간이라 카네이션 문의가 40% 늘었어요.',
    '오늘 픽업 2건과 미수 1건을 먼저 챙기는 걸 추천드려요.',
    '라넌큘러스 재고가 곧 소진돼요. 발주를 검토해 보세요.',
  ],
  suggestions: [
    {icon: AlertCircle, tone: 'danger' as const, text: '미수 1건 — 이도현 님 15만원, 회수 7일 경과'},
    {icon: RefreshCw, tone: 'warning' as const, text: '라넌큘러스 재고 소진 임박 — 발주 검토'},
    {icon: Heart, tone: 'brand' as const, text: 'VIP 김서연 님 90일 미방문 — 안부 메시지'},
  ] satisfies {icon: LucideIcon; tone: 'danger' | 'warning' | 'brand'; text: string}[],
  askPlaceholder: '이번 달 카드 수수료 얼마 나갔어? 라고 물어보세요…',
};

const TONE_TILE: Record<'danger' | 'warning' | 'brand', string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  brand: 'bg-brand-muted text-brand',
};

/**
 * "AI가 실시간으로 답변 중"처럼 보이는 타이핑 애니메이션 (teaser용).
 * setTimeout 체인 1개만 사용(초경량). prefers-reduced-motion이면 첫 줄을 정적으로 표시.
 */
function TypingBriefing({lines}: {lines: string[]}) {
  const [display, setDisplay] = useState(lines[0] ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 모션 최소화 사용자: 초기 state(첫 줄)를 그대로 정적 표시 (애니메이션 없음).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let cancelled = false;
    let line = 0;
    let char = 0;
    let deleting = false;

    const schedule = (ms: number) => {
      timerRef.current = setTimeout(tick, ms);
    };

    const tick = () => {
      if (cancelled) return;
      const current = lines[line] ?? '';
      if (!deleting) {
        char += 1;
        setDisplay(current.slice(0, char));
        if (char >= current.length) {
          deleting = true;
          schedule(1900); // 완성 후 잠시 멈춤
          return;
        }
        schedule(38);
      } else {
        char -= 1;
        setDisplay(current.slice(0, Math.max(0, char)));
        if (char <= 0) {
          deleting = false;
          line = (line + 1) % lines.length;
          schedule(450);
          return;
        }
        schedule(16);
      }
    };

    // 첫 타이핑 직전 화면을 비운다 — effect 본문이 아닌 타이머 콜백 안에서 setState하여
    // 동기 setState로 인한 cascading render 경고를 피한다.
    timerRef.current = setTimeout(() => {
      if (cancelled) return;
      setDisplay('');
      schedule(150);
    }, 300);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lines]);

  return (
    <>
      {display}
      <span
        className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.12em] bg-brand motion-safe:animate-pulse"
        aria-hidden="true"
      />
    </>
  );
}

export function AiBriefingCard() {
  return (
    <section
      aria-label="flori AI 오늘의 브리핑 — 개발 중인 기능"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-brand-muted to-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] shadow-sm"
          style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
          aria-hidden="true"
        >
          <Flower2 className="h-[18px] w-[18px] text-white" />
        </span>
        <p className="text-sm font-bold tracking-tight text-foreground">
          <span className="text-brand">flori AI</span> · 오늘의 브리핑
        </p>
        {/* 개발 중 배지 */}
        <span className="ml-auto flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand">
          <Lock className="h-3 w-3" aria-hidden="true" />
          개발 중
        </span>
      </div>

      {/* Body — 동적 타이핑 teaser (실제 답변하는 것처럼) */}
      <p
        className="mt-4 min-h-[3.25em] text-[14.5px] leading-[1.62] text-foreground"
        aria-hidden="true"
      >
        <TypingBriefing lines={MOCK_BRIEFING.typingLines} />
      </p>

      {/* 잠긴 영역: 제안 + 입력 (blur 미리보기 + 프리미엄 오버레이) */}
      <div className="relative mt-4">
        <div className="pointer-events-none select-none blur-[3px] opacity-45" aria-hidden="true">
          <ul className="flex flex-col gap-2">
            {MOCK_BRIEFING.suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={i}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-[12.5px] text-foreground"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${TONE_TILE[s.tone]}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">{s.text}</span>
                  <ArrowUp className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground" />
                </li>
              );
            })}
          </ul>

          <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
            <span className="flex-1 text-[13px] text-muted-foreground">{MOCK_BRIEFING.askPlaceholder}</span>
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* 잠금 오버레이 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-brand"
            aria-hidden="true"
          >
            <Lock className="h-4 w-4" />
          </span>
          <p className="text-[13px] font-semibold text-foreground">아직 개발 중인 기능이에요</p>
          <p className="text-xs leading-snug text-muted-foreground">
            flori AI가 매출·재고·고객을 매일 브리핑해요
            <br />
            <span className="text-brand">곧 만나요</span>
          </p>
        </div>
      </div>
    </section>
  );
}
