import {redirect} from 'next/navigation';
import {getMyBusinessVerification} from '@/lib/actions/business-verification';
import {CommunityWriteClient} from './community-write-client';

export default async function CommunityWritePage() {
  const verification = await getMyBusinessVerification();
  if (verification.status !== 'APPROVED') redirect('/admin/community/verify');

  return <CommunityWriteClient />;
}
