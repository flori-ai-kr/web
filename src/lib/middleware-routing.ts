// 미들웨어 루트 분기 판정(Edge 안전 — next/headers 의존 없음).
export interface AuthCookiePresence {
  hasAccess: boolean;
  hasRefresh: boolean;
}

/**
 * 루트(`/`) 요청에서 리다이렉트 대상 경로를 반환한다.
 * - `/` 이고 인증 쿠키(access 또는 refresh)가 존재하면 `/admin`.
 * - 그 외(루트 아님 / 쿠키 없음)는 null(분기 없음).
 * 쿠키 "존재"만 본다 — 유효성 검증은 /admin 진입 가드가 수행한다.
 */
export function rootRedirectTarget(pathname: string, cookies: AuthCookiePresence): string | null {
  if (pathname !== '/') return null;
  if (cookies.hasAccess || cookies.hasRefresh) return '/admin';
  return null;
}
