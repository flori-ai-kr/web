'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminOverview } from '@/types/admin';

// BFF: GET /admin/stats/overview (cross-tenant 집계)
async function _getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();
  return apiFetch<AdminOverview>('/admin/stats/overview');
}

export const getAdminOverview = withErrorLogging('getAdminOverview', _getAdminOverview);
