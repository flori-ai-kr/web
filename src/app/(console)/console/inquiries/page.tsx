import { listInquiries } from '@/lib/actions/admin-inquiries';
import { InquiriesClient } from './inquiries-client';

export default async function InquiriesPage() {
  const items = await listInquiries();
  return <InquiriesClient initial={items} />;
}
