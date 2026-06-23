'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type {
  CommunityBan,
  ReportQueueItem,
  ReportResolution,
  ReportStatus,
} from '@/types/admin';

function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 ID입니다');
  }
}

// BFF: GET /admin/community/reports?status=&page=&size=
async function _listReports(status: ReportStatus = 'pending'): Promise<ReportQueueItem[]> {
  await requireAdmin();
  return apiFetch<ReportQueueItem[]>(`/admin/community/reports?status=${status}&page=0&size=50`);
}
export const listReports = withErrorLogging('listReports', _listReports);

// BFF: POST /admin/community/reports/{id}/resolve
async function _resolveReport(id: number, resolution: ReportResolution): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  await apiFetch(`/admin/community/reports/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  });
  revalidatePath('/console/moderation');
}
export const resolveReport = withErrorLogging('resolveReport', _resolveReport);

// BFF: POST /admin/community/posts/{id}/hide|unhide, DELETE /admin/community/posts/{id}
async function _moderatePost(id: number, action: 'hide' | 'unhide' | 'delete'): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  const path = `/admin/community/posts/${id}${action === 'delete' ? '' : `/${action}`}`;
  await apiFetch(path, { method: action === 'delete' ? 'DELETE' : 'POST' });
  revalidatePath('/console/moderation');
}
export const moderatePost = withErrorLogging('moderatePost', _moderatePost);

// BFF: POST /admin/community/comments/{id}/hide|unhide, DELETE /admin/community/comments/{id}
async function _moderateComment(id: number, action: 'hide' | 'unhide' | 'delete'): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  const path = `/admin/community/comments/${id}${action === 'delete' ? '' : `/${action}`}`;
  await apiFetch(path, { method: action === 'delete' ? 'DELETE' : 'POST' });
  revalidatePath('/console/moderation');
}
export const moderateComment = withErrorLogging('moderateComment', _moderateComment);

// BFF: GET /admin/community/bans
async function _listBans(): Promise<CommunityBan[]> {
  await requireAdmin();
  return apiFetch<CommunityBan[]>('/admin/community/bans?page=0&size=50');
}
export const listBans = withErrorLogging('listBans', _listBans);

// BFF: POST /admin/community/bans
async function _createBan(
  userId: number,
  reason: string | null,
  expiresAt: string | null,
): Promise<CommunityBan> {
  await requireAdmin();
  assertValidId(userId);
  const res = await apiFetch<CommunityBan>('/admin/community/bans', {
    method: 'POST',
    body: JSON.stringify({ userId, reason, expiresAt }),
  });
  revalidatePath('/console/moderation');
  return res;
}
export const createBan = withErrorLogging('createBan', _createBan);

// BFF: DELETE /admin/community/bans/{id} (해제)
async function _liftBan(id: number): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  await apiFetch(`/admin/community/bans/${id}`, { method: 'DELETE' });
  revalidatePath('/console/moderation');
}
export const liftBan = withErrorLogging('liftBan', _liftBan);
