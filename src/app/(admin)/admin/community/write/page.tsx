import {ensureCommunityAccess} from '@/lib/actions/business-verification';
import {checkIsAdmin} from '@/lib/admin-guard';
import {CommunityWriteClient} from './community-write-client';

export default async function CommunityWritePage() {
  await ensureCommunityAccess();
  const isAdmin = await checkIsAdmin();

  return <CommunityWriteClient isAdmin={isAdmin} />;
}
