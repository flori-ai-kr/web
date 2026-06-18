'use client';

import {cn} from '@/lib/utils';

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  /** 카테고리 도트 색 (선택) */
  dotColor?: string;
  /** 앞에 붙는 글리프(예: 🔖) */
  glyph?: string;
}

/**
 * 트렌드·지원사업 탭 공용 필터 칩 (= mockup .pill.subpill).
 * 활성 시 brand 배경, 비활성 시 카드 배경 + hairline.
 */
export function FilterPill({active, onClick, label, count, dotColor, glyph}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-border bg-card text-foreground hover:border-brand/50',
      )}
    >
      {dotColor && !active && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{backgroundColor: dotColor}}
          aria-hidden
        />
      )}
      {glyph && <span aria-hidden>{glyph}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn('text-xs tabular-nums', active ? 'opacity-80' : 'text-muted-foreground')}>
          {count}
        </span>
      )}
    </button>
  );
}
