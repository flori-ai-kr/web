'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { getAccessToken, getRefreshToken } from '@/lib/api/auth-cookies';
import { AppError, ErrorCode } from '@/lib/errors';

export interface AuthUser {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  profile?: { profileImageUrl?: string | null; tourCompleted?: boolean };
  // server가 온보딩 필드를 추가하기 전(미준비)에는 없을 수 있다(옵셔널).
  // 게이트는 `onboarded === false`일 때만 동작하므로 undefined면 통과한다.
  onboarded?: boolean;
}

/**
 * 인증된 사용자를 /me로 조회한다.
 * - access·refresh 쿠키가 둘 다 없으면 즉시 /login으로 redirect
 * - access만 만료(없음)되고 refresh가 있으면 apiFetch(/me)의 401→refresh 자동 처리에 맡긴다
 * - 인증 불가(UNAUTHORIZED)면 /login으로 redirect
 * 온보딩 게이트는 적용하지 않는다.
 */
async function fetchAuthUser(): Promise<AuthUser> {
  const access = await getAccessToken();
  // access가 없어도 refresh 쿠키가 있으면 apiFetch가 401→refresh로 살려낸다.
  // 둘 다 없을 때만 진짜 미인증으로 보고 즉시 로그인으로 보낸다.
  // 주의: GET 네비게이션은 middleware가 먼저 선제 refresh(쿠키 영속)하므로 보통 이 경로까지 오지 않는다.
  //   Server Component 렌더 중 refresh가 일어나면 setAuthTokens가 쿠키를 못 써(false) 회전 토큰이
  //   브라우저에 영속되지 않을 수 있는데, 이는 BFF의 refresh 멱등 윈도가 흡수한다(같은 토큰 재사용 허용).
  if (!access) {
    const refresh = await getRefreshToken();
    if (!refresh) {
      redirect('/login');
    }
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

// @MX:ANCHOR: [AUTO] 모든 /admin/* 페이지가 통과하는 인증 + 온보딩 게이트 단일 진입점
// @MX:REASON: 다수의 admin Server Component가 이 함수를 호출(fan_in 多). 온보딩 게이트의
//   하위호환 규칙(onboarded === false일 때만 라우팅)이 여기 한 곳에 응집되어야 server
//   미준비 상태에서 기존 /admin 흐름이 깨지지 않음을 보장한다.
/**
 * 인증 가드. /me로 사용자를 검증하고 온보딩 게이트를 적용한다.
 * - 미인증 → /login
 * - `onboarded === false`(명시적)일 때만 → /onboarding
 *   (undefined/없음 → 통과: 기존 사용자·server 미준비 상태 보호)
 * @returns 현재 사용자 {id, name, email, onboarded?}
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await fetchAuthUser();
  if (user.onboarded === false) {
    redirect('/onboarding');
  }
  return user;
}
