'use client';

import {formatCurrency} from '@/lib/utils';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {TrendingUp, TrendingDown} from 'lucide-react';

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
      <div className="flex items-center gap-3">
        <p className="text-[28px] font-bold tracking-tight text-brand">{formatCurrency(summary.total)}</p>
        {changePercent !== null && (
          <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {changePercent >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {changePercent >= 0 ? '+' : ''}{changePercent}%
          </span>
        )}
        {isNew && (
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-red-500">
            <TrendingUp className="w-4 h-4" />
            신규
          </span>
        )}
        {showComparison && prevPeriod && (
          <span className="text-[11px] text-muted-foreground">
            {prevPeriod.startDate === prevPeriod.endDate
              ? `${fmtDot(prevPeriod.startDate)} 대비`
              : `${fmtDot(prevPeriod.startDate)} ~ ${fmtDot(prevPeriod.endDate)} 대비`}
          </span>
        )}
      </div>
      {segments.length > 0 && (
        <TooltipProvider delayDuration={0}>
          <div className="flex w-full h-3 rounded-full overflow-hidden gap-0.5">
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
