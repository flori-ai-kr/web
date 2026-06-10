import {redirect} from 'next/navigation';
import {getMyBusinessVerification} from '@/lib/actions/business-verification';
import {BusinessVerificationGate} from '@/components/community/business-verification-gate';

export default async function CommunityVerifyPage() {
  const verification = await getMyBusinessVerification();
  if (verification.status === 'APPROVED') redirect('/admin/community');
  return <BusinessVerificationGate initial={verification} />;
}
