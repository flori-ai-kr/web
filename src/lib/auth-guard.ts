'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/auth-cookies';
import { AppError, ErrorCode } from '@/lib/errors';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * 인증 가드. access 쿠키가 없으면 즉시 로그인으로 보낸다.
 * 있으면 /me로 검증한다(만료 시 apiFetch가 refresh 자동 처리).
 * 인증 불가(UNAUTHORIZED)면 로그인으로 redirect.
 * @returns 현재 사용자 {id, name, email}
 */
export async function requireAuth(): Promise<AuthUser> {
  const access = await getAccessToken();
  if (!access) {
    redirect('/login');
  }

  try {
    return await apiFetch<AuthUser>('/me');
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCode.UNAUTHORIZED) {
      redirect('/login');
    }
    throw error;
  }
}
