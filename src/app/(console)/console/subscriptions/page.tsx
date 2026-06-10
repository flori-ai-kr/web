import { listSubscriptions } from '@/lib/actions/admin-subscriptions';
import { SubscriptionsClient } from './subscriptions-client';

export default async function SubscriptionsPage() {
  const rows = await listSubscriptions();
  return <SubscriptionsClient rows={rows} />;
}
