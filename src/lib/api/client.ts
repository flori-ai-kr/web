import 'server-only';

import {cache} from 'react';
import {AppError, ErrorCode} from '@/lib/errors';
import {clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens,} from './auth-cookies';

// ─── BFF API 클라이언트 ───────────────────────────────────────
// Next.js 서버 레이어에서 Kotlin REST API로 서버↔서버 fetch.
// access 토큰은 httpOnly 쿠키에서 읽어 Authorization 헤더로 붙인다.
// 401이면 refresh 토큰으로 1회 자동 재발급 후 원 요청을 재시도한다.

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

function apiUrl(path: string): string {
  const base = process.env.API_URL ?? 'http://localhost:8080';
  return `${base}${path}`;
}

// 서버 원문 메시지를 노출하지 않을 때 쓰는 공통 사용자 문구.
const COMMON_ERROR_MESSAGE = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

/**
 * 비-2xx 응답을 AppError로 변환한다.
 * - 4xx(예상된 클라이언트 에러): 서버가 의도한 사용자용 메시지를 그대로 노출한다.
 * - 5xx 등 그 외(내부/예상치 못한 에러): 원문을 숨기고 공통 문구로 대체한다.
 *   ("스토리지가 구성되지 않았습니다" 같은 내부 메시지가 사용자에게 새어나가지 않도록)
 */
async function toAppError(res: Response): Promise<AppError> {
  let serverMessage: string | undefined;
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) serverMessage = body.message;
  } catch {
    // JSON 본문 없음
  }

  let code: ErrorCode;
  switch (res.status) {
    case 400:
    case 422:
      code = ErrorCode.VALIDATION;
      break;
    case 401:
    case 403:
      code = ErrorCode.UNAUTHORIZED;
      break;
    case 404:
      code = ErrorCode.NOT_FOUND;
      break;
    case 409:
      code = ErrorCode.DUPLICATE;
      break;
    default:
      code = ErrorCode.UNKNOWN;
  }

  const isClientError = res.status >= 400 && res.status < 500;
  const message = isClientError && serverMessage ? serverMessage : COMMON_ERROR_MESSAGE;
  return new AppError(code, message);
}

// @MX:WARN: [AUTO] refresh는 반드시 요청당 1회만 실행되어야 한다 (cache로 중복 제거)
// @MX:REASON: Kotlin이 refresh 토큰을 회전(rotation)시키므로, 한 요청 내 동시 다발
//   apiFetch 호출이 각자 refresh하면 첫 호출만 성공하고 나머지는 INVALID_TOKEN으로 실패한다.
//   React cache()는 요청 스코프로 격리되어 멀티테넌시상 안전하며 동시 401을 단일 refresh로 합친다.
/**
 * refresh 토큰으로 새 토큰 쌍을 발급받아 쿠키를 갱신한다.
 * React cache로 감싸 동일 요청 내 동시 호출을 단일 refresh로 합친다.
 * 실패 시 쿠키를 비우고 UNAUTHORIZED를 던진다.
 * @returns 새 access 토큰
 */
const refreshTokens = cache(async (): Promise<string> => {
  const refresh = await getRefreshToken();
  if (!refresh) {
    await clearAuthTokens();
    throw new AppError(ErrorCode.UNAUTHORIZED, '인증이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: 'no-store',
  });

  if (!res.ok) {
    await clearAuthTokens();
    throw new AppError(ErrorCode.UNAUTHORIZED, '인증이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const tokens = (await res.json()) as TokenResponse;
  await setAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
  return tokens.accessToken;
});

async function rawFetch(path: string, init: RequestInit, accessToken?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(apiUrl(path), {
    ...init,
    headers,
    cache: 'no-store',
  });
}

// @MX:ANCHOR: [AUTO] 모든 도메인 Server Action이 Kotlin API에 접근하는 단일 진입점
// @MX:REASON: 향후 ~16개 액션 파일이 이 함수로 마이그레이션되어 fan_in이 크게 증가한다. JWT 쿠키 부착·401 자동 리프레시 정책이 여기에 응집된다.
/**
 * Kotlin API를 호출하고 JSON을 T로 파싱해 반환한다.
 * - access 토큰을 쿠키에서 읽어 Authorization 헤더로 부착
 * - 401이면 refresh로 토큰 갱신 후 원 요청을 1회 재시도
 * - 그 외 비-2xx는 서버 메시지를 담은 AppError로 throw
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const access = await getAccessToken();
  let res = await rawFetch(path, init, access);

  if (res.status === 401) {
    // refresh 시도 (실패하면 내부에서 쿠키 정리 + UNAUTHORIZED throw)
    const newAccess = await refreshTokens();
    res = await rawFetch(path, init, newAccess);
  }

  if (!res.ok) {
    throw await toAppError(res);
  }

  // 204 No Content 등 본문이 없는 응답 처리
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ─── 내부(서버↔서버) API 클라이언트 ───────────────────────────
// Kotlin `/internal/**` 엔드포인트는 사용자 JWT가 아니라 Bearer INTERNAL_API_KEY로 인증한다.
// 인스타 계정 관리처럼 서버에 사용자용 엔드포인트가 없는 관리 작업에서 서버 액션 내부에서만 사용한다.
/**
 * Kotlin `/internal/**` API를 INTERNAL_API_KEY로 호출하고 JSON을 T로 파싱한다.
 * refresh 로직 없음(사용자 세션과 무관). 비-2xx는 서버 메시지를 담은 AppError로 throw.
 */
export async function apiFetchInternal<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) throw new AppError(ErrorCode.UNKNOWN, 'INTERNAL_API_KEY가 설정되지 않았습니다');

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${key}`);

  const res = await fetch(apiUrl(path), { ...init, headers, cache: 'no-store' });

  if (!res.ok) throw await toAppError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
