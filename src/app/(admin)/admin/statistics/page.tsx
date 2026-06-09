import { resolveRange, type RangePreset } from './lib/range';
import { StatisticsClient, type StatTab } from './statistics-client';
import {
  getSalesStatistics,
  getExpensesStatistics,
  getReservationStatistics,
  getCustomerStatistics,
} from '@/lib/actions/statistics';

// Next 16 App Router: searchParams is a Promise
interface PageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tab?: string }>;
}

const VALID_PRESETS: RangePreset[] = ['this-month', 'last-month', 'last-3m', 'this-year', 'custom'];
const VALID_TABS: StatTab[] = ['sales', 'expenses', 'reservations', 'customers'];

export default async function StatisticsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Resolve preset
  const rawRange = params.range ?? 'this-month';
  const preset: RangePreset = VALID_PRESETS.includes(rawRange as RangePreset)
    ? (rawRange as RangePreset)
    : 'this-month';

  // Resolve from/to: explicit params take priority; otherwise compute from preset
  const baseRange = resolveRange(preset);
  const from = params.from ?? baseRange.from;
  const to = params.to ?? baseRange.to;

  // Resolve active tab
  const rawTab = params.tab ?? 'sales';
  const activeTab: StatTab = VALID_TABS.includes(rawTab as StatTab)
    ? (rawTab as StatTab)
    : 'sales';

  // Server-fetch only the active tab. Wrap in try/catch so a missing BFF
  // endpoint does not crash the page — passes initialData: null + error flag.
  let initialData = null;
  let initialError = false;

  try {
    switch (activeTab) {
      case 'sales':
        initialData = await getSalesStatistics(from, to);
        break;
      case 'expenses':
        initialData = await getExpensesStatistics(from, to);
        break;
      case 'reservations':
        initialData = await getReservationStatistics(from, to);
        break;
      case 'customers':
        initialData = await getCustomerStatistics(from, to);
        break;
    }
  } catch (e) {
    // redirect()/notFound() 등 Next 내부 제어 에러는 삼키지 말고 전파(인증 리다이렉트 보존).
    if (
      e &&
      typeof e === 'object' &&
      'digest' in e &&
      typeof (e as { digest: unknown }).digest === 'string' &&
      (e as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw e;
    }
    initialError = true;
  }

  return (
    <StatisticsClient
      initialPreset={preset}
      initialFrom={from}
      initialTo={to}
      initialTab={activeTab}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
