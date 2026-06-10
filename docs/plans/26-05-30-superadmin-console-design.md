# 슈퍼어드민 콘솔 설계 (Superadmin / Operator Console)

> 작성일: 2026-05-30 · 상태: 설계 확정 · 대상 레포: `flori-ai/web` + `flori-ai/server`

## 1. 배경 / 목표

플랫폼 운영자(한상호) 전용 **운영 콘솔**을 신설한다. DB에 가까운 cross-tenant 운영 화면으로,
기존 점주(florist)용 `/admin/*` 대시보드와는 **목적·경로·권한이 모두 다르다**.

운영자가 한 화면에서 할 수 있어야 하는 것:

1. **cross-tenant 통계** — 전체 가입자/활성/온보딩/매출 입력량/구독 현황/검증 현황 집계
2. **사업자등록 승인** — PENDING 목록 → 첨부(등록증) 확인 → APPROVE/REJECT(사유) + 알림
3. **AI 기능 헬스 체크** — ai-server / litellm 헬스 프록시 (+ Langfuse best-effort 요약)
4. **핵심 테이블 열람 + 최소 운영 액션** — 유저/구독/검증 dense 조회, `is_active` 토글

## 2. 핵심 제약 (충돌 주의)

- **경로 충돌 금지**: 점주용 web 경로는 `(admin)/admin/*`. 운영자 콘솔은 별도 그룹 `(console)/console/*`.
- **권한**: server `User.isAdmin`(`users.is_admin`, default false) 재사용. 현재 커뮤니티 모더레이션에만 쓰임.
- **멀티테넌시 예외**: 일반 도메인은 `user_id` 격리가 HARD 규칙이지만, 운영 콘솔은 **의도적 cross-tenant**.
  → server에 admin 전용 엔드포인트를 별도로 두고 `@RequiresAdmin`로 강하게 보호한다.
- **이중 게이트**: web 가드(레이아웃) + server 인터셉터 재검증. **진짜 방어선은 server**.

## 3. 아키텍처

```
web (console)/console/*  ──apiFetch(JWT)──▶  server /admin/**  (@RequiresAdmin)
   requireAdmin() 가드                         AdminInterceptor → User.isAdmin 재검증
                                              └─ AiHealthService ──RestClient──▶ ai-server /health, litellm /health/liveliness
```

- web 경로: `(console)/console/*` (점주 `(admin)/admin/*` 완전 분리, 독립 셸·네비).
- server REST: 신규 패키지 `kr.ai.flori.admin`, 전 엔드포인트 `/admin/**` 프리픽스 + `@RequiresAdmin`.
  (server 내부 REST 경로이며 점주용 web 경로 `/admin`과는 무관)

## 4. 서버 설계 (`flori-ai/server`)

### 4.1 Admin 게이트 — 채택안 A

`@RequiresAdmin` 어노테이션 + `AdminInterceptor` (기존 `verification/gating/BusinessVerifiedInterceptor` 패턴 미러).

- 요청마다 `TenantContext.currentUserId()`로 `User` 조회 → `isAdmin == false`면 403.
- JWT 변경 없음(운영자 1명이라 요청당 DB 조회 비용 무관), 기존 게이팅 컨벤션과 일치.
- 인터셉터는 핸들러/클래스의 `@RequiresAdmin` 유무로 동작. `admin` 컨트롤러는 클래스에 `@RequiresAdmin`.
- 서비스 빈은 `ObjectProvider` 지연 주입(슬라이스 테스트 보호) — 기존 패턴 동일.

> 대안 B(JWT 클레임 `ROLE_ADMIN` + `@PreAuthorize`)는 재로그인 필요·JwtTokenProvider 수정 부담으로 보류.
> 대안 C(서비스 메서드 수동 `requireAdmin()`)는 누락 위험으로 보류.

### 4.2 컨트롤러 (모두 `@RequiresAdmin`, 신규 `kr.ai.flori.admin.controller`)

| 컨트롤러 | 엔드포인트 | 역할 |
|---|---|---|
| `AdminController` | `GET /admin/me` | 가드 확인용 — admin이면 `{ isAdmin: true }`, 아니면 403 |
| `AdminStatsController` | `GET /admin/stats/overview` | cross-tenant 집계 (4.4) |
| `AdminVerificationController` | `GET /admin/verifications?status={PENDING\|APPROVED\|REJECTED}` | 상태별 신청 목록(+유저 정보·등록증 URL) |
| | `POST /admin/verifications/{id}/approve` | `BusinessVerification.approve()` 호출 |
| | `POST /admin/verifications/{id}/reject` (body: `{reason}`) | `BusinessVerification.reject(reason)` 호출 |
| `AdminUserController` | `GET /admin/users?query=&page=&size=` | dense 유저 목록(구독·검증 상태 조인) |
| | `GET /admin/users/{id}` | 유저 상세 |
| | `POST /admin/users/{id}/active` (body: `{active}`) | `is_active` 토글 (최소 운영 액션) |
| `AdminSubscriptionController` | `GET /admin/subscriptions?status=&page=` | 구독 현황 목록 |
| `AdminHealthController` | `GET /admin/health/ai` | ai-server/litellm 헬스 프록시 (4.5) |

### 4.3 서비스 / 레포지토리

- `AdminStatsService` — 네이티브 SQL(JdbcTemplate), **의도적으로 `user_id` 미필터**(cross-tenant). 가드로만 보호.
- `AdminVerificationService` — 상태별 목록 조회 + 승인/거절 상태전이. 리뷰 후 `BusinessVerificationReviewedEvent` 발행
  → 신규 리스너가 Discord 알림(`DiscordChannel.VERIFICATION`) + 해당 유저 푸시(`PushService`/`PushDispatcher`). 기존 submit 리스너 미러.
- `AdminUserService` — JdbcTemplate 조인 projection(users ⨝ user_profiles ⨝ subscriptions ⨝ 최신 verification).
- `AiHealthService` — `RestClient`(DiscordNotifier가 쓰는 것과 동일)로 ai-server/litellm 핑, 상태+latency 집계. Langfuse best-effort.
- 레포 추가:
  - `BusinessVerificationRepository`: `findByStatusOrderByCreatedAtDesc(status, Pageable)`, `countByStatus(status)`
  - `SubscriptionRepository`: `countByStatus` 집계(또는 stats는 JdbcTemplate group-by)
  - `UserRepository`: `countByIsActive(active)` 등
- `AdminErrorCode`(`kr.ai.flori.admin.error`): `FORBIDDEN_NOT_ADMIN`, `VERIFICATION_NOT_FOUND`, `INVALID_VERIFICATION_STATE`.
  공통 케이스는 `CommonErrorCode` 재사용.

### 4.4 `/admin/stats/overview` 응답(안)

```kotlin
data class AdminOverviewResponse(
  val users: UserCounts,                 // total, active, onboarded
  val sales: SalesCounts,                // entryCount(전체 매출행 수), totalAmount(미수 제외), last30dCount
  val subscriptions: SubscriptionCounts, // active, inGrace, expired, none
  val verifications: VerificationCounts, // pending, approved, rejected
)
```
모든 카운트는 cross-tenant 단일 집계. 매출 총액은 dashboard와 동일하게 `payment_method <> 'unpaid'` 제외.

### 4.5 AI 헬스 프록시

- `ai.health.server-url`(default dev `http://localhost:8000`, 운영 `https://dev-ai.flori.ai.kr`),
  `ai.health.litellm-url`(litellm `/health/liveliness`) — `application.yml` + env override.
- 각 타깃 `GET` → `{ name, status: UP|DOWN, latencyMs, detail? }`. 타임아웃 짧게(2~3s), 실패는 DOWN으로 degrade.
- **Langfuse**: `LANGFUSE_*` 키가 있을 때만 핑/최근 트레이스 카운트(best-effort), 없으면 응답에서 생략(no-op).
- 비밀값 노출 금지 — 상태/지연만 반환.

## 5. 웹 설계 (`flori-ai/web`)

### 5.1 라우트 / 가드
- 신규 그룹 `src/app/(console)/console/`.
  - `layout.tsx` (서버 컴포넌트) → `requireAdmin()` 호출 + dense 콘솔 셸.
  - `lib/admin-guard.ts` → `requireAdmin()`: `apiFetch('/admin/me')` 호출, `UNAUTHORIZED`/403이면 `/admin`으로 redirect.
- `middleware.ts` 매처에 `/console` 추가(미인증 → `/login`). is_admin 검사는 레이아웃·서버가 담당.

### 5.2 페이지 (Dense DB 콘솔 톤 — shadcn Table 중심, 점주 Rose 톤과 시각 구분)
- `/console` — 통계 카드(유저/구독/검증/매출) + AI 헬스 상태 배너.
- `/console/verifications` — 상태탭(PENDING/APPROVED/REJECTED) 테이블 → 행 클릭 상세 다이얼로그
  (등록증 이미지/PDF 미리보기, 상호·사업자번호·대표자) → 승인 / 거절(사유 입력) 버튼.
- `/console/users` — dense 테이블(검색·페이지네이션, 구독/검증 상태 컬럼) + `is_active` 토글(확인 다이얼로그).
- `/console/subscriptions` — 구독 현황 목록.
- `/console/health` — AI 헬스 패널(수동 새로고침).

### 5.3 데이터 / 액션
- `src/lib/actions/admin-stats.ts` / `admin-verifications.ts` / `admin-users.ts` / `admin-subscriptions.ts` / `admin-health.ts`
  — `apiFetch`(JWT) + `withErrorLogging()` throw 패턴(기존 Server Action 컨벤션).
- `src/types/admin.ts` — 콘솔 응답 타입.
- page.tsx(서버)는 Server Action만 호출 → `*-client.tsx`로 전달(기존 패턴).

### 5.4 셸 / 네비
- 콘솔 전용 사이드/헤더(점주 BottomNav·Header 미사용). "운영툴" 느낌의 중립 톤으로 점주 화면과 구분.

## 6. 보안 / 부트스트랩

- **is_admin 부여(1회성)**: `UPDATE users SET is_admin = true WHERE email = 'hchsa77@gmail.com';`
  — 서버 DB 제어 작업이므로 **실행 직전 사용자 승인** 후 진행(비밀값 출력 금지).
- 이중 게이트: web `requireAdmin()` + server `@RequiresAdmin`(DB 재검증).
- AI 헬스 프록시는 상태/지연만 노출, 내부 호스트·키 비노출.
- cross-tenant 쿼리는 `admin` 패키지에만 존재하고 전부 `@RequiresAdmin` 하위.

## 7. 테스트 / 검증

- **server (TDD)**:
  - `AdminInterceptor` — admin vs 비admin 403 가드.
  - 검증 승인/거절 — `approve()`/`reject(reason)` 상태전이 + 이벤트 발행.
  - stats SQL — cross-tenant 집계 정확성.
- **web**: `requireAdmin()` 가드 + 핵심 Server Action vitest(라이트).
- **E2E**: 비admin 차단 + admin 흐름(통계 조회 → PENDING 승인 → 반영) 확인 후 증빙.
- 마무리: `/feature-finalize`(머지 요청 시 `--merge`), feature 브랜치 + safe-commit(`git add -A` 금지).

## 8. 스코프 / YAGNI

- **포함**: 위 4개 영역 전체(통계·검증 승인·AI 헬스·테이블 열람 + `is_active` 토글).
- **best-effort**: Langfuse 최근 트레이스 요약(키 있을 때만).
- **제외**: 유저 삭제 등 파괴적 작업, is_admin 부여 UI(부트스트랩은 SQL 1회).
- **실행 타이밍**: 코딩은 "세션 3 종료 후" feature 브랜치에서. 본 문서 단계까지는 spec→plan.

## 9. 영향 파일(예상)

**server (신규 `kr.ai.flori.admin`)**: `gating/RequiresAdmin.kt`, `gating/AdminInterceptor.kt`, `gating/AdminWebConfig.kt`,
`controller/Admin*Controller.kt`(6), `service/Admin*Service.kt`, `dto/Admin*Dtos.kt`, `error/AdminErrorCode.kt`,
`event/BusinessVerificationReviewedEvent.kt` + 리스너. 수정: `BusinessVerificationRepository`, `SubscriptionRepository`,
`UserRepository`, `application.yml`(ai.health.*).

**web**: `app/(console)/console/{layout,page}.tsx` + `verifications/`·`users/`·`subscriptions/`·`health/`(page + *-client + components),
`lib/admin-guard.ts`, `lib/actions/admin-*.ts`, `types/admin.ts`, `middleware.ts`(매처).
