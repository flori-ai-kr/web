import { listBroadcasts } from '@/lib/actions/admin-broadcasts';
import { BroadcastsClient } from './broadcasts-client';

export default async function BroadcastsPage() {
  const items = await listBroadcasts();
  return <BroadcastsClient initial={items} />;
}
