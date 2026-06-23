'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AuditLog } from '@/types/admin';

// BFF: GET /admin/audit-logs?action=&actorUserId=&page=&size=
async function _listAuditLogs(action?: string, page = 0): Promise<AuditLog[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: String(page), size: '50' });
  if (action) qs.set('action', action);
  return apiFetch<AuditLog[]>(`/admin/audit-logs?${qs.toString()}`);
}
export const listAuditLogs = withErrorLogging('listAuditLogs', _listAuditLogs);
