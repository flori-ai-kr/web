import { listStorageRequests } from '@/lib/actions/admin-storage';
import { StorageClient } from './storage-client';

export default async function StoragePage() {
  const initial = await listStorageRequests();
  return <StorageClient initial={initial} />;
}
