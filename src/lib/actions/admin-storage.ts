'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { AdminStorageRequest, StorageRequestStatus } from '@/types/admin';

async function _listStorageRequests(
  status?: StorageRequestStatus,
): Promise<AdminStorageRequest[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: '0', size: '50' });
  if (status) qs.set('status', status);
  return apiFetch<AdminStorageRequest[]>(`/admin/storage/requests?${qs.toString()}`);
}
export const listStorageRequests = withErrorLogging('listStorageRequests', _listStorageRequests);

async function _approveRequest(
  requestId: number,
  quotaBytes: number,
): Promise<AdminStorageRequest> {
  await requireAdmin();
  if (!Number.isInteger(requestId) || requestId <= 0)
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 요청입니다');
  if (!Number.isFinite(quotaBytes) || quotaBytes <= 0)
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 용량입니다');
  const res = await apiFetch<AdminStorageRequest>(
    `/admin/storage/requests/${requestId}/approve`,
    { method: 'POST', body: JSON.stringify({ quotaBytes }) },
  );
  revalidatePath('/console/storage');
  return res;
}
export const approveRequest = withErrorLogging('approveRequest', _approveRequest);

async function _rejectRequest(
  requestId: number,
  reason: string,
): Promise<AdminStorageRequest> {
  await requireAdmin();
  if (!Number.isInteger(requestId) || requestId <= 0)
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 요청입니다');
  if (!reason.trim()) throw new AppError(ErrorCode.VALIDATION, '거절 사유를 입력해 주세요');
  const res = await apiFetch<AdminStorageRequest>(
    `/admin/storage/requests/${requestId}/reject`,
    { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) },
  );
  revalidatePath('/console/storage');
  return res;
}
export const rejectRequest = withErrorLogging('rejectRequest', _rejectRequest);
