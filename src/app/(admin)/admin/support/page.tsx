import { listMyInquiries } from '@/lib/actions/support';
import { SupportClient } from './support-client';
import {GuideButton} from '@/components/guide/guide-button';

export default async function SupportPage() {
  const inquiries = await listMyInquiries();
  return (
    <div className="relative">
      <div className="absolute right-4 top-0 sm:right-6 z-10"><GuideButton slug="support" /></div>
      <SupportClient initial={inquiries} />
    </div>
  );
}
