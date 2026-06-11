import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const b64url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');

/**
 * 서명 없는 더미 JWT. middleware는 exp만 디코드해 선제 refresh 여부를 판단하고
 * 서명 검증은 BFF 몫이므로(mock에서는 무조건 통과) e2e에서는 이걸로 충분하다.
 */
export function fakeAccessToken(ttlSeconds = 3600): string {
  const header = b64url({ alg: 'none', typ: 'JWT' });
  const payload = b64url({ sub: 'e2e-user', exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  return `${header}.${payload}.e2e-sig`;
}

/** 로그인 상태를 만든다 — flori_access/flori_refresh 쿠키 주입 */
export async function signIn(context: BrowserContext, baseURL: string) {
  await context.addCookies([
    { name: 'flori_access', value: fakeAccessToken(), url: baseURL, httpOnly: true },
    { name: 'flori_refresh', value: 'e2e-refresh-token', url: baseURL, httpOnly: true },
  ]);
}

/**
 * 페이지의 런타임 에러를 수집한다. 반환 배열은 테스트 끝에서 비어 있어야 한다.
 * 리소스 로드 실패(mock 환경의 더미 이미지 URL 등)는 제외한다.
 */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource/.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

export function expectNoErrors(errors: string[]) {
  expect(errors, '페이지 런타임 에러가 없어야 한다').toEqual([]);
}
