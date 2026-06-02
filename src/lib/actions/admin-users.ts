'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminUserDetail, AdminUserPage, AdminUserRow } from '@/types/admin';

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
  const res = await apiFetch<AdminUserRow>(`/admin/users/${id}/active`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  });
  revalidatePath('/console/users');
  return res;
}
export const setUserActive = withErrorLogging('setUserActive', _setUserActive);

// BFF: GET /admin/users/{id} (드릴다운 상세)
// 서버 보강 전(엔드포인트 부재 → NOT_FOUND)이면 목록 1행으로 폴백해 기본 정보만 채운다.
async function _getAdminUserDetail(id: number): Promise<AdminUserDetail> {
  await requireAdmin();
  try {
    return await apiFetch<AdminUserDetail>(`/admin/users/${id}`);
  } catch (detailError) {
    // 상세 엔드포인트는 서버 통계보강 배포 후에야 존재한다. 그 전(미구현→4xx/5xx)에는
    // 목록 1행으로 폴백해 기본 정보만 채운다. 목록 조회까지 실패하면 원 에러를 전파.
    try {
      const page = await apiFetch<AdminUserPage>(`/admin/users?page=0&size=200`);
      const row = page.rows.find((r) => r.id === id);
      if (!row) throw detailError;
      return {
        id: row.id,
        email: row.email,
        nickname: row.nickname,
        isActive: row.isActive,
        isAdmin: row.isAdmin,
        createdAt: row.createdAt,
        storeName: row.storeName,
        regionSido: null,
        regionSigungu: null,
        subscriptionStatus: row.subscriptionStatus,
        verifications: [],
        salesCount: null,
        salesTotal: null,
        lastSaleDate: null,
      };
    } catch {
      throw detailError;
    }
  }
}
export const getAdminUserDetail = withErrorLogging('getAdminUserDetail', _getAdminUserDetail);
