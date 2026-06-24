import { notFound } from 'next/navigation';
import { listMyInquiries } from '@/lib/actions/support';
import { InquiryDetailClient } from './inquiry-detail-client';

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiries = await listMyInquiries(0, 200);
  const inquiry = inquiries.find((i) => i.id === Number(id));
  if (!inquiry) notFound();
  return <InquiryDetailClient inquiry={inquiry} />;
}
