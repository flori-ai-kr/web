import type {SalesFilters} from '@/lib/actions/sales';
import {getSaleById, getSales, getSalesSummary} from '@/lib/actions/sales';
import {getPaymentMethods, getSaleCategories} from '@/lib/actions/sale-settings';
import {getCardCompanySettings} from '@/lib/actions/settings';
import {SalesClient} from './sales-client';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    day?: string;
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

  // getSales 파라미터: "YYYY-MM-DD" (특정일), "YYYY-MM" (특정월), "YYYY" (1년), undefined (전체)
  let monthParam: string | undefined;
  if (isAllYear) {
    monthParam = undefined; // 전체
  } else if (isAllMonth) {
    monthParam = currentYear.toString(); // 년도만 (1년치)
  } else if (currentDay === 0) {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  } else {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  }

  // 서버사이드 필터
  const filters: SalesFilters = {
    category: params.category || undefined,
    payment: params.payment || undefined,
    channel: params.channel || undefined,
  };

  const [salesResult, summary, categories, payments, cardCompanies, initialSelectedSale] = await Promise.all([
    getSales(monthParam, 0, 100, filters),
    getSalesSummary(monthParam, filters),
    getSaleCategories(),
    getPaymentMethods(),
    getCardCompanySettings(),
    params.saleId ? getSaleById(params.saleId) : Promise.resolve(null),
  ]);

  return (
    <SalesClient
      initialSales={salesResult.sales}
      initialHasMore={salesResult.hasMore}
      initialSummary={summary}
      monthParam={monthParam ?? null}
      currentYear={currentYear}
      currentMonth={currentMonth}
      currentDay={currentDay}
      initialFilters={filters}
      initialCategories={categories}
      initialPayments={payments}
      initialCardCompanies={cardCompanies}
      initialSelectedSale={initialSelectedSale}
    />
  );
}
