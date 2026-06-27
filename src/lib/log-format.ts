// 구조화 로그 포맷 순수 헬퍼 — server-only/pino 와 분리해 단위 테스트 가능하게 둔다.
// (log.ts 는 server-only + pino 라 vitest 에서 직접 import 불가.)
// logger.ts(Discord)·instrumentation.ts(pino)·log.ts 가 공유한다.

export const SERVICE_NAME = 'flori-ai-web';

// pino 숫자 레벨 → api logstash 와 동일한 대문자 문자열(INFO/WARN/ERROR).
export function levelFormatter(label: string): { level: string } {
  return { level: label.toUpperCase() };
}

// KST(+09:00, 한국은 DST 없음) ISO8601 문자열. 예: 2026-06-27T13:05:21.300+09:00
export function kstIso(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('Z', '+09:00');
}

// pino timestamp 옵션용 — ',"@timestamp":"...+09:00"' 조각(',"key":value' 형태 반환 계약).
export function kstTimestamp(date: Date): string {
  return `,"@timestamp":"${kstIso(date)}"`;
}

// 스택 트레이스 새니타이즈 — 로컬 경로/이메일/토큰/비번/키를 마스킹하고 20줄로 제한.
// Discord(logger.ts)·구조화 stdout(logger.ts·instrumentation.ts) 양쪽이 공유한다.
// [보안] 구조화 로그가 docker logs/CloudWatch 로 수집되므로 raw 스택을 그대로 남기지 않는다.
export function sanitizeErrorStack(stack: string): string {
  return stack
    .replace(/\/Users\/[^/]+/g, '/home/user')
    .replace(/[A-Za-z0-9_-]+@[A-Za-z0-9.-]+/g, '[EMAIL]')
    .replace(/token[:=]\s*['"]?[^\s'"]+/gi, 'token=[REDACTED]')
    .replace(/password[:=]\s*['"]?[^\s'"]+/gi, 'password=[REDACTED]')
    .replace(/key[:=]\s*['"]?[^\s'"]{20,}/gi, 'key=[REDACTED]')
    .split('\n')
    .slice(0, 20)
    .join('\n');
}
