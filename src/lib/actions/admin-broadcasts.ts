'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { Broadcast, BroadcastSegment, BroadcastStatus, SegmentPreview } from '@/types/admin';

function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 ID입니다');
  }
}

export interface BroadcastInput {
  title: string;
  body: string;
  deepLink?: string | null;
  segment: BroadcastSegment;
  scheduledAt?: string | null;
}

// BFF: GET /admin/broadcasts?status=&page=&size=
async function _listBroadcasts(status?: BroadcastStatus): Promise<Broadcast[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: '0', size: '50' });
  if (status) qs.set('status', status);
  return apiFetch<Broadcast[]>(`/admin/broadcasts?${qs.toString()}`);
}
export const listBroadcasts = withErrorLogging('listBroadcasts', _listBroadcasts);

// BFF: POST /admin/broadcasts (초안/예약 생성)
async function _createBroadcast(input: BroadcastInput): Promise<Broadcast> {
  await requireAdmin();
  const res = await apiFetch<Broadcast>('/admin/broadcasts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/console/broadcasts');
  return res;
}
export const createBroadcast = withErrorLogging('createBroadcast', _createBroadcast);

// BFF: GET /admin/broadcasts/segments/preview?segment= (대상 인원 미리보기)
async function _previewSegment(segment: BroadcastSegment): Promise<SegmentPreview> {
  await requireAdmin();
  return apiFetch<SegmentPreview>(`/admin/broadcasts/segments/preview?segment=${segment}`);
}
export const previewSegment = withErrorLogging('previewSegment', _previewSegment);

// BFF: POST /admin/broadcasts/{id}/send (즉시 발송)
async function _sendBroadcast(id: number): Promise<Broadcast> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<Broadcast>(`/admin/broadcasts/${id}/send`, { method: 'POST' });
  revalidatePath('/console/broadcasts');
  return res;
}
export const sendBroadcast = withErrorLogging('sendBroadcast', _sendBroadcast);

// BFF: DELETE /admin/broadcasts/{id} (초안/예약만)
async function _deleteBroadcast(id: number): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  await apiFetch(`/admin/broadcasts/${id}`, { method: 'DELETE' });
  revalidatePath('/console/broadcasts');
}
export const deleteBroadcast = withErrorLogging('deleteBroadcast', _deleteBroadcast);
