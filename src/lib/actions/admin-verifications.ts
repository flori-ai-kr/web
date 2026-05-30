'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminVerification, VerificationStatus } from '@/types/admin';

// BFF: GET /admin/verifications?status=
async function _listVerifications(status: VerificationStatus): Promise<AdminVerification[]> {
  await requireAdmin();
  return apiFetch<AdminVerification[]>(`/admin/verifications?status=${status}`);
}
export const listVerifications = withErrorLogging('listVerifications', _listVerifications);

// BFF: POST /admin/verifications/{id}/approve
async function _approveVerification(id: number): Promise<AdminVerification> {
  await requireAdmin();
  const res = await apiFetch<AdminVerification>(`/admin/verifications/${id}/approve`, { method: 'POST' });
  revalidatePath('/console/verifications');
  return res;
}
export const approveVerification = withErrorLogging('approveVerification', _approveVerification);

// BFF: POST /admin/verifications/{id}/reject
async function _rejectVerification(id: number, reason: string): Promise<AdminVerification> {
  await requireAdmin();
  const res = await apiFetch<AdminVerification>(`/admin/verifications/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  revalidatePath('/console/verifications');
  return res;
}
export const rejectVerification = withErrorLogging('rejectVerification', _rejectVerification);
