'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { StorageUsage, StorageRequestSummary } from '@/types/storage';

async function _getStorageUsage(): Promise<StorageUsage> {
  await requireAuth();
  return apiFetch<StorageUsage>('/storage/usage');
}
export const getStorageUsage = withErrorLogging('getStorageUsage', _getStorageUsage);

async function _getLatestRequest(): Promise<StorageRequestSummary | null> {
  await requireAuth();
  return apiFetch<StorageRequestSummary | null>('/storage/increase-request/latest');
}
export const getLatestRequest = withErrorLogging('getLatestRequest', _getLatestRequest);

async function _requestStorageIncrease(reason?: string): Promise<StorageRequestSummary> {
  await requireAuth();
  const res = await apiFetch<StorageRequestSummary>('/storage/increase-request', {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });
  revalidatePath('/admin/gallery');
  return res;
}
export const requestStorageIncrease = withErrorLogging(
  'requestStorageIncrease',
  _requestStorageIncrease,
);
