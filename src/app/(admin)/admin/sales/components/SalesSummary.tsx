'use client';

import {formatCurrency} from '@/lib/utils';

interface SalesSummaryProps {
  summary: { total: number };
}

/** 매출 합계 금액만 표시. (기간 대비 증감%·결제수단 비율바는 통계/대시보드 개편 때 별도 부활 예정) */
export function SalesSummary({ summary }: SalesSummaryProps) {
  return (
    <p className="text-[28px] font-bold tracking-tight text-brand">{formatCurrency(summary.total)}</p>
  );
}
