import { notFound } from 'next/navigation';
import { listMyInquiries } from '@/lib/actions/support';
import { InquiryDetailClient } from './inquiry-detail-client';

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();
  const inquiries = await listMyInquiries(0, 200);
  const inquiry = inquiries.find((i) => i.id === numId);
  if (!inquiry) notFound();
  return <InquiryDetailClient inquiry={inquiry} />;
}
