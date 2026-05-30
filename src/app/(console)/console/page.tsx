import { getAdminOverview } from '@/lib/actions/admin-stats';
import { getAiHealth } from '@/lib/actions/admin-health';
import { OverviewClient } from './overview-client';

export default async function ConsoleOverviewPage() {
  const [overview, health] = await Promise.all([getAdminOverview(), getAiHealth()]);
  return <OverviewClient overview={overview} health={health} />;
}
