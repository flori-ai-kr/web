import { getSales, getSaleById, getSalesSummary } from '@/lib/actions/sales';
import { getSaleCategories, getPaymentMethods } from '@/lib/actions/sale-settings';
import { getCardCompanySettings } from '@/lib/actions/settings';
import { SalesClient } from './sales-client';
import type { SalesFilters } from '@/lib/actions/sales';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    saleId?: string;
    category?: string;
    payment?: string;
    channel?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // "all"이면 전체 조회, 아니면 특정 년/월
  const isAllYear = params.year === 'all';
  const isAllMonth = params.month === 'all';
  const currentYear = isAllYear ? 0 : (params.year ? parseInt(params.year, 10) : now.getFullYear());
  const currentMonth = isAllMonth ? 0 : (params.month ? parseInt(params.month, 10) : now.getMonth() + 1);

  // getSales 파라미터: "YYYY-MM" (특정월), "YYYY" (1년), undefined (전체)
  let monthParam: string | undefined;
  if (isAllYear) {
    monthParam = undefined; // 전체
  } else if (isAllMonth) {
    monthParam = currentYear.toString(); // 년도만 (1년치)
  } else {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
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
      initialFilters={filters}
      initialCategories={categories}
      initialPayments={payments}
      initialCardCompanies={cardCompanies}
      initialSelectedSale={initialSelectedSale}
    />
  );
}
