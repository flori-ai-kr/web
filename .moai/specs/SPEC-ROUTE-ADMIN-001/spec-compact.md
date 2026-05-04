---
spec_id: SPEC-ROUTE-ADMIN-001
version: "0.1.0"
created: "2026-05-04"
note: "토큰 절감용 압축 버전. 전체 사양은 spec.md 참조."
---

# SPEC-ROUTE-ADMIN-001 (Compact): 어드민 라우트 (admin)/admin 으로 이동

## EARS 요구사항

- **REQ-ROUTE-001 [Ubiquitous]**: 시스템은 `(admin)/admin/*` 라우트 그룹에서만 어드민 페이지를 제공한다. `(dashboard)`는 더 이상 존재하지 않는다.
- **REQ-ROUTE-002 [Event-driven]**: WHEN 사용자가 `/admin/*` 경로에 접근할 때, THEN 미들웨어는 Supabase 세션 검증 후 유효 시 진입 / 무효 시 `/login` 리다이렉트한다.
- **REQ-ROUTE-003 [State-driven]**: WHILE 사용자가 인증된 상태일 때, IF 루트 `/` 접근 시, THEN 어드민으로 리다이렉트하지 않고 `(public)` 공개 홈페이지를 표시한다.
- **REQ-ROUTE-004 [Ubiquitous]**: 시스템은 모든 내부 링크(Sidebar, BottomNav, Header, manifest, login redirect, not-found)가 `/admin/*` prefix를 가리키도록 보장한다.
- **REQ-ROUTE-005 [Unwanted behavior]**: IF `(dashboard)` 잔존 파일이 빌드 산출물에 존재하면, THEN 빌드/정적 분석이 명시적으로 실패해야 한다.

## Acceptance 시나리오 (Given/When/Then)

1. **인증 사용자 어드민 진입** (REQ-001, REQ-002): Given 인증 사용자, When `/admin` 접근, Then 200 OK + 대시보드 렌더링.
2. **비인증 차단** (REQ-002): Given 비인증, When `/admin/sales` 접근, Then `/login`으로 302/307 리다이렉트, 어드민 데이터 미노출.
3. **공개 홈 점유** (REQ-003): Given 모든 사용자, When `/` 접근, Then 200 OK + 공개 홈페이지 (어드민으로 자동 이동 안 함).
4. **BottomNav admin prefix** (REQ-004): Given 인증 사용자 모바일, When BottomNav "매출" 탭, Then `/admin/sales` 이동.
5. **Edge: 옛 URL 접근** (TBD): Given 옛 북마크 `/sales`, When 직접 접근, Then 404 또는 301 리다이렉트 (정책 결정 필요).
6. **Performance**: 미들웨어 처리 시간 Vercel Edge P95 < 50ms.

## 영향 받는 파일 (총 46개)

### 그룹 A: 이동된 라우트 36개 (이미 git mv로 staged, 내용 무변경)

`src/app/(admin)/admin/` 하위 — layout, page, dashboard-client, loading, error, sales(5), expenses(3), customers(4), calendar(2), gallery(2), deposits(1), insights(11: page+client+follows×4+trends×2+scraps×2), settings(2).

### 그룹 B: 링크/경계 갱신 9개 (working tree 적용 완료)

- `src/app/manifest.ts` — `start_url: '/admin'`
- `src/app/login/actions.ts` — 로그인 성공 redirect `/admin`
- `src/app/not-found.tsx` — 홈 링크 `/admin`
- `src/components/layout/Sidebar.tsx` — nav href 갱신
- `src/components/layout/BottomNav.tsx` — nav href + user_preferences 매핑 갱신
- `src/components/layout/Header.tsx` — 헤더 링크 갱신
- `src/lib/supabase/middleware.ts` — matcher `/admin/*`
- `src/types/database.ts` — bottom_nav_items path 타입/주석
- `src/app/globals.css` — 부수적 스타일 조정

### 그룹 C: 인증 경계 1개

`src/lib/supabase/middleware.ts` (그룹 B와 중복) — 1단 방어선.

### 그룹 D: 메타데이터 1개

`src/app/manifest.ts` (그룹 B와 중복) — PWA 진입점.

추가: `next.config.ts` (부수 빌드 설정).

## What NOT to Build

1. **PWA Service Worker scope 변경 금지** — `public/sw.js` 그대로 유지.
2. **인증 로직 자체 변경 금지** — Supabase Auth 흐름, `requireAuth()`, `getUser()` 패턴 동일.
3. **DB 스키마/RLS 변경 금지** — 12개 멀티테넌시 테이블의 `user_id`, RLS, 복합 unique 모두 불변.
4. **컴포넌트 내부 비즈니스 로직 수정 금지** — 이동된 36개 파일은 위치만 변경.
5. **옛 URL 영구 리다이렉트 자동 설정 보류** — 정책 결정 후 별도 처리.
6. **Server Actions 시그니처/import 경로 변경 금지** — `src/lib/actions/*` 무관, 직접 import 패턴 유지.
