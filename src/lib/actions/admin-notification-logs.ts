'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { NotificationLog, NotificationSendStatus } from '@/types/admin';

export interface NotificationLogFilters {
  type?: string;
  source?: string;
  status?: NotificationSendStatus;
}

// BFF: GET /admin/notification-logs?type=&source=&status=&page=&size=
async function _listNotificationLogs(
  filters: NotificationLogFilters = {},
  page = 0,
): Promise<NotificationLog[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: String(page), size: '50' });
  if (filters.type) qs.set('type', filters.type);
  if (filters.source) qs.set('source', filters.source);
  if (filters.status) qs.set('status', filters.status);
  return apiFetch<NotificationLog[]>(`/admin/notification-logs?${qs.toString()}`);
}
export const listNotificationLogs = withErrorLogging('listNotificationLogs', _listNotificationLogs);
