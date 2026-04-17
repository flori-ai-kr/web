import {timingSafeEqual} from 'node:crypto';

/**
 * 내부 API 인증: Bearer INTERNAL_API_KEY
 * RemoteTrigger 루틴 ↔ 앱 내부 통신용
 * 타이밍 공격 방지 위해 timingSafeEqual 사용
 */
export function verifyInternalAuth(request: Request): boolean {
  const secret = process.env.INTERNAL_API_KEY;
  if (!secret) {
    console.error('[InternalAuth] INTERNAL_API_KEY 미설정');
    return false;
  }

  const header = request.headers.get('authorization');
  if (!header) return false;

  const expected = `Bearer ${secret}`;
  // 길이가 다르면 비교 자체 불가
  if (header.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}
