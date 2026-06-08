'use client';

import {useState, type ReactNode} from 'react';
import {formatCurrency} from '@/lib/utils';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {TrendingUp, TrendingDown} from 'lucide-react';
import type {ExpenseCategorySlice} from '@/lib/actions/expenses';

/** breakdown 막대 한 칸 — 데스크탑 호버 + 모바일 탭(클릭 토글) 모두 지원. */
function BarSegment({ widthPct, color, label, value, pct }: {
  widthPct: number; color: string; label: string; value: string; pct: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-full rounded-full hover:opacity-80 transition-opacity"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
          aria-label={`${label} ${value} (${pct}%)`}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label} {value} ({pct}%)
      </TooltipContent>
    </Tooltip>
  );
}

interface ExpensesSummaryProps {
  summary: {
    total: number;
    count: number;
    byCategory: ExpenseCategorySlice[];
  };
  prevTotal?: number;
  prevPeriod?: { startDate: string; endDate: string };
  rightSlot?: ReactNode;
}

/** "2026-06-06" → "2026.06.06" */
function fmtDot(d: string): string {
  return d.replaceAll('-', '.');
}

// 카테고리 색상은 제거됨 — 비중바는 인덱스 기반 팔레트(지출 톤)로 칠한다.
const FALLBACK_COLORS = ['#C2683F', '#D89A6A', '#E0B894', '#9AA0A6', '#7C8590', '#B0894F'];

export function ExpensesSummary({ summary, prevTotal, prevPeriod, rightSlot }: ExpensesSummaryProps) {
  const segments = summary.byCategory
    .filter(s => s.amount > 0)
    .map((s, i) => ({
      key: s.category_id ?? `none-${i}`,
      label: s.category_label,
      value: s.amount,
      color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));

  const total = summary.total || 1;

  const hasPrev = prevTotal != null;
  const changePercent = hasPrev && prevTotal! > 0
    ? Math.round(((summary.total - prevTotal!) / prevTotal!) * 100)
    : null;
  const isNew = hasPrev && prevTotal === 0 && summary.total > 0;
  const showComparison = changePercent !== null || isNew;

  return (
    <div>
      {/* 금액 줄 — 오른쪽에 탭 세그먼트(rightSlot) */}
      <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
        <p className="text-[28px] font-bold tracking-tight text-brand">{formatCurrency(summary.total)}</p>
        {showComparison && (
          <div className="flex items-center gap-3 mt-1 sm:mt-0">
            {changePercent !== null && (
              <span className={`inline-flex items-center gap-0.5 text-sm font-semibold whitespace-nowrap shrink-0 ${changePercent <= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {changePercent <= 0 ? (
                  <TrendingDown className="w-4 h-4 shrink-0" />
                ) : (
                  <TrendingUp className="w-4 h-4 shrink-0" />
                )}
                {changePercent >= 0 ? '+' : ''}{changePercent}%
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-red-500 whitespace-nowrap shrink-0">
                <TrendingUp className="w-4 h-4 shrink-0" />
                신규
              </span>
            )}
            {prevPeriod && (
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {prevPeriod.startDate === prevPeriod.endDate
                  ? `${fmtDot(prevPeriod.startDate)} 대비`
                  : `${fmtDot(prevPeriod.startDate)} ~ ${fmtDot(prevPeriod.endDate)} 대비`}
              </span>
            )}
          </div>
        )}
      </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
      {segments.length > 0 && (
        <TooltipProvider delayDuration={0}>
          <div className="flex w-full h-3 rounded-full overflow-hidden gap-0.5 mt-3">
            {segments.map(seg => (
              <BarSegment
                key={seg.key}
                widthPct={Math.max((seg.value / total) * 100, 2)}
                color={seg.color}
                label={seg.label}
                value={formatCurrency(seg.value)}
                pct={Math.round((seg.value / total) * 100)}
              />
            ))}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {segments.slice(0, 6).map(seg => (
              <span key={seg.key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
