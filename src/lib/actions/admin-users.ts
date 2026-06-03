'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { AdminUserDetail, AdminUserPage, AdminUserRow } from '@/types/admin';

// 경로변수 id 런타임 가드(서버 액션은 타입 외 임의 입력 가능 → 방어).
function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 사용자 ID입니다');
  }
}

// BFF: GET /admin/users?query=&page=&size=
async function _listAdminUsers(query: string, page: number): Promise<AdminUserPage> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: String(page), size: '50' });
  if (query.trim()) qs.set('query', query.trim());
  return apiFetch<AdminUserPage>(`/admin/users?${qs.toString()}`);
}
export const listAdminUsers = withErrorLogging('listAdminUsers', _listAdminUsers);

// BFF: POST /admin/users/{id}/active
async function _setUserActive(id: number, active: boolean): Promise<AdminUserRow> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<AdminUserRow>(`/admin/users/${id}/active`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  });
  revalidatePath('/console/users');
  return res;
}
export const setUserActive = withErrorLogging('setUserActive', _setUserActive);

// BFF: GET /admin/users/{id} (드릴다운 상세). 없는 유저는 NOT_FOUND → 페이지가 notFound() 처리.
async function _getAdminUserDetail(id: number): Promise<AdminUserDetail> {
  await requireAdmin();
  assertValidId(id);
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`);
}
export const getAdminUserDetail = withErrorLogging('getAdminUserDetail', _getAdminUserDetail);
