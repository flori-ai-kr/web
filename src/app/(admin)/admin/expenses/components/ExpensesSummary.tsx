'use client';

import {formatCurrency} from '@/lib/utils';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {TrendingUp, TrendingDown} from 'lucide-react';
import type {ExpenseCategorySlice} from '@/lib/actions/expenses';
import type {ExpenseCategory} from '@/lib/actions/expense-settings';

interface ExpensesSummaryProps {
  summary: {
    total: number;
    count: number;
    byCategory: ExpenseCategorySlice[];
  };
  categories: ExpenseCategory[];
  prevTotal?: number;
  prevPeriod?: { startDate: string; endDate: string };
}

/** "2026-06-06" → "2026.06.06" */
function fmtDot(d: string): string {
  return d.replaceAll('-', '.');
}

// 카테고리 색이 없을 때 쓰는 폴백 팔레트(지출 톤).
const FALLBACK_COLORS = ['#C2683F', '#D89A6A', '#E0B894', '#9AA0A6', '#7C8590', '#B0894F'];

export function ExpensesSummary({ summary, categories, prevTotal, prevPeriod }: ExpensesSummaryProps) {
  const colorById = new Map(categories.map(c => [c.id, c.color]));

  const segments = summary.byCategory
    .filter(s => s.amount > 0)
    .map((s, i) => ({
      key: s.category_id ?? `none-${i}`,
      label: s.category_label,
      value: s.amount,
      color: (s.category_id && colorById.get(s.category_id)) || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
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
      {/* 데스크탑: 금액·증감%·기간 한 줄 / 모바일: 금액만 위, 증감%·기간은 아래 줄로 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
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
      {segments.length > 0 && (
        <TooltipProvider delayDuration={0}>
          <div className="flex w-full h-3 rounded-full overflow-hidden gap-0.5 mt-3">
            {segments.map(seg => (
              <Tooltip key={seg.key}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full rounded-full cursor-default hover:opacity-80 transition-opacity"
                    style={{
                      width: `${Math.max((seg.value / total) * 100, 2)}%`,
                      backgroundColor: seg.color,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {seg.label} {formatCurrency(seg.value)} ({Math.round((seg.value / total) * 100)}%)
                </TooltipContent>
              </Tooltip>
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
