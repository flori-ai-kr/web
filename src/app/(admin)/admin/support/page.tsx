import { listMyInquiries } from '@/lib/actions/support';
import { SupportClient } from './support-client';

export default async function SupportPage() {
  const inquiries = await listMyInquiries();
  return <SupportClient initial={inquiries} />;
}
