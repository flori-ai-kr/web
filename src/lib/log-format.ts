// 구조화 로그 포맷 순수 헬퍼 — server-only/pino 와 분리해 단위 테스트 가능하게 둔다.
// (log.ts 는 server-only + pino 라 vitest 에서 직접 import 불가.)

// pino 숫자 레벨 → api logstash 와 동일한 대문자 문자열(INFO/WARN/ERROR).
export function levelFormatter(label: string): { level: string } {
  return { level: label.toUpperCase() };
}

// KST(+09:00, 한국은 DST 없음) ISO8601 을 @timestamp 키 조각으로 생성.
// pino timestamp 옵션은 ',"key":value' 형태의 문자열을 반환해야 한다.
export function kstTimestamp(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `,"@timestamp":"${kst.toISOString().replace('Z', '+09:00')}"`;
}
