'use client';

import {useCallback, useMemo} from 'react';
import {useRouter} from 'next/navigation';

import type {SalesFilters} from '@/lib/actions/sales';

/**
 * 매출 목록 URL 필터(년/월/일 + 카테고리·결제·채널 다중선택) 상태와 내비 핸들러. sales-client에서 이동.
 * 필터는 URL 파라미터 기반(서버 쿼리에 적용됨).
 */
export function useSalesUrlFilters({
  currentYear,
  currentMonth,
  currentDay,
  dateRange,
  initialFilters,
}: {
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  /** 커스텀 기간(시작~종료)이 활성이면 전달 — 필터 변경 시 기간이 풀리지 않도록 보존. */
  dateRange: { startDate: string; endDate: string } | null;
  initialFilters: SalesFilters;
}) {
  const router = useRouter();
  const paymentFilter: string[] = useMemo(() => initialFilters.payment ?? [], [initialFilters.payment]);
  const categoryFilter: string[] = useMemo(() => initialFilters.category ?? [], [initialFilters.category]);
  const channelFilter: string[] = useMemo(() => initialFilters.channel ?? [], [initialFilters.channel]);

  const yearParam = currentYear === 0 ? 'all' : currentYear.toString();
  const monthParam = currentMonth === 0 ? 'all' : currentMonth.toString();
  const dayParam = currentDay === 0 ? 'all' : currentDay.toString();

  // URL 빌드 헬퍼: 'all' 값이면 파라미터 생략. category/payment/channel은 쉼표 구분 다중값.
  // 커스텀 기간(dateRange)이 활성인 상태에서 기간 외 필터만 바꾸면(월/일 override 없음)
  // startDate/endDate를 보존한다 — 카테고리·결제·채널 변경 시 기간이 풀리던 버그 방지.
  // (월 네비/월 선택/오늘 등 기간 자체를 바꾸는 호출은 year/month/day override를 주므로 자연히 기간 모드로 전환된다.)
  const buildUrl = useCallback((overrides: {
    year?: string; month?: string; day?: string;
    category?: string[]; payment?: string[]; channel?: string[];
  } = {}) => {
    const changingPeriod = overrides.year !== undefined || overrides.month !== undefined || overrides.day !== undefined;
    const p = {
      year: yearParam,
      month: monthParam,
      day: dayParam,
      category: categoryFilter,
      payment: paymentFilter,
      channel: channelFilter,
      ...overrides,
    };
    // 년/월이 'all'이면 일은 자동 'all'
    if (p.year === 'all' || p.month === 'all') p.day = 'all';
    const params = new URLSearchParams();
    if (dateRange && !changingPeriod) {
      params.set('startDate', dateRange.startDate);
      params.set('endDate', dateRange.endDate);
    } else {
      params.set('year', p.year);
      params.set('month', p.month);
      if (p.day !== 'all') params.set('day', p.day);
    }
    if (p.category.length > 0) params.set('category', p.category.join(','));
    if (p.payment.length > 0) params.set('payment', p.payment.join(','));
    if (p.channel.length > 0) params.set('channel', p.channel.join(','));
    return `/admin/sales?${params.toString()}`;
  }, [yearParam, monthParam, dayParam, categoryFilter, paymentFilter, channelFilter, dateRange]);

  const handleTodayOnly = () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString();
    const d = now.getDate().toString();
    // 이미 오늘이면 해제 (이번 달 전체로)
    if (currentDay === now.getDate() && currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()) {
      router.push(buildUrl({ day: 'all' }));
    } else {
      router.push(buildUrl({ year: y, month: m, day: d }));
    }
  };

  const handleMonthNav = (direction: -1 | 1) => {
    let y = currentYear || new Date().getFullYear();
    let m = currentMonth || new Date().getMonth() + 1;
    m += direction;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    router.push(buildUrl({ year: y.toString(), month: m.toString(), day: 'all' }));
  };

  const handleMonthSelect = (year: number, month: number) => {
    router.push(buildUrl({ year: year.toString(), month: month.toString(), day: 'all' }));
  };

  const handleDateRangeApply = (startDate: string, endDate: string) => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (categoryFilter.length > 0) params.set('category', categoryFilter.join(','));
    if (paymentFilter.length > 0) params.set('payment', paymentFilter.join(','));
    if (channelFilter.length > 0) params.set('channel', channelFilter.join(','));
    router.push(`/admin/sales?${params.toString()}`);
  };

  const handleCategoryChange = (category: string[]) => {
    router.push(buildUrl({ category }));
  };

  const handlePaymentChange = (payment: string[]) => {
    router.push(buildUrl({ payment }));
  };

  const handleChannelChange = (channel: string[]) => {
    router.push(buildUrl({ channel }));
  };

  /** 카테고리·결제·채널 URL 필터 초기화(검색어 등 로컬 상태는 호출부에서 함께 리셋). */
  const resetUrlFilters = () => {
    router.push(buildUrl({ category: [], payment: [], channel: [] }));
  };

  return {
    categoryFilter,
    paymentFilter,
    channelFilter,
    handleTodayOnly,
    handleMonthNav,
    handleMonthSelect,
    handleDateRangeApply,
    handleCategoryChange,
    handlePaymentChange,
    handleChannelChange,
    resetUrlFilters,
  };
}
