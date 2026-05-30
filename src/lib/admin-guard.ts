'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { requireAuth, type AuthUser } from '@/lib/auth-guard';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * 운영자 가드. requireAuth()로 로그인을 보장한 뒤, 서버 /admin/me 로 is_admin 을 재검증한다.
 * - admin 이 아니면(서버가 403 → apiFetch가 UNAUTHORIZED로 매핑) 점주 대시보드(/admin)로 redirect.
 * - 진짜 권한 검증은 서버 @RequiresAdmin 인터셉터가 수행하며, 이 가드는 콘솔 진입 차단용이다.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  try {
    await apiFetch<{ isAdmin: boolean }>('/admin/me');
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCode.UNAUTHORIZED) {
      redirect('/admin');
    }
    throw error;
  }
  return user;
}
