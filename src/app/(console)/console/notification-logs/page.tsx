import { listNotificationLogs } from '@/lib/actions/admin-notification-logs';
import { NotificationLogsClient } from './notification-logs-client';

export default async function NotificationLogsPage() {
  const logs = await listNotificationLogs();
  return <NotificationLogsClient initial={logs} />;
}
