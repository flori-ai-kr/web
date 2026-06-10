import {ensureCommunityAccess} from '@/lib/actions/business-verification';
import {CommunityWriteClient} from './community-write-client';

export default async function CommunityWritePage() {
  await ensureCommunityAccess();

  return <CommunityWriteClient />;
}
