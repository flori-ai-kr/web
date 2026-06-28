'use client';

import {RotateCcw} from 'lucide-react';

/**
 * 검색바 우측 초기화 버튼 (매출·지출/고객 필터바와 동일 스타일).
 * 검색어가 있을 때만 노출하는 용도 — 호출부에서 조건부 렌더한다.
 */
export function SearchResetButton({onClick}: {onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="검색 초기화"
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      <RotateCcw className="h-3 w-3" aria-hidden />
      초기화
    </button>
  );
}
