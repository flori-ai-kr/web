'use client';

import {useEffect, useState} from 'react';
import {ArrowUp, Flower2, Sparkles} from 'lucide-react';
import {getProactiveSuggestions} from '@/lib/actions/ai';
import type {AiSuggestion} from '@/types/ai';
import {openAiChat} from './ai-chat-launcher';

// 대시보드 상단 "오늘의 브리핑" — flori AI 선제 제안(D)을 실데이터로 표시한다.
// ai-briefing-card.tsx(프리미엄 teaser)의 디자인 토큰을 그대로 계승하되, 잠금 대신 실제 제안을 렌더.
// 제안 호출은 fail-open(서버 액션이 빈 배열 반환) — 비면 카드를 숨겨 대시보드가 깨지지 않게 한다.

export function AiBriefingLive() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [asked, setAsked] = useState('');

  useEffect(() => {
    let alive = true;
    getProactiveSuggestions()
      .then((s) => alive && setSuggestions(s))
      .catch(() => alive && setSuggestions([]));
    return () => {
      alive = false;
    };
  }, []);

  // 로딩 중이거나 제안이 없으면 카드를 렌더하지 않는다(잡음 최소화). 단 "물어보기"는 항상 제공하려고
  // 로딩 동안에는 스켈레톤을 보여준다.
  const loading = suggestions === null;
  const hasSuggestions = !loading && suggestions.length > 0;

  function ask(prefill?: string) {
    openAiChat(prefill);
  }

  return (
    <section
      aria-label="flori AI 오늘의 브리핑"
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
          <span className="text-brand">flori AI</span> · 오늘의 브리핑
        </p>
      </div>

      {/* 제안 리스트 */}
      <div className="mt-4">
        {loading ? (
          <ul className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[46px] animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </ul>
        ) : hasSuggestions ? (
          <ul className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => ask(`"${s.title}"에 대해 더 자세히 알려줘`)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors duration-150 hover:border-brand hover:bg-brand-muted/40"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-[12.5px] leading-snug text-foreground">
                    <span className="font-semibold">{s.title}</span>
                    {s.detail ? <span className="text-muted-foreground"> · {s.detail}</span> : null}
                  </span>
                  <ArrowUp className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-[12.5px] text-muted-foreground">
            오늘은 특별히 챙길 거리가 없어요. 궁금한 걸 물어보세요.
          </p>
        )}

        {/* 물어보기 입력 — 클릭/제출 시 채팅 드로어 오픈 */}
        <form
          className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-brand"
          onSubmit={(e) => {
            e.preventDefault();
            ask(asked.trim() || undefined);
            setAsked('');
          }}
        >
          <input
            value={asked}
            onChange={(e) => setAsked(e.target.value)}
            placeholder="이번 달 매출 왜 떨어졌어? 라고 물어보세요…"
            aria-label="flori AI에게 질문"
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            aria-label="질문하기"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground transition-opacity duration-150 hover:opacity-90"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </section>
  );
}
