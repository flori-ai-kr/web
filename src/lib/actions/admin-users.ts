'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminUserPage, AdminUserRow } from '@/types/admin';

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
