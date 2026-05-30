import { listVerifications } from '@/lib/actions/admin-verifications';
import { VerificationsClient } from './verifications-client';

export default async function VerificationsPage() {
  const pending = await listVerifications('PENDING');
  return <VerificationsClient initial={pending} />;
}
