'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminSubscriptionRow } from '@/types/billing';

// BFF: GET /admin/subscriptions?status=
async function _listSubscriptions(status?: string): Promise<AdminSubscriptionRow[]> {
  await requireAdmin();
  const qs = status?.trim() ? `?${new URLSearchParams({ status: status.trim() }).toString()}` : '';
  return apiFetch<AdminSubscriptionRow[]>(`/admin/subscriptions${qs}`);
}
export const listSubscriptions = withErrorLogging('listSubscriptions', _listSubscriptions);
