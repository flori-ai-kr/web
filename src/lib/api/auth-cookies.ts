import 'server-only';

import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, REGISTER_COOKIE } from './cookie-names';

// ─── BFF JWT 쿠키 헬퍼 ────────────────────────────────────────
// Kotlin API가 발급한 access/refresh 토큰을 httpOnly 쿠키로 저장한다.
// 브라우저 JS에는 노출되지 않으며, 서버(Server Action/미들웨어)에서만 읽는다.

export { ACCESS_COOKIE, REFRESH_COOKIE };

// refresh 토큰 수명: 14일 (서버측 rotation 정책과 별개로 쿠키 만료 상한)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/**
 * 로그인/리프레시 성공 시 access·refresh 토큰을 httpOnly 쿠키에 저장한다.
 * @param expiresIn access 토큰 TTL(초). 쿠키 maxAge로 사용.
 * @returns 쿠키 쓰기 성공 여부. Server Component 렌더 중에는 Next.js가
 *   쿠키 쓰기를 막으므로 false를 반환한다(요청 자체는 새 토큰으로 진행 가능).
 */
export async function setAuthTokens(access: string, refresh: string, expiresIn: number): Promise<boolean> {
  try {
    const store = await cookies();
    store.set(ACCESS_COOKIE, access, cookieOptions(Math.max(1, expiresIn)));
    store.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_MAX_AGE));
    return true;
  } catch {
    // Server Component 렌더 컨텍스트에서는 쿠키 쓰기가 불가하다.
    // (쿠키는 Server Action/Route Handler/미들웨어에서만 수정 가능)
    // 이 경우 회전된 토큰은 영속되지 않지만, 현재 요청은 메모리상의
    // 새 access 토큰으로 재시도되어 정상 응답한다.
    return false;
  }
}

/** 로그아웃·인증 실패 시 두 토큰 쿠키를 모두 제거한다. (읽기 컨텍스트에선 무시) */
export async function clearAuthTokens(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(ACCESS_COOKIE);
    store.delete(REFRESH_COOKIE);
  } catch {
    // Server Component 렌더 중에는 쿠키 삭제 불가 — 무시
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

// ─── 소셜 가입 토큰(registerToken) 쿠키 헬퍼 ───────────────────
// 소셜 인증은 됐지만 아직 미가입인 유저의 가입 자격증명. 콜백에서 저장하고
// register/complete 액션에서 읽어 body로 보낸 뒤 삭제한다. 클라이언트 JS 비노출.

/** 미가입 소셜 유저의 registerToken을 httpOnly 쿠키에 저장한다. (기본 수명 5분) */
export async function setRegisterToken(token: string, maxAge = 300): Promise<void> {
  const store = await cookies();
  store.set(REGISTER_COOKIE, token, cookieOptions(maxAge));
}

export async function getRegisterToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REGISTER_COOKIE)?.value;
}

/** 가입 완료·취소 시 registerToken 쿠키를 제거한다. (읽기 컨텍스트에선 무시) */
export async function clearRegisterToken(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(REGISTER_COOKIE);
  } catch {
    // Server Component 렌더 중에는 쿠키 삭제 불가 — 무시
  }
}
