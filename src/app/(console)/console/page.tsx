import {
  getAdminFunnel,
  getAdminOverview,
  getChurnReasons,
  getRetention,
  getTimeseries,
} from '@/lib/actions/admin-stats';
// [AI 기능 비활성화] import { getAiHealth } from '@/lib/actions/admin-health';
import type { StatRange } from '@/types/admin';
import { OverviewClient } from './overview-client';

const RANGES: StatRange[] = ['7d', '30d', '90d', 'all'];

export default async function ConsoleOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: raw } = await searchParams;
  const range: StatRange = RANGES.includes(raw as StatRange) ? (raw as StatRange) : '30d';

  const [overview, signups, sales, funnel, churn, retention] = await Promise.all([
    getAdminOverview(range),
    // [AI 기능 비활성화] getAiHealth(),
    getTimeseries('signups', range),
    getTimeseries('sales', range),
    getAdminFunnel(),
    getChurnReasons(30),
    getRetention(),
  ]);

  return (
    <OverviewClient
      overview={overview}
      health={{ targets: [] }}
      signups={signups}
      sales={sales}
      range={range}
      funnel={funnel}
      churn={churn}
      retention={retention}
    />
  );
}
