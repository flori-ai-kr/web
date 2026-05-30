'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { AdminVerification, VerificationStatus } from '@/types/admin';

const VALID_STATUSES: readonly VerificationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

// BFF: GET /admin/verifications?status=
async function _listVerifications(status: VerificationStatus): Promise<AdminVerification[]> {
  await requireAdmin();
  // Server Action은 런타임에 임의 문자열을 받을 수 있으므로 화이트리스트로 재검증(타입 단언은 런타임 보장 아님).
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 상태값입니다');
  }
  const qs = new URLSearchParams({ status });
  return apiFetch<AdminVerification[]>(`/admin/verifications?${qs.toString()}`);
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
