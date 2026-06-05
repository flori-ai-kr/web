import type {SalesFilters} from '@/lib/actions/sales';
import {getSaleById, getSales, getSalesSummary} from '@/lib/actions/sales';
import {getPaymentMethods, getSaleCategories, getSaleChannels} from '@/lib/actions/sale-settings';
import {SalesClient} from './sales-client';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    day?: string;
    startDate?: string;
    endDate?: string;
    saleId?: string;
    category?: string;
    payment?: string;
    channel?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // "all"이면 전체 조회, 아니면 특정 년/월/일
  const isAllYear = params.year === 'all';
  const isAllMonth = params.month === 'all';
  const isAllDay = !params.day || params.day === 'all';
  const currentYear = isAllYear ? 0 : (params.year ? parseInt(params.year, 10) : now.getFullYear());
  const currentMonth = isAllMonth ? 0 : (params.month ? parseInt(params.month, 10) : now.getMonth() + 1);

  // day는 1~31 정수만 허용. NaN/범위 밖이면 0(전체)로 폴백.
  // year/month가 'all'이면 day는 의미 없으므로 강제 0.
  const parsedDay = isAllDay ? 0 : parseInt(params.day!, 10);
  const currentDay = (isAllYear || isAllMonth || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)
    ? 0
    : parsedDay;

  // 기간 범위 모드 (startDate/endDate URL 파라미터) — 형식 검증 후 사용(YYYY-MM-DD)
  const isValidDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const rangeStart = isValidDate(params.startDate) ? params.startDate! : null;
  const rangeEnd = isValidDate(params.endDate) ? params.endDate! : null;
  const hasDateRange = !!(rangeStart && rangeEnd && rangeEnd >= rangeStart);
  const dateRange = hasDateRange ? { startDate: rangeStart!, endDate: rangeEnd! } : undefined;

  // getSales 파라미터: "YYYY-MM-DD" (특정일), "YYYY-MM" (특정월), "YYYY" (1년), undefined (전체)
  let monthParam: string | undefined;
  if (hasDateRange) {
    monthParam = undefined; // dateRange 모드에서는 month 사용 안 함
  } else if (isAllYear) {
    monthParam = undefined; // 전체
  } else if (isAllMonth) {
    monthParam = currentYear.toString(); // 년도만 (1년치)
  } else if (currentDay === 0) {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  } else {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  }

  // 서버사이드 필터 (category/payment/channel 모두 쉼표 구분 다중값)
  const parseMulti = (raw?: string) =>
    raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const categoryParam = parseMulti(params.category);
  const paymentParam = parseMulti(params.payment);
  const channelParam = parseMulti(params.channel);
  const filters: SalesFilters = {
    category: categoryParam.length > 0 ? categoryParam : undefined,
    payment: paymentParam.length > 0 ? paymentParam : undefined,
    channel: channelParam.length > 0 ? channelParam : undefined,
  };

  // 이전 동일 길이 기간 비교
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let prevDateRange: { startDate: string; endDate: string } | undefined;

  if (hasDateRange) {
    // 기간 범위 모드: 선택 기간과 동일 길이의 직전 기간
    const start = new Date(params.startDate!);
    const end = new Date(params.endDate!);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1);
    prevDateRange = { startDate: fmt(prevStart), endDate: fmt(prevEnd) };
  } else if (!isAllYear && !isAllMonth && currentDay > 0) {
    // 특정 일자 → 전일 비교
    const target = new Date(currentYear, currentMonth - 1, currentDay);
    const prev = new Date(target); prev.setDate(prev.getDate() - 1);
    prevDateRange = { startDate: fmt(prev), endDate: fmt(prev) };
  } else if (!isAllYear && !isAllMonth) {
    // 월 조회 → 이전 달 비교
    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    const prevEnd = new Date(currentYear, currentMonth - 1, 0);
    prevDateRange = { startDate: fmt(prevDate), endDate: fmt(prevEnd) };
  }

  const [salesResult, summary, prevSummary, categories, payments, channels, initialSelectedSale] = await Promise.all([
    getSales(monthParam, 0, 100, filters, dateRange),
    getSalesSummary(monthParam, filters, dateRange),
    prevDateRange ? getSalesSummary(undefined, undefined, prevDateRange) : Promise.resolve(null),
    getSaleCategories(),
    getPaymentMethods(),
    getSaleChannels(),
    params.saleId ? getSaleById(params.saleId) : Promise.resolve(null),
  ]);

  return (
    <SalesClient
      initialSales={salesResult.sales}
      initialHasMore={salesResult.hasMore}
      initialSummary={summary}
      prevTotal={prevSummary?.total ?? null}
      monthParam={monthParam ?? null}
      currentYear={currentYear}
      currentMonth={currentMonth}
      currentDay={currentDay}
      initialFilters={filters}
      initialCategories={categories}
      initialPayments={payments}
      initialChannels={channels}
      initialSelectedSale={initialSelectedSale}
    />
  );
}
