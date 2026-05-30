import { getAiHealth } from '@/lib/actions/admin-health';
import { HealthClient } from './health-client';

export default async function HealthPage() {
  const health = await getAiHealth();
  return <HealthClient initial={health} />;
}
