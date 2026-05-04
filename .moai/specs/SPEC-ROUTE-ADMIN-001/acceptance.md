---
spec_id: SPEC-ROUTE-ADMIN-001
version: "0.1.0"
created: "2026-05-04"
---

# 인수 기준: SPEC-ROUTE-ADMIN-001

본 문서는 SPEC-ROUTE-ADMIN-001의 완료 조건을 Given/When/Then 형식으로 정의한다. 각 시나리오는 REQ ID와 매핑되며, 모두 통과해야 SPEC이 완료된다.

## Given/When/Then 시나리오

### 시나리오 1: 인증 사용자의 어드민 대시보드 진입 (REQ-ROUTE-001, REQ-ROUTE-002)

- **Given** 유효한 Supabase 세션 쿠키를 가진 인증된 사용자가 있다
- **When** 사용자가 브라우저에서 `/admin` 경로에 접근한다
- **Then** 시스템은 `(admin)/admin/page.tsx`를 렌더링하여 200 OK 응답으로 대시보드 페이지를 반환한다
  - AppLayout(Sidebar + BottomNav)이 표시된다
  - dashboard-client.tsx가 정상 hydrate된다
  - 미들웨어가 `/login` 리다이렉트를 트리거하지 않는다

### 시나리오 2: 비인증 사용자의 어드민 라우트 차단 (REQ-ROUTE-002)

- **Given** Supabase 세션 쿠키가 없거나 만료된 비인증 사용자가 있다
- **When** 사용자가 `/admin/sales` 경로에 직접 접근한다 (또는 `/admin/customers`, `/admin/settings` 등 어떤 어드민 서브 라우트든)
- **Then** 미들웨어가 인증 누락을 감지하고 `/login` 경로로 302 또는 307 리다이렉트한다
  - 응답 헤더 `Location: /login`이 포함된다
  - 어드민 페이지의 어떠한 데이터도 노출되지 않는다 (페이지 본문이 클라이언트로 전달되지 않음)

### 시나리오 3: 공개 홈페이지의 루트 점유 (REQ-ROUTE-003)

- **Given** 인증/비인증 상태와 무관하게 모든 사용자
- **When** 사용자가 루트 `/` 경로에 접근한다
- **Then** 시스템은 `(public)/page.tsx`를 렌더링하여 200 OK로 공개 홈페이지를 반환한다
  - `/admin` 또는 `/admin/*`로 자동 리다이렉트되지 않는다
  - PublicHeader/Footer 레이아웃이 표시된다 (AppLayout이 아님)
  - 어떤 사용자별 데이터(매출, 고객 등)도 표시되지 않는다

### 시나리오 4: BottomNav 링크의 admin prefix 사용 (REQ-ROUTE-004)

- **Given** 인증된 사용자가 모바일/태블릿(lg 미만 뷰포트) 어드민 페이지에 머무는 중
- **When** 사용자가 BottomNav의 "매출" 탭을 탭한다
- **Then** 브라우저 URL이 `/admin/sales`로 변경되고 SalesPage가 렌더링된다
  - 동일하게 BottomNav의 다른 탭(예약/설정/대시보드 등)도 모두 `/admin/*` prefix를 사용한다
  - `user_preferences.bottom_nav_items`에 저장된 path도 `/admin/*` 형식이다

## Edge Case

### Edge Case 1: 옛 URL 직접 접근 (TBD — 정책 결정 필요)

- **Given** 사용자가 옛 어드민 URL `/sales` 또는 `/customers`를 북마크에 저장해 놓았다 (마이그레이션 이전 시점)
- **When** 사용자가 그 옛 URL에 직접 접근한다
- **Then** 다음 중 하나의 정책이 적용되어야 한다 (TBD: 사용자 결정 필요)
  - **옵션 A (현재 기본)**: Next.js 기본 404 페이지 또는 `not-found.tsx`가 표시된다. 사용자가 수동으로 `/admin/...`으로 이동해야 한다.
  - **옵션 B (권장 후보)**: `next.config.ts`의 `redirects()`로 `/sales` → `/admin/sales`(301 영구) 매핑을 9개 라우트(sales, expenses, customers, calendar, gallery, deposits, insights, settings, /)에 대해 추가하여 끊김 없이 이동.
  - **결정 기한**: 본 SPEC 머지 직전. 결정에 따라 `next.config.ts` 추가 변경이 발생할 수 있으며, 그 경우 본 SPEC v0.2.0으로 갱신하거나 `SPEC-ROUTE-ADMIN-002`로 분리.

## Performance Criterion

### 성능 기준 1: 미들웨어 응답 지연

- **Given** 인증 검증을 수행하는 미들웨어가 `/admin/*` 요청에 대해 동작 중
- **When** 사용자가 어드민 라우트에 접근한다
- **Then** Vercel Edge Runtime 기준 미들웨어 자체 처리(쿠키 파싱 + Supabase getUser 호출 + 분기)는 평균 50ms 이하를 달성해야 한다
  - 측정 위치: Vercel Function Logs > Edge Function > middleware
  - 측정 윈도우: 머지 후 24시간의 P95 latency
  - 임계 초과 시 캐시 전략 검토 또는 후속 SPEC으로 최적화

## 품질 게이트 (Definition of Done)

다음 항목이 모두 충족되어야 SPEC이 완료된다.

- [ ] `pnpm build` (또는 `npm run build`) 성공
- [ ] `tsc --noEmit` 또는 `pnpm typecheck` 통과
- [ ] `rg "['\"]\\/(sales|expenses|customers|calendar|gallery|deposits|insights|settings|dashboard)['\"]"`로 옛 경로 직접 참조가 0건 (단, 의도된 사용 — `(public)` 페이지나 string 비교 — 은 수동 분류 후 제외)
- [ ] `src/app/(dashboard)/` 디렉토리가 디스크에서 완전히 제거됨
- [ ] 시나리오 1~4 + Edge Case 1 + Performance Criterion 1을 모두 manual smoke test로 검증
- [ ] middleware matcher 패턴이 `/admin/*`을 정확히 커버하고 공개 경로를 매칭하지 않음을 코드 리뷰로 확인
- [ ] PWA manifest의 `start_url`이 `/admin`을 가리킴
- [ ] login 성공 redirect가 `/admin`을 가리킴
- [ ] 멀티테넌시 invariants(`requireAuth()` + `user_id` 삽입 + RLS) 변경 없음 — git diff 검토로 확인
- [ ] 본 SPEC의 What NOT to Build 항목(sw.js scope 변경, 인증 로직 변경, DB 변경, 비즈니스 로직 변경)이 실제로 변경되지 않았음을 git diff로 확인
