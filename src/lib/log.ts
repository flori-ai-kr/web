import 'server-only';
import pino from 'pino';
import { levelFormatter, kstTimestamp, SERVICE_NAME } from './log-format';

// ─────────────────────────────────────────────────────────────
// web 구조화 로거 (pino) — 컨테이너 stdout 에 JSON 한 줄/이벤트.
// api(Kotlin/Spring)의 LogstashEncoder JSON 모양과 맞춘다:
//   @timestamp(KST) · level(대문자 문자열) · message · service
// 트랜스포트 미사용(worker-thread 트랜스포트는 Next standalone 번들에서 깨질 수 있음)
//   → 기본 destination(fd 1, stdout) 동기 JSON.
// server-only: 클라이언트 번들 유입 차단. nodejs 런타임에서만 import 한다(Edge 불가).
// 순수 포맷 헬퍼는 log-format.ts 로 분리(테스트 가능).
//
// [보안] err 객체를 raw 직렬화하지 않는다(스택에 토큰/이메일/presigned URL 유출 방지).
//   호출부가 sanitizeErrorStack() 적용한 errStack 문자열만 넘긴다.
//   redact 는 향후 실수로 PII 필드를 넘겨도 마스킹하는 2차 방어선.
// ─────────────────────────────────────────────────────────────

export const log = pino({
  messageKey: 'message',
  base: { service: SERVICE_NAME },
  level: process.env.LOG_LEVEL?.toLowerCase() || 'info',
  formatters: {
    level: levelFormatter,
  },
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'email',
      'phone',
      'phoneNumber',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.email',
      '*.phone',
      '*.phoneNumber',
    ],
    censor: '[REDACTED]',
  },
  timestamp: () => kstTimestamp(new Date()),
});
