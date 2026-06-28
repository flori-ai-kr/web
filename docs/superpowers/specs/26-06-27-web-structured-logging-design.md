# web 구조화 로깅 (pino) 설계

## 배경 / 목적

web 컨테이너에 **구조화 stdout 로그**를 추가한다. 현재 web에는 구조화 애플리케이션 로그가 없고, 에러는 Discord 웹훅(`lib/logger.ts`)으로만 보고된다. 운영 가시성을 위해:

- **부팅**, **서버/렌더 에러**, **인증 핵심이벤트**를 JSON 한 줄/이벤트로 stdout에 남긴다.
- api(Kotlin/Spring)의 운영 로그 모양(LogstashEncoder JSON: `@timestamp`(KST)·`level`·`message`·`service`)과 **같은 JSON 형태**로 맞춰, 수집·검색 시 일관성을 가진다.
- 로그 메시지는 api 컨벤션처럼 이모지를 접두로 사용(🚀/❌/🔑 등) — 가독성용, 필드가 아닌 message 내용.

**비범위(non-goal)**: HTTP access 로그는 **nginx**가 JSON으로 담당(별 작업). pino는 access 로깅을 하지 않는다(중복 방지). Discord 알림 로직은 변경하지 않는다.

## 런타임 제약

- web은 Next.js 16 standalone(Node 런타임)으로 EC2 Docker에서 동작 → 컨테이너 stdout이 곧 `docker logs web-<color>`.
- **미들웨어(`src/middleware.ts`)는 Edge 런타임** → pino(Node API 의존) 사용 불가. pino는 nodejs 런타임 코드(route handler·server action·instrumentation register)에서만 import한다.

## 컴포넌트

### 1) `src/lib/log.ts` — pino 로거 (server-only)

- `import 'server-only'` 로 클라이언트 번들 유입 차단.
- 트랜스포트 미사용(worker-thread 트랜스포트는 Next standalone 번들에서 깨질 수 있음) → 기본 destination(fd 1, stdout)으로 동기 JSON 출력.
- **logstash 모양 매칭** pino 옵션:
  - `messageKey: 'message'` (pino 기본 `msg` → `message`)
  - `base: { service: 'flori-ai-web' }` (api의 `customFields service` 대응)
  - `formatters.level`: 숫자 레벨 → 문자열 대문자(`INFO`/`WARN`/`ERROR`) — api logstash와 동일 표기
  - `timestamp`: KST(+09:00) ISO8601 을 `@timestamp` 키로 출력 (api `<timeZone>Asia/Seoul</timeZone>` 대응)
- 출력 예:
  ```json
  {"@timestamp":"2026-06-27T13:05:21.300+09:00","level":"INFO","message":"🚀 web 시작","service":"flori-ai-web","env":"production","event":"boot"}
  ```
- 순수 헬퍼는 분리해 단위 테스트 가능하게 한다:
  - `levelFormatter(label: string): { level: string }` — 대문자화
  - `kstTimestamp(date: Date): string` — `,"@timestamp":"...+09:00"` 조각 생성
- pino는 **standalone 번들에 포함**(트랜스포트 미사용이라 번들 안전). `serverExternalPackages: ['pino']`는 쓰지 않는다 — 프리렌더되는 페이지 그래프(`(billing)/layout.tsx` → `signOut` → `lib/log`)에서 external 모듈(`pino-<hash>`) 해석 실패로 빌드가 깨진다(검증 완료).

### 2) `src/instrumentation.ts` — Next 16 표준 훅

- `export async function register()`:
  - `process.env.NEXT_RUNTIME === 'nodejs'` 일 때만 `await import('./lib/log')` 후 부팅 로그 1회: `🚀 web 시작` + `{ event:'boot', env, appVersion }`.
  - Edge/기타 런타임에서는 no-op (pino import 자체를 안 함).
- `export async function onRequestError(error, request, context)`:
  - nodejs 런타임: `await import('./lib/log')` → `❌ 서버 에러` error 로그 + `{ event:'request_error', routePath, routeType, method }` + 에러 메시지/스택(새니타이즈).
  - Edge 런타임: `console.error(JSON.stringify({...}))` 폴백(최소 구조화).
- onRequestError는 RSC·route handler·SSR 서버 에러를 중앙에서 포착(클라이언트 에러바운더리와 별개).

### 3) 이벤트 배선

**에러 (호출부 변경 0)**
- `src/lib/logger.ts` `reportError()` 안에서 pino error 한 줄을 **항상** 먼저 emit(개발/웹훅 미설정으로 early-return 하기 전에). 동적 import로 Edge 안전.
- 효과: `withErrorLogging()`(`lib/errors.ts`)로 감싼 모든 server action 에러 + 에러바운더리가 부른 에러가 구조화 로그로도 남는다. Discord 전송은 그대로.

**인증 핵심이벤트 (positive, 저빈도·고신호)**
| event | 위치 | 메시지 |
|-------|------|--------|
| `auth.login` | `src/app/auth/callback/[provider]/route.ts` (`setAuthTokens` 직후, `/admin` redirect 전) | `🔑 로그인 성공` + `{ provider }` |
| `auth.logout` | `src/lib/actions/auth.ts` `_signOut()` | `👋 로그아웃` |
| `auth.onboarding_complete` | `src/app/onboarding/actions.ts` `completeRegistration()` (성공 분기) | `🎉 온보딩 완료` |

- **PII 최소화**: user id/이메일/전화번호는 로그에 넣지 않는다. `event`·`provider` 등 비식별 필드만. (추적이 필요하면 추후 해시 id 도입.)

## 런타임 안전 요약

- log.ts를 import하는 곳: instrumentation(동적·nodejs 가드), `lib/logger.ts`(동적), auth callback route(정적, nodejs), `_signOut`/`completeRegistration` server action(정적, nodejs).
- 미들웨어(Edge)는 log.ts를 import하지 않는다.

## 의존성 / DX

- `pino`(^10.x)를 **prod dependency**로 추가. 두 락파일(pnpm-lock.yaml·package-lock.json) 모두 동기화(로컬 pnpm + CI npm ci 혼용 규칙).
- **[보안] 스택 새니타이즈**: pino 경로도 Discord 경로와 동일하게 `sanitizeErrorStack()`(경로/이메일/토큰/비번/키 마스킹 + 20줄)을 적용한다. raw `err` 객체는 직렬화하지 않고 `errMessage`·`errStack` 문자열만 기록. `log.ts` 의 `redact` 옵션은 2차 방어선.
- **이중 로깅 방지**: `onRequestError` 는 `AppError`(withErrorLogging 이 이미 reportError 로 처리했거나 예상된 도메인 에러)를 스킵한다.
- dev 환경도 동일 JSON 출력(pretty 트랜스포트 미도입 — standalone 리스크). 필요 시 후속 작업.

## 테스트

- `src/lib/__tests__/log.test.ts` (Vitest):
  - `levelFormatter('info') → { level: 'INFO' }`, `'error' → { level: 'ERROR' }`
  - `kstTimestamp(고정 Date)` → `+09:00` 포함 ISO 문자열, `@timestamp` 키
  - message key가 `message`인지(로거 출력을 stream 캡처해 검증하거나 옵션 단언)
- 이벤트/에러 배선: 로거를 spy해 `auth.login`·`request_error` 등 호출 인자 검증(가능 범위).

## 작업 순서(요약)

1. `pino` 의존성 추가 + lock 동기화 + `serverExternalPackages`
2. `src/lib/log.ts` (로거 + 순수 헬퍼)
3. `src/instrumentation.ts` (register + onRequestError)
4. `reportError`에 pino emit 추가
5. auth 3개 이벤트 배선
6. 단위 테스트
7. lint + build + test 통과 확인
