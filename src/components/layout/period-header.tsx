'use client';

import type { CustomRange } from '@/lib/period-range';
import { PeriodNavBar } from './period-nav-bar';

/**
 * 월 네비 + 기간 셀렉터 헤더 (고객·사진첩 공용). 공용 PeriodNavBar 위에 CustomRange API 래퍼.
 */
export function PeriodHeader({
  periodYear,
  periodMonth,
  customRange,
  onMonthNav,
  onMonthSelect,
  onRangeApply,
  onRangeReset,
}: {
  periodYear: number;
  periodMonth: number;
  customRange: CustomRange | null;
  onMonthNav: (direction: -1 | 1) => void;
  onMonthSelect: (year: number, month: number) => void;
  onRangeApply: (range: CustomRange) => void;
  onRangeReset: () => void;
}) {
  return (
    <PeriodNavBar
      periodYear={periodYear}
      periodMonth={periodMonth}
      monthLabel={`${periodYear}년 ${periodMonth}월`}
      appliedRange={customRange}
      onMonthNav={onMonthNav}
      onMonthSelect={onMonthSelect}
      onRangeApply={(start, end) => onRangeApply({ start, end })}
      onRangeReset={onRangeReset}
    />
  );
}
