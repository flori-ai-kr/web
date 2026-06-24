'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { Announcement, AnnouncementPlacement } from '@/types/admin';

function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 ID입니다');
  }
}

export interface AnnouncementInput {
  placement: AnnouncementPlacement;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

// BFF: GET /admin/announcements?page=&size=
async function _listAnnouncements(): Promise<Announcement[]> {
  await requireAdmin();
  return apiFetch<Announcement[]>('/admin/announcements?page=0&size=100');
}
export const listAnnouncements = withErrorLogging('listAnnouncements', _listAnnouncements);

// BFF: POST /admin/announcements
async function _createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  await requireAdmin();
  const res = await apiFetch<Announcement>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/console/announcements');
  return res;
}
export const createAnnouncement = withErrorLogging('createAnnouncement', _createAnnouncement);

// BFF: PATCH /admin/announcements/{id}
async function _updateAnnouncement(
  id: number,
  input: Partial<AnnouncementInput>,
): Promise<Announcement> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<Announcement>(`/admin/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/console/announcements');
  return res;
}
export const updateAnnouncement = withErrorLogging('updateAnnouncement', _updateAnnouncement);

// BFF: POST /admin/announcements/{id}/active
async function _setAnnouncementActive(id: number, active: boolean): Promise<Announcement> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<Announcement>(`/admin/announcements/${id}/active`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  });
  revalidatePath('/console/announcements');
  return res;
}
export const setAnnouncementActive = withErrorLogging('setAnnouncementActive', _setAnnouncementActive);

// BFF: DELETE /admin/announcements/{id} (soft delete)
async function _deleteAnnouncement(id: number): Promise<void> {
  await requireAdmin();
  assertValidId(id);
  await apiFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
  revalidatePath('/console/announcements');
}
export const deleteAnnouncement = withErrorLogging('deleteAnnouncement', _deleteAnnouncement);
