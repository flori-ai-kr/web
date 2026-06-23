import { listAnnouncements } from '@/lib/actions/admin-announcements';
import { AnnouncementsClient } from './announcements-client';

export default async function AnnouncementsPage() {
  const items = await listAnnouncements();
  return <AnnouncementsClient initial={items} />;
}
