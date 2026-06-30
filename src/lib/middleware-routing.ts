// 미들웨어 진입 분기 판정(Edge 안전 — next/headers 의존 없음).
export interface AuthCookiePresence {
  hasAccess: boolean;
  hasRefresh: boolean;
}

/**
 * 공개 진입점(`/`·`/login`)에서 리다이렉트 대상 경로를 반환한다.
 * - 인증 쿠키(access 또는 refresh)가 존재하면 `/`·`/login` 모두 `/admin`
 *   (이미 로그인 상태면 로그인 화면을 건너뛴다).
 * - 쿠키가 없으면 `/` → `/login` (랜딩은 별도 사이트 flori.ai.kr 로 이관됨),
 *   `/login` → null (로그인 화면 표시).
 * - 그 외 경로는 null(분기 없음).
 * 쿠키 "존재"만 본다 — 유효성 검증은 /admin 진입 가드가 수행한다.
 */
export function authEntryRedirectTarget(pathname: string, cookies: AuthCookiePresence): string | null {
  const isAuthed = cookies.hasAccess || cookies.hasRefresh;
  if (pathname === '/') return isAuthed ? '/admin' : '/login';
  if (pathname === '/login') return isAuthed ? '/admin' : null;
  return null;
}
