---
spec_id: SPEC-ROUTE-ADMIN-001
version: "0.1.0"
created: "2026-05-04"
---

# 구현 계획: SPEC-ROUTE-ADMIN-001

## 구현 전략

본 작업은 **brownfield 마이그레이션 마무리** 성격이다. 36개 파일은 이미 `git mv`로 staged, 9개 파일은 working tree에서 링크 갱신 완료. 따라서 DDD 사이클(ANALYZE → PRESERVE → IMPROVE) 중 PRESERVE에 무게 중심을 두며, 잔존 흔적 제거와 검증에 집중한다.

### ANALYZE

- 현재 staged + working tree 상태가 REQ-ROUTE-001 ~ REQ-ROUTE-005를 충족하는지 정적 분석.
- 옛 경로 (`/sales`, `/dashboard` 등) 잔존 참조를 grep으로 전수 조사.
- middleware matcher가 `/admin/*`을 정확히 커버하는지 확인.

### PRESERVE

- 36개 이동된 파일의 내용은 절대 수정하지 않는다 (git diff로 이동만 검증).
- 멀티테넌시 invariants(`requireAuth()`, `user_id` 삽입, RLS)는 손대지 않는다.
- 컴포넌트 비즈니스 로직, Server Actions 시그니처, DB 스키마는 변경하지 않는다.

### IMPROVE

- 누락된 링크 갱신이 있다면 추가 패치 (예: 푸시 알림 클릭 핸들러의 URL).
- middleware matcher 패턴 정확성 보강 (정규식 검증).
- 옛 URL 영구 리다이렉트는 사용자 결정 후 후속 SPEC에서 처리.

## 작업 분해

### Task 1: 잔존 (dashboard) 디렉토리 git rm 확인

**우선순위: High**
**영향 파일:** 36개 staged 파일 (`src/app/(dashboard)/...`)

- `git status`로 `(dashboard)/` 하위 파일이 모두 deletion staged인지 확인
- `git diff --cached --stat`로 36개 D 라인 + `(admin)/admin/` 36개 A 라인이 1:1 대응되는지 확인
- 디스크 상에 `src/app/(dashboard)/` 디렉토리가 더 이상 존재하지 않는지 `ls`로 확인

### Task 2: 모든 내부 링크 grep 전수 검증

**우선순위: High**
**영향 파일:** `src/**/*.{ts,tsx}`, `public/sw.js`

- 옛 경로 패턴 검색:
  - `rg -n "['\"]\\/(sales|expenses|customers|calendar|gallery|deposits|insights|settings|dashboard)(\\/|['\"])"` → 어드민 관련 string literal이 `/admin/` prefix 없이 등장하면 누락
  - `rg -n "router\\.push\\(['\"]\\/" src/` → 클라이언트 네비게이션 누락 검사
  - `rg -n "redirect\\(['\"]\\/" src/` → 서버 리다이렉트 누락 검사
- `public/sw.js`의 푸시 알림 클릭 핸들러 URL이 `/admin/*` 형태인지 확인 (REQ-ROUTE-004 + What NOT to Build #1: sw.js 재배포는 금지하므로 갱신 필요 시 별도 결정).
- 매치된 항목이 의도된 것(`(public)` 라우트, login 등)인지 수동 분류.

### Task 3: middleware.ts 인증 경계 검증

**우선순위: High**
**영향 파일:** `src/middleware.ts`, `src/lib/supabase/middleware.ts`

- `matcher` 패턴이 `/admin/:path*` 또는 동등한 정규식을 포함하는지 확인.
- 공개 경로(`/`, `/(public)/*`, `/login`, `/api/cron/*`, `/api/internal/*`)가 matcher에서 제외되는지 확인.
- 인증 검증 분기에서 미인증 시 `redirect('/login')`이 호출되는지 확인.
- staged + working tree 변경분의 diff를 읽고 의도와 일치하는지 검증.

### Task 4: manifest.ts start_url 변경 검증

**우선순위: Medium**
**영향 파일:** `src/app/manifest.ts`

- `start_url: '/admin'` (또는 `/admin/`)으로 설정되었는지 확인.
- `scope` 필드가 존재한다면 `/admin/`을 포함하는지 확인.
- PWA 설치 후 진입점이 어드민 대시보드가 되도록 의도가 일관되는지 확인.

### Task 5: login/actions.ts redirect 경로 검증

**우선순위: Medium**
**영향 파일:** `src/app/login/actions.ts`

- 로그인 성공 시 호출되는 `redirect()` 인자가 `/admin`(또는 `/admin/`)인지 확인.
- 로그아웃 시 redirect 경로가 `/login` 또는 `/`(공개 홈)인지 확인 (정책에 따라).

### Task 6: not-found.tsx 링크 갱신 검증

**우선순위: Low**
**영향 파일:** `src/app/not-found.tsx`

- "홈으로" 또는 "대시보드로" 복귀 링크가 `/admin`을 가리키는지 확인.
- 공개 홈으로 돌아가야 하는 경우와 어드민 홈으로 돌아가야 하는 경우의 분기 정책 검토 (현재는 어드민 사용자가 잘못된 어드민 URL에 접근한 경우를 가정).

### Task 7: e2e smoke test 5종 수행

**우선순위: High**
**영향 파일:** 런타임 검증 (테스트 코드 추가는 별도 SPEC)

- spec.md의 "Manual smoke test 시나리오 5개" 항목을 순차 실행.
- 각 시나리오의 결과(URL, 상태 코드, 렌더링 내용)를 캡처하여 acceptance.md의 Given/When/Then과 대조.
- 실패 시 원인 파일을 acceptance edge case로 격상하여 추가 패치.

## 기술 제약

- **Next.js 16 App Router 라우트 그룹** — 괄호 폴더 `(name)`은 URL에 포함되지 않으므로 `(admin)/admin/sales/page.tsx` ⇒ `/admin/sales` URL이 보장된다. 라우트 그룹 변경은 정적 라우팅 트리 재계산을 유발하므로 빌드 시 잔존 충돌이 자동 검출된다.
- **middleware matcher 정확성** — Next.js 미들웨어 matcher는 정규식 또는 path 패턴을 받는다. 너무 넓으면 공개 경로까지 인증 검증을 트리거하여 무한 리다이렉트 발생 위험. 너무 좁으면 보안 경계 누락. 본 SPEC은 `/admin/*`만 커버하도록 한정.
- **Public/Admin 분리** — `(public)`과 `(admin)/admin`은 동등한 라우트 그룹 레벨이며, 둘 다 `src/app/layout.tsx`(루트 레이아웃)을 상속한다. 각 그룹의 layout.tsx가 독립된 UI 셸을 제공한다.
- **PWA scope** — manifest의 `start_url`과 `scope`가 어드민 영역을 명확히 표현해야 PWA 설치 시 어드민 사용자만의 단축 진입을 보장.

## 위험 분석

### 위험 1: 누락된 링크 (Medium)

**증상:** 푸시 알림 클릭 핸들러(`public/sw.js`)나 동적 string concat URL이 옛 경로를 사용해 404 발생.
**완화:** Task 2 grep 전수 조사. 의심되면 한 번 더 수동 검토. sw.js는 What NOT to Build #1에서 재배포 금지로 묶여 있으므로 변경이 정말 필요하면 별도 SPEC.

### 위험 2: middleware matcher 패턴 오류 (High)

**증상:** matcher가 `/admin/*`을 매칭하지 못해 미인증 사용자도 어드민 페이지 진입 가능.
**완화:** Task 3에서 matcher 패턴 명시 검증. smoke test 시나리오 2(비인증 → `/admin/sales` → `/login`)로 런타임 확인.

### 위험 3: 옛 URL 북마크 사용자 (Low)

**증상:** 사용자가 `/sales` 같은 옛 URL을 북마크해뒀다면 마이그레이션 후 404.
**완화:** 영구 리다이렉트(301) 추가는 본 SPEC out-of-scope이지만, 사용자 영향이 크다면 후속 SPEC `SPEC-ROUTE-ADMIN-002`로 분리해 `next.config.ts`의 `redirects()` 옵션 또는 `rewrites()`로 처리.

### 위험 4: manifest 갱신 후 PWA 캐시 잔존 (Low)

**증상:** 기존 PWA 설치 사용자의 브라우저가 이전 manifest를 캐시하고 있어 `start_url`이 즉시 반영되지 않음.
**완화:** 사용자 안내 또는 manifest 버전 쿼리 파라미터 추가. 본 SPEC에서는 정보 제공만 하고 즉시 처리 강제 안 함.

### 위험 5: 36개 staged 파일 중 conflict 누락 (Low)

**증상:** `git mv`가 인식되지 않은 파일이 일부 있어 `(dashboard)`에 잔존하고 빌드 시 두 개 같은 라우트가 생성됨.
**완화:** Task 1에서 `git status`와 `ls` 양쪽으로 대조. Next.js는 같은 URL 두 개의 라우트를 빌드 에러로 처리하므로 자동 보호.

## 참조 구현

- 현 codebase: `src/app/(public)/layout.tsx`, `src/app/(public)/page.tsx` — 동등 레벨 라우트 그룹 분리 패턴 (이미 `(public)` 그룹이 도입되어 있어 참조 가능).
- 현 codebase: `src/middleware.ts` + `src/lib/supabase/middleware.ts` — 인증 경계의 1단 방어선 패턴.
- Next.js 공식 문서: App Router Route Groups (https://nextjs.org/docs/app/building-your-application/routing/route-groups). 라우트 그룹의 URL 비포함 규칙과 layout 분리 사용법.
- Next.js 공식 문서: Middleware matcher (https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher). matcher 패턴 작성법과 예외 처리.
- 본 프로젝트의 `.moai/project/structure.md` "라우트 그룹" 절 — `(admin)`, `(public)`, `login`, `api/*` 분리 의도 정리됨.
