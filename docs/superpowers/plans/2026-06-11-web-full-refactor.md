# flori web 전면 리팩터링 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 동작·UI를 100% 보존하면서 flori web의 구조 부채(거대 클라이언트·복붙 패턴·매퍼 중복·타입 단일 파일·테스트 공백)를 해소하고 e2e 안전망을 구축한다.

**Architecture:** 안전망 먼저(lint 0 → Playwright+mock BFF e2e) → 리스크 낮은 정리(타입/매퍼) → 공용 훅 추출 → 거대 파일 분해 → 구조 통일 → 문서화. 매 단계 `tsc + vitest + lint (+ e2e)` 게이트 통과 후 아토믹 커밋.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright(@playwright/test), Node http(mock BFF). 의존성 추가는 **pnpm**.

**Spec:** `docs/superpowers/specs/2026-06-11-web-full-refactor-design.md`

**검증 게이트 (모든 Task 공통):**
```bash
npx tsc --noEmit          # 0 errors
npm test                  # 542+ pass
npm run lint              # 0 errors (Phase 0 이후)
pnpm e2e                  # Phase 1 이후
```

---

## Phase 0: lint 베이스라인

### Task 0.1: ESLint ignore 정비

**Files:** Modify: `eslint.config.mjs`

- [ ] `globalIgnores`에 `.claude/**` 추가 (스테일 worktree의 `.next` 산출물이 282 errors의 원인)
- [ ] `npm run lint 2>&1 | tail -3` → error 0 확인
- [ ] 남은 소스 워닝 중 자명한 것(unused vars 등 ~18개 fixable) 정리: `npx eslint --fix` 후 수동 확인
- [ ] 게이트 통과 → 커밋 `chore(web): ESLint ignore 정비 + 소스 워닝 정리`

### Task 0.2: 스테일 worktree 디렉터리 처리

- [ ] `.claude/worktrees/{console-redesign,onboarding-console}` — `git worktree list`에 미등록 확인됨. 내부에 커밋 안 된 변경이 있는지 확인만 하고 **삭제는 사용자 확인 후** (이 Task는 보고만, blocking 아님)

---

## Phase 1: Playwright e2e 안전망

### Task 1.1: Playwright 설치 + 설정

**Files:** Create: `playwright.config.ts`, `e2e/` 디렉터리. Modify: `package.json`(scripts), `.gitignore`

- [ ] `pnpm add -D @playwright/test && pnpm exec playwright install chromium`
- [ ] `playwright.config.ts`: `testDir: 'e2e'`, webServer 2개 배열 — ① mock BFF(`node e2e/mock-bff/server.mjs`, port 18080) ② next(`npm run build && npm run start` 또는 dev, port 3100, env `API_URL=http://localhost:18080`). `use.baseURL: 'http://localhost:3100'`
- [ ] scripts: `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`
- [ ] `.gitignore`: `playwright-report/`, `test-results/`

### Task 1.2: mock BFF 서버

**Files:** Create: `e2e/mock-bff/server.mjs`, `e2e/mock-bff/fixtures/*.json`

- [ ] 핵심 페이지의 page.tsx → 서버 액션 → apiFetch 경로를 역추적해 필요한 BFF 엔드포인트 목록 작성 (`grep -r "apiFetch" src/lib/actions/`)
- [ ] Node `http` 기반 단일 파일 서버: 경로별 fixture JSON 응답 + 등록(POST) 시 인메모리 배열에 반영. 외부 의존성 0
- [ ] 필수: `GET /me`(온보딩 완료 유저), `GET /sales`, `GET /expenses`, `GET /expenses/summary`, `GET /customers`, `GET /reservations`, `GET /schedules`, `GET /photo-cards`, `GET /settings/*`, `GET /statistics/*`, `GET /community/posts`, 대시보드용 엔드포인트
- [ ] 미정의 경로는 404 + 콘솔 경고(어떤 엔드포인트가 빠졌는지 즉시 보이게)

### Task 1.3: 인증 헬퍼 + 렌더 스모크

**Files:** Create: `e2e/helpers/auth.ts`, `e2e/smoke.spec.ts`

- [ ] `auth.ts`: `context.addCookies()`로 `flori_access`(이름은 `src/lib/api/cookie-names.ts` 기준) 더미 토큰 주입
- [ ] `smoke.spec.ts`: `/admin`(대시보드)·`/admin/sales`·`/admin/expenses`·`/admin/customers`·`/admin/calendar`·`/admin/gallery`·`/admin/statistics` 각각 — 페이지 진입, 핵심 헤딩/리스트 요소 visible, 콘솔 에러 0 검증
- [ ] 미인증 시 `/` → `/login` 리다이렉트 검증
- [ ] `pnpm e2e` 전체 통과 → 커밋 `test(web): Playwright e2e 기반 구축 (mock BFF + 렌더 스모크)`

### Task 1.4: 핵심 CRUD 플로우

**Files:** Create: `e2e/sales.spec.ts`, `e2e/expenses.spec.ts`, `e2e/customers.spec.ts`, `e2e/calendar.spec.ts`

- [ ] 매출: 등록 다이얼로그 오픈 → 입력 → 제출 → 목록 반영. 상세 오픈. 필터 변경 → URL 반영
- [ ] 지출: 등록 → 목록 반영. 검색 디바운스 동작
- [ ] 고객: 등록 → 카드 표시. 상세 다이얼로그
- [ ] 캘린더: 예약 등록 → 캘린더 표시. 완료 토글
- [ ] 통과 → 커밋 `test(web): 핵심 CRUD e2e 플로우 추가`

### Task 1.5: CI 통합

**Files:** Modify: `.github/workflows/ci.yml`

- [ ] e2e job 추가 (chromium만, `npx playwright install --with-deps chromium`). 단 CI는 npm 사용 — lockfile 정합성 확인(`package-lock.json` 갱신)
- [ ] 커밋 `ci(web): e2e job 추가`

---

## Phase 2: 타입 분리 + 매퍼 통합

### Task 2.1: types/database.ts 도메인 분리

**Files:** Create: `src/types/{sales,expenses,customers,reservations,gallery,insights,community,user,settings}.ts`. Modify: `src/types/database.ts`(re-export 배럴로 축소)

- [ ] 도메인별 타입+관련 상수를 각 파일로 이동 (선언 내용 변경 금지, 이동만)
- [ ] `database.ts`는 `export * from './sales'` 식 배럴로 유지(기존 import 무수정) — import 일괄 정리는 Phase 5에서 결정
- [ ] 게이트 통과 → 커밋 `refactor(web): types/database.ts 도메인별 분리`

### Task 2.2: Kotlin DTO 매퍼 통합

**Files:** Create: `src/lib/api/mappers/{sales,customers,expenses,reservations}.ts`. Modify: `src/lib/actions/{sales,reservations,customers,expenses}.ts`

- [ ] `sales.ts:78` vs `reservations.ts:83`의 `mapKotlinSale` diff 분석 — photos 처리 차이가 의도인지 판단
- [ ] KotlinDTO 인터페이스 + 매퍼 함수를 mappers로 이동, 액션 파일은 import만
- [ ] 매퍼 단위 테스트 추가 (`src/lib/api/mappers/__tests__/`)
- [ ] 게이트 통과 → 커밋 `refactor(web): Kotlin DTO 매퍼 lib/api/mappers로 통합`

---

## Phase 3: 공용 훅 추출

> TDD: 각 훅마다 ① renderHook 실패 테스트 → ② 구현 → ③ 통과 → ④ 클라이언트 1곳 적용 → ⑤ 게이트+e2e → 커밋. 한 번에 한 훅.

### Task 3.1: `use-url-filters`

**Files:** Create: `src/hooks/use-url-filters.ts`, `src/hooks/__tests__/use-url-filters.test.ts`

- [ ] API: `useUrlFilters<T extends Record<string, string[] | string>>(defaults)` → `{ filters, setFilter, clearFilters }` — 쉼표 직렬화, `router.replace` 동기화. 기존 sales/expenses 동작과 동일하게
- [ ] sales → expenses → customers 순 적용, 각각 e2e 필터 시나리오 통과 확인

### Task 3.2: `use-infinite-list`

**Files:** Create: `src/hooks/use-infinite-list.ts`, 테스트 동일 패턴

- [ ] API: `useInfiniteList<T>({ initial, loadMore(offset), pageSize })` → `{ items, hasMore, isLoadingMore, sentinelRef, reset }` — 중복 id 가드 포함(gallery의 loadedIdsRef 패턴 흡수)
- [ ] expenses → sales → gallery 순 적용

### Task 3.3: `use-quick-create`

**Files:** Create: `src/hooks/use-quick-create.ts`

- [ ] API: `useQuickCreate(onOpen)` — `?new=1` 감지 → 콜백 1회 → `router.replace`로 파라미터 제거. sales/expenses/calendar 적용

### Task 3.4: `use-dialog-controller`

**Files:** Create: `src/hooks/use-dialog-controller.ts`

- [ ] API: `useDialogController<T>()` → `{ mode: 'closed'|'create'|'edit'|'detail'|'delete', target: T|null, openCreate, openEdit(t), openDetail(t), openDelete(t), close }` — useState 더미를 단일 reducer로
- [ ] Phase 4 분해 시 함께 적용 (기존 클라이언트 선반영은 calendar 제외 선택적)

각 Task 커밋: `refactor(web): use-* 훅 추출 + 적용`

---

## Phase 4: 거대 클라이언트 분해

> 공통 절차: ① 대상 파일 정독 → ② 추출 맵 작성(상태→훅, JSX 블록→컴포넌트) → ③ 한 커밋에 한 추출 단위 → ④ 게이트+해당 도메인 e2e. JSX·클래스명 변경 금지.

### Task 4.1: calendar-client.tsx (1,640줄 → ≤300줄)

**Files:** Modify: `src/app/(admin)/admin/calendar/calendar-client.tsx`. Create(예상): 같은 라우트 `components/reservation-form-dialog.tsx`, `components/schedule-form-dialog.tsx`, `components/time-select.tsx`, `hooks/use-reservation-form.ts`, `hooks/use-schedule-form.ts`

- [ ] 예약 폼(formData 9필드+pickups+suggestions+제출) → `use-reservation-form` + `reservation-form-dialog`
- [ ] 스케줄 폼 → `use-schedule-form` + `schedule-form-dialog`
- [ ] `TimeSelect`(88-124줄) → `components/time-select.tsx`
- [ ] 삭제 3종+미수완료 다이얼로그 상태 → `use-dialog-controller`
- [ ] 커밋 단위: 폼별 1커밋 + 마무리 1커밋

### Task 4.2: expenses-client.tsx (895줄)

- [ ] 무한스크롤 → `use-infinite-list`(Phase 3에서 완료됐으면 스킵), 고정비 이것만/이후모두 분기 → `use-recurring-edit` 훅, 폼 상태 → `use-expense-form`

### Task 4.3: customers-client.tsx (873줄)

- [ ] `DatePickerButton`(48-101줄) 인라인 컴포넌트 추출, 기간 선택 → 기존 `lib/period-range.ts` 재사용 검토, 필터/정렬 → `use-url-filters` 정리

### Task 4.4: sales-client.tsx (594줄) 정리

- [ ] 훅 적용 후 잔여 정리. 목표 ≤300줄

각 Task 후: 전체 게이트 + 해당 도메인 e2e. 커밋 `refactor(web): <도메인>-client 분해`

---

## Phase 5: 구조·이름 통일

### Task 5.1: kebab-case rename

- [ ] PascalCase 파일 목록 추출 → `git mv` 스크립트로 일괄 rename + import 경로 치환 (case-insensitive FS 주의: `git mv A.tsx a.tsx` 직접 가능)
- [ ] 게이트 통과 → 커밋 `refactor(web): 파일명 kebab-case 통일`

### Task 5.2: colocation 정리

- [ ] 단일 라우트 사용 컴포넌트는 `app/.../components/`로, 공유는 `components/<도메인>/`으로 — 사용처 grep으로 판정 후 `git mv`
- [ ] 게이트 통과 → 커밋 `refactor(web): 컴포넌트 위치 규칙 정리`

---

## Phase 6: 문서화

### Task 6.1: 리팩터링 기록

**Files:** Create: `docs/refactoring/26-06-11-full-refactor.md`

- [ ] 구성: 문제(근거 수치) → 왜 문제인가 → 어떻게 바꿨나(전/후 비교) → 검증 방법 → 남은 일. 사용자가 읽고 이해되는 수준으로

### Task 6.2: CLAUDE.md + conventions 갱신

- [ ] CLAUDE.md 구조 섹션·주요 파일 위치 갱신, `docs/conventions/26-06-11-hooks-convention.md`(공용 훅 사용 규칙), e2e 실행법 추가
- [ ] 커밋 `docs(web): 리팩터링 기록 + 컨벤션 갱신`

---

## Self-Review 결과

- Spec 커버리지: Phase 0~6 모두 Task로 매핑됨 ✓
- Phase 4 세부 코드는 의도적으로 디스커버리 단계(파일 정독→추출 맵)로 둠 — 1,640줄 파일의 추출 경계는 사전 확정이 오히려 부정확
- 타입/시그니처 일관성: 훅 API는 Phase 3에서 정의된 것을 Phase 4가 그대로 사용 ✓
