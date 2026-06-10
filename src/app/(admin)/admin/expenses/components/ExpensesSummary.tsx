'use client';

import {formatCurrency} from '@/lib/utils';

interface ExpensesSummaryProps {
  summary: { total: number };
}

/** 지출 합계 금액만 표시. (기간 대비 증감%·카테고리 비율바는 통계/대시보드 개편 때 별도 부활 예정) */
export function ExpensesSummary({ summary }: ExpensesSummaryProps) {
  return (
    <p className="text-[28px] font-bold tracking-tight text-brand">{formatCurrency(summary.total)}</p>
  );
}
