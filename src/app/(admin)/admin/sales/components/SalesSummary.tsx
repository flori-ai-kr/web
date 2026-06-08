'use client';

import {formatCurrency} from '@/lib/utils';
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

export function SalesSummary({ summary, prevTotal, prevPeriod }: SalesSummaryProps) {
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
    </div>
  );
}
