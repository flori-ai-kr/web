'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { AdminStorageRequest, StorageRequestStatus } from '@/types/admin';
import type { StorageUsage } from '@/types/storage';

async function _listStorageRequests(
  status?: StorageRequestStatus,
): Promise<AdminStorageRequest[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: '0', size: '50' });
  if (status) qs.set('status', status);
  return apiFetch<AdminStorageRequest[]>(`/admin/storage/requests?${qs.toString()}`);
}
export const listStorageRequests = withErrorLogging('listStorageRequests', _listStorageRequests);

/** 유저 quota를 절대 바이트값으로 상향. 서버가 해당 유저 PENDING 요청을 자동 RESOLVED 처리한다. */
async function _updateUserQuota(userId: number, quotaBytes: number): Promise<StorageUsage> {
  await requireAdmin();
  if (!Number.isInteger(userId) || userId <= 0)
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 사용자입니다');
  if (!Number.isFinite(quotaBytes) || quotaBytes <= 0)
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 용량입니다');
  const res = await apiFetch<StorageUsage>(`/admin/storage/users/${userId}/quota`, {
    method: 'PATCH',
    body: JSON.stringify({ quotaBytes }),
  });
  revalidatePath('/console/storage');
  return res;
}
export const updateUserQuota = withErrorLogging('updateUserQuota', _updateUserQuota);
