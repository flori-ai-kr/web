import { listReports } from '@/lib/actions/admin-moderation';
import { ModerationClient } from './moderation-client';

export default async function ModerationPage() {
  const reports = await listReports('pending');
  return <ModerationClient initialReports={reports} />;
}
