import 'server-only';
import pino from 'pino';
import { levelFormatter, kstTimestamp } from './log-format';

// ─────────────────────────────────────────────────────────────
// web 구조화 로거 (pino) — 컨테이너 stdout 에 JSON 한 줄/이벤트.
// api(Kotlin/Spring)의 LogstashEncoder JSON 모양과 맞춘다:
//   @timestamp(KST) · level(대문자 문자열) · message · service
// 트랜스포트 미사용(worker-thread 트랜스포트는 Next standalone 번들에서 깨질 수 있음)
//   → 기본 destination(fd 1, stdout) 동기 JSON.
// server-only: 클라이언트 번들 유입 차단. nodejs 런타임에서만 import 한다(Edge 불가).
// 순수 포맷 헬퍼는 log-format.ts 로 분리(테스트 가능).
// ─────────────────────────────────────────────────────────────

export const log = pino({
  messageKey: 'message',
  base: { service: 'flori-ai-web' },
  level: process.env.LOG_LEVEL?.toLowerCase() || 'info',
  formatters: {
    level: (label) => levelFormatter(label),
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  timestamp: () => kstTimestamp(new Date()),
});
