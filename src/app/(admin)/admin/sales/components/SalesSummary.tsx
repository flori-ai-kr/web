'use client';

import {useState} from 'react';
import {formatCurrency} from '@/lib/utils';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {TrendingUp, TrendingDown} from 'lucide-react';

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

interface SalesSummaryProps {
  summary: {
    total: number;
    card: number;
    naverpay: number;
    transfer: number;
    cash: number;
  };
  label?: string;
  prevTotal?: number;
  prevPeriod?: { startDate: string; endDate: string };
}

/** "2026-06-06" → "2026.06.06" */
function fmtDot(d: string): string {
  return d.replaceAll('-', '.');
}

const BREAKDOWN_CONFIG = [
  { key: 'card' as const, label: '카드', color: '#93c5fd' },
  { key: 'naverpay' as const, label: '네이버페이', color: '#86efac' },
  { key: 'transfer' as const, label: '계좌이체', color: '#c4b5fd' },
  { key: 'cash' as const, label: '현금', color: '#fcd34d' },
];

export function SalesSummary({ summary, label = '이번 달 매출', prevTotal, prevPeriod }: SalesSummaryProps) {
  const segments = BREAKDOWN_CONFIG
    .map(cfg => ({ ...cfg, value: summary[cfg.key] }))
    .filter(s => s.value > 0);

  const total = summary.total || 1;

  const hasPrev = prevTotal != null;
  const changePercent = hasPrev && prevTotal! > 0
    ? Math.round(((summary.total - prevTotal!) / prevTotal!) * 100)
    : null;
  // 전일/전기간 매출이 0인데 이번엔 매출이 있으면 % 대신 '신규'로 표기(0으로 나눌 수 없음)
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
              <span className={`inline-flex items-center gap-0.5 text-sm font-semibold whitespace-nowrap shrink-0 ${changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {changePercent >= 0 ? (
                  <TrendingUp className="w-4 h-4 shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 shrink-0" />
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
            {segments.map(seg => (
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
