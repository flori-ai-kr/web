---
id: SPEC-ROUTE-ADMIN-001
version: "0.1.0"
status: "draft"
created: "2026-05-04"
updated: "2026-05-04"
author: "MoAI Orchestrator"
priority: "high"
issue_number: 54
---

# SPEC-ROUTE-ADMIN-001: 어드민 라우트 (admin)/admin 으로 이동

## HISTORY

- 2026-05-04 v0.1.0: 초안 작성 — `feature/init-website` 브랜치에서 진행 중인 라우트 마이그레이션의 사양화. 36개 파일은 이미 `git mv`로 staged, 9개 파일은 working tree에 링크 갱신 변경사항이 존재하는 brownfield 상태를 반영.

## 배경

현재 어드민 페이지는 `src/app/(dashboard)/*` 라우트 그룹에 있어 URL이 루트(`/`, `/sales`, `/customers` 등)를 점유하고 있다. 공개 홈페이지(`(public)`) 추가를 위해 루트 `/`를 마케팅 사이트에 양보하고, 어드민은 `/admin/*` URL로 이전해야 한다. Next.js App Router의 라우트 그룹 기능을 활용해 `(admin)/admin` 구조로 재배치하면 URL prefix와 인증 경계, 레이아웃을 동시에 분리할 수 있다. 본 SPEC은 이미 staged된 36개 파일과 link 갱신이 적용된 9개 파일의 변경 의도와 검증 기준을 사양화하여 진행 중인 작업을 안전하게 마무리한다.

## 목표 / 비목표

### 목표

- `/admin/*` URL 하에서만 어드민 기능이 동작하도록 라우트 그룹을 `(admin)/admin`으로 통일
- `(public)`이 루트 `/`를 점유할 수 있도록 어드민 라우트와 URL space를 명확히 분리
- 미들웨어가 `/admin/*` 경로에 대해 인증 검증을 수행하고, 미인증 사용자를 `/login`으로 리다이렉트
- 모든 내부 링크(Sidebar, BottomNav, Header, manifest, login redirect, not-found)를 `/admin/*` 형태로 갱신

### 비목표

- 인증 흐름 자체 변경 (Supabase Auth 쿠키 기반 세션 유지 그대로)
- DB 스키마, RLS 정책, Server Action 시그니처 변경
- 컴포넌트 내부 비즈니스 로직 수정 (이동만 수행, 로직 손대지 않음)
- 옛 URL (`/sales`, `/customers` 등)에 대한 영구 리다이렉트(301) 자동 설정 — 정책 결정 후 별도 처리

## EARS 요구사항

### REQ-ROUTE-001 [Ubiquitous]

시스템은 `(admin)/admin/*` 라우트 그룹에서만 어드민 페이지를 제공한다. `(dashboard)` 라우트 그룹은 더 이상 존재하지 않으며, 모든 어드민 페이지(대시보드, 매출, 지출, 고객, 캘린더, 사진첩, 입금 대조, 인사이트, 설정)는 `src/app/(admin)/admin/{route}/page.tsx` 패턴을 따른다.

### REQ-ROUTE-002 [Event-driven]

WHEN 사용자가 `/admin/*` 경로에 HTTP 요청을 보낼 때, THEN 미들웨어(`src/middleware.ts` → `src/lib/supabase/middleware.ts`)는 Supabase 쿠키 세션을 갱신하고 인증을 검증한 후, 유효 시 진입을 허용하고 무효 시 `/login`으로 302/307 리다이렉트한다.

### REQ-ROUTE-003 [State-driven]

WHILE 사용자가 인증된 상태일 때, IF 사용자가 루트 `/` 경로에 접근하면, THEN 시스템은 `/admin` 대시보드로 자동 리다이렉트하지 않고 `(public)` 라우트 그룹의 공개 홈페이지를 표시한다. 즉, 어드민과 공개 영역의 역할은 명확히 분리된다.

### REQ-ROUTE-004 [Ubiquitous]

시스템은 모든 내부 네비게이션 링크가 `/admin/*` 형태를 가리키도록 보장한다. 영향 컴포넌트: `Sidebar`, `BottomNav`, `Header`(아바타 메뉴), `manifest.ts`(`start_url`), `login/actions.ts`(로그인 성공 redirect), `not-found.tsx`(홈 복귀 링크). 어떠한 컴포넌트도 옛 경로(`/sales`, `/expenses` 등)를 직접 참조하지 않는다.

### REQ-ROUTE-005 [Unwanted behavior]

시스템은 `(dashboard)` 라우트 그룹에 잔존 파일이 존재하지 않도록 보장한다. IF working tree 또는 빌드 산출물에 `src/app/(dashboard)/` 경로가 존재하면, THEN 빌드 또는 정적 분석이 이를 검출하고 명시적으로 실패해야 한다. 실제 운영에서는 `git mv`로 36개 파일이 staged 상태이므로 이를 커밋함으로써 충돌이 자동 해소된다.

## [DELTA] 모듈별 변화

이 SPEC은 brownfield 마이그레이션 작업을 사양화하므로 변경 분류 마커를 사용한다.

### [EXISTING] 보존되는 모듈 (이동만 수행, 내용 무변경)

다음 36개 파일은 `git mv`를 통해 `src/app/(dashboard)/{path}` → `src/app/(admin)/admin/{path}`로 위치만 이동했다. 파일 내용 자체는 변경 없음.

- `(admin)/admin/layout.tsx`, `page.tsx`, `dashboard-client.tsx`, `loading.tsx`, `error.tsx`
- `(admin)/admin/sales/page.tsx`, `sales-client.tsx`, `components/{SalesSummary,SalesList,SaleFormDialog,SaleDetailDialog}.tsx`
- `(admin)/admin/expenses/page.tsx`, `expenses-client.tsx`, `components/ExpensesList.tsx`
- `(admin)/admin/customers/page.tsx`, `customers-client.tsx`, `components/{CustomerCard,CustomerFormDialog,CustomerDetailDialog}.tsx`
- `(admin)/admin/calendar/page.tsx`, `calendar-client.tsx`
- `(admin)/admin/gallery/page.tsx`, `gallery-client.tsx`
- `(admin)/admin/deposits/page.tsx`
- `(admin)/admin/insights/page.tsx`, `insights-client.tsx`
- `(admin)/admin/insights/follows/{page,follows-client,account-manager-dialog,post-detail-dialog}.tsx`
- `(admin)/admin/insights/trends/{page,trends-client}.tsx`
- `(admin)/admin/insights/scraps/{page,scraps-client}.tsx`
- `(admin)/admin/settings/page.tsx`, `components/bottom-nav-customizer.tsx`

### [MODIFY] 링크/경계 갱신이 필요한 모듈 (working tree 적용 완료)

다음 9개 파일은 working tree에서 이미 변경되어 있으며, 본 SPEC은 그 변경 의도를 사양화한다.

| 파일 | 변경 의도 | REQ |
|------|-----------|-----|
| `src/app/manifest.ts` | PWA `start_url`을 `/` → `/admin`으로 갱신 | REQ-ROUTE-004 |
| `src/app/login/actions.ts` | 로그인 성공 시 redirect 경로를 `/` → `/admin`으로 갱신 | REQ-ROUTE-002, REQ-ROUTE-004 |
| `src/app/not-found.tsx` | 홈 링크를 `/admin`으로 갱신 (어드민 잘못 접근한 경우 복귀용) | REQ-ROUTE-004 |
| `src/components/layout/Sidebar.tsx` | 모든 nav item href를 `/admin/*` prefix로 갱신 | REQ-ROUTE-004 |
| `src/components/layout/BottomNav.tsx` | 모바일 BottomNav href + `user_preferences.bottom_nav_items` 매핑 갱신 | REQ-ROUTE-004 |
| `src/components/layout/Header.tsx` | 헤더 내 링크(로고, 아바타 메뉴) `/admin/*` 갱신 | REQ-ROUTE-004 |
| `src/lib/supabase/middleware.ts` | matcher와 인증 검증 로직을 `/admin/*` 기준으로 갱신 | REQ-ROUTE-002 |
| `src/types/database.ts` | `user_preferences.bottom_nav_items`의 path 타입/주석을 `/admin/*` 기준으로 갱신 | REQ-ROUTE-004 |
| `src/app/globals.css` | 공개/어드민 분리에 따른 레이아웃 변수 미세 조정 (영향 작음) | 부수 |
| `next.config.ts` | 빌드/리다이렉트 설정 미세 조정 | 부수 |

### [REMOVE] 제거되는 모듈

`src/app/(dashboard)/` 디렉토리 전체와 그 하위 파일 36개. `git mv`로 인해 staged 상태에서 자동 제거됨. 커밋 후 디스크에서도 사라진다.

## 영향 받는 파일

### 그룹 A: 이동된 라우트 (36개, [EXISTING])

→ `[DELTA] 모듈별 변화 / [EXISTING]` 절 참조. 모두 `src/app/(admin)/admin/` 하위.

### 그룹 B: 링크/경계 갱신 (9개, [MODIFY])

- `src/app/manifest.ts`
- `src/app/login/actions.ts`
- `src/app/not-found.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Header.tsx`
- `src/lib/supabase/middleware.ts`
- `src/types/database.ts`
- `src/app/globals.css`

### 그룹 C: 인증 경계 (1개)

- `src/lib/supabase/middleware.ts` — matcher 패턴이 `/admin/*`을 정확히 커버해야 함. `src/middleware.ts`가 이 모듈을 호출.

### 그룹 D: 메타데이터 (1개)

- `src/app/manifest.ts` — `start_url`, `scope`이 PWA 설치 후 어드민 진입점을 결정.

추가로 `next.config.ts`는 부수적 빌드 설정 변경. 합산 영향 파일 수: 36(이동) + 9(수정) + 1(부수) = **46개**.

## What NOT to Build

본 SPEC의 명시적 out-of-scope (실수로 손대면 invariants 깨짐):

1. **PWA Service Worker 스코프 변경 금지** — `public/sw.js`는 그대로 유지. 푸시 알림 클릭 핸들러 안의 URL 처리 로직은 검증 대상이지만, sw.js 자체 재배포 또는 scope 재선언은 본 SPEC 범위 외.
2. **인증 로직 자체 변경 금지** — Supabase Auth 쿠키 흐름, `requireAuth()` 가드, `getUser()` 호출 패턴 모두 그대로. matcher 패턴만 갱신.
3. **DB 스키마/RLS 변경 금지** — 12개 멀티테넌시 테이블의 `user_id` 컬럼, RLS 정책(`auth.uid() = user_id`), 복합 unique 제약 모두 불변.
4. **컴포넌트 내부 비즈니스 로직 수정 금지** — 이동된 36개 파일은 위치만 변경. 함수 시그니처, JSX 트리, 상태 관리 로직 모두 동일.
5. **옛 URL 영구 리다이렉트 자동 설정 보류** — `/sales` → `/admin/sales` 같은 301 redirect는 사용자 결정 후 별도 추가. 현재는 404가 기본 동작.
6. **Server Actions 시그니처/import 경로 변경 금지** — `src/lib/actions/*`는 무관, 직접 import 패턴 유지.

## 보안/프라이버시 고려사항

### 멀티테넌시 invariants 보존 (NON-NEGOTIABLE)

- 모든 Server Action은 `requireAuth()` 가드를 그대로 유지하며, INSERT 시 `user_id: user.id` 삽입 패턴 변경 없음.
- RLS 정책 `auth.uid() = user_id`는 12개 테이블에서 동일하게 적용됨. 라우트 이동은 DB 레이어에 영향 없음.
- 공개 라우트 그룹 `(public)`은 어떠한 사용자별 데이터도 직접 표시하지 않으며, 만약 데이터 표시가 필요하다면 별도 SPEC으로 다뤄야 함.

### 인증 경계 강화

- `src/lib/supabase/middleware.ts`의 matcher가 `/admin/*`을 정확히 매칭해야 함. matcher 누락 시 미인증 사용자가 어드민 페이지에 접근하는 보안 결함 발생 가능.
- 3단 방어선(middleware → `requireAuth()` → RLS) 중 1단(middleware)만 변경. 2단·3단은 그대로 작동하므로 1단 우회되더라도 RLS가 데이터 유출 차단.
- 정적 분석/grep으로 `/dashboard` 또는 `/(dashboard)` 잔존 링크가 코드에 없는지 확인 (REQ-ROUTE-005).

### 프라이버시 invariants

- 고객 전화번호·이름은 `customers` 테이블 (멀티테넌시 12개 중 1개)에 저장, RLS로 보호. 라우트 이동과 무관하게 보호 경계 유지.
- 라우트 이동은 URL prefix만 바꾸므로 사용자가 우연히 다른 사용자의 고객 데이터에 접근하는 시나리오는 발생하지 않음.

## 검증 방법

### 자동 검증

1. **빌드 통과** — `pnpm build` (또는 `npm run build`) 성공. Next.js가 `(dashboard)` 잔존 파일을 발견하면 라우트 충돌로 빌드 실패하므로 자동 보호.
2. **타입 체크 통과** — `tsc --noEmit` 또는 `pnpm typecheck` 통과. `src/types/database.ts` 변경에 따른 타입 일관성 확인.
3. **lint 통과** — 기존 lint 설정에 위반 없음.
4. **Grep 검증** — `rg "['\"]/(dashboard|sales|expenses|customers|calendar|gallery|deposits|insights|settings)['\"]"`로 옛 경로 직접 참조가 없는지 확인. 매치 0건이어야 함 (단, "/sales", "/expenses" 등 일반 단어가 string literal로 다른 맥락에 등장하지 않는지는 수동 확인).

### Manual smoke test 시나리오 (5개)

1. 로그인 후 `/admin` 진입 → 대시보드가 정상 렌더링되는지 확인.
2. 비인증 상태에서 `/admin/sales` 직접 접근 → `/login`으로 리다이렉트되는지 확인.
3. 비인증 상태에서 루트 `/` 접근 → 공개 홈페이지가 200으로 표시되고, 어드민으로 자동 이동하지 않는지 확인.
4. 인증 상태에서 모바일 BottomNav 매출/예약/설정 탭 클릭 → 각각 `/admin/sales`, `/admin/calendar`, `/admin/settings`로 이동하는지 확인.
5. PWA 설치 후 홈 화면 아이콘 클릭 → `/admin`이 진입점으로 열리는지 확인 (manifest `start_url`).

## MX Tag Plan

- `src/lib/supabase/middleware.ts`: **@MX:ANCHOR** — 인증 경계의 핵심 진입점. matcher 패턴이 어드민 보호의 1단 방어선이므로 후속 변경 시 영향 추적 필수.
- `src/app/(admin)/admin/layout.tsx`: **@MX:NOTE** — 어드민 라우트 그룹의 공통 레이아웃 진입점. AppLayout(Sidebar + BottomNav)을 감싸는 책임을 명시.
- `src/app/manifest.ts`: **@MX:NOTE** — PWA `start_url`이 어드민 진입점을 결정하므로 라우트 prefix 변경 시 동시 갱신 필요함을 표시.
