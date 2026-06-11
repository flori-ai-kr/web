# 전면 리팩터링 기록 (2026-06-11)

> 동작 중인 서비스를 깨지 않고 구조 부채를 해소한 작업의 기록.
> 기능 추가·UI 변경 없음. 브랜치 `refactor/with-fable5`, 커밋 34개.
> 설계: `docs/superpowers/specs/2026-06-11-web-full-refactor-design.md` / 계획: `docs/superpowers/plans/2026-06-11-web-full-refactor.md`

## 한눈에 보기

| 지표 | 전 | 후 |
|------|-----|-----|
| 최대 페이지 클라이언트 | calendar 1,639줄 (useState 30개) | 296줄 (4개 도메인 모두 ≤300) |
| e2e 테스트 | 없음 | Playwright 21개 (렌더 스모크 12 + CRUD 9) + CI job |
| 단위 테스트 | 542개 | 560개 (매퍼 9 + 훅 9 추가) |
| lint | 282 errors | 0 errors |
| `mapKotlinSale` 구현 | 3벌 (미묘하게 다름) | 1벌 (`lib/api/mappers/`) |
| 타입 정의 | `types/database.ts` 단일 424줄 | 도메인별 8개 파일 + 배럴 |

## 무엇이 문제였고, 왜, 어떻게 바꿨나

### 1. e2e 안전망이 없었다 → Playwright + mock BFF

**문제**: 리팩터링·기능 개발 후 회귀를 잡을 자동화 수단이 단위 테스트뿐이었다. 화면 전체가 실제로 그려지고 CRUD가 도는지는 수동 QA에 의존.

**제약**: 데이터 호출(`apiFetch`)이 Next 서버 → Kotlin BFF의 **서버 간 통신**이라 Playwright의 브라우저 모킹(`page.route()`)으로는 가로챌 수 없고, 로그인도 소셜 OAuth 전용이라 실 로그인 플로우를 탈 수 없다.

**해결**:
- `e2e/mock-bff/` — 외부 의존성 0인 순수 Node HTTP 서버. BFF의 ~40개 엔드포인트를 실제 액션 파일의 Kotlin DTO 미러에서 역산한 fixture로 응답하고, POST는 인메모리에 반영한다. `playwright.config.ts`의 webServer가 mock BFF(18080)와 `API_URL`을 mock으로 돌린 next(3110)를 함께 띄운다.
- 로그인은 서명 없는 JWT 쿠키 주입(`e2e/helpers/auth.ts`) — 서명 검증은 BFF 몫이라 mock 환경에선 통과. middleware의 exp 디코드만 만족시키면 된다.
- 미정의 엔드포인트는 404 + 콘솔 경고로 즉시 드러난다.
- 실행: `pnpm e2e` (로컬은 기동 중인 서버 재사용, CI는 빌드부터). CI에 e2e job 추가.

**의의**: 이후 모든 분해 작업이 이 21개 테스트를 게이트로 통과했다. 앞으로의 기능 개발·QA도 같은 안전망 위에서 진행하면 된다.

### 2. 거대 페이지 클라이언트 → 라우트 로컬 훅 + 컴포넌트 분해

**문제**: calendar 1,639줄(useState 30개·핸들러 16개·인라인 다이얼로그), expenses 895줄, customers 873줄, sales 594줄. 한 파일에 폼·다이얼로그·무한스크롤·필터·삭제가 혼재해 수정 범위 파악이 어렵고, AI 에이전트도 컨텍스트에 다 담기 힘들었다.

**해결 — 분해 원칙**:
- 페이지 클라이언트는 **조립(orchestration)만**: 데이터 props 수신, 훅 연결, 컴포넌트 배치. 목표 ≤300줄.
- 상태+로직 응집 단위 → 라우트 로컬 `hooks/use-*.ts`, 다이얼로그/FAB 등 JSX 블록 → 라우트 로컬 `components/*.tsx`.
- 훅이 상태·핸들러를 묶은 **컨트롤러 객체**를 반환하고, 다이얼로그 컴포넌트가 그걸 prop으로 받는 패턴 (예: `useReservationForm()` → `<ReservationFormDialog form={...} />`).
- JSX 구조·클래스명·문구는 그대로 이동만(시각 변화 0). 매 추출 단위마다 tsc+vitest, 도메인 완료 시 e2e 통과 후 커밋.

**결과**: calendar 1,639→259 / expenses 840→282 / customers 873→249 / sales 511→296.

### 3. 도메인 간 복붙 로직 → 공용 훅 (`src/hooks/`)

**문제**: 무한스크롤(offset·hasMore·stale 가드)+디바운스 검색이 sales/expenses에 거의 자구 동일하게 복붙, `?new=1` 빠른 등록 처리가 3곳에 복붙.

**해결**:
- `use-infinite-list` — 서버 페이지네이션 목록 상태 머신(리셋·디바운스 검색·stale 응답 가드·에러 콜백). sales/expenses 적용.
- `use-quick-create` — `?new=1` 1회 소비. sales/expenses/calendar 적용.
- 각 훅에 `renderHook` 단위 테스트.

**의도적으로 안 만든 것** (YAGNI):
- 범용 `use-url-filters`: 도메인마다 URL 파라미터 모델이 달라(매출은 year/month/day+3필터, 고객은 기간·등급) 억지 일반화 대신 라우트 로컬 훅(`use-sales-url-filters` 등)으로 분리만 했다.
- 범용 `use-dialog-controller`: 폼을 훅으로 추출하고 나니 남는 다이얼로그 상태가 단순 useState 1~2개라 범용 리듀서는 과추상화.
- gallery의 무한스크롤: 커서 기반 + 중복 id 추적으로 offset 모델과 달라 공용 훅 미적용(438줄로 기준 이내).

### 4. BFF DTO 매핑 중복 → `lib/api/mappers/`

**문제**: `mapKotlinSale`이 sales.ts·reservations.ts·dashboard.ts에 3벌 존재했고 photos 처리가 미묘하게 달랐다(계약 변경 시 한 곳만 고치는 사고 위험).

**해결**: Kotlin DTO 인터페이스 + camelCase→snake_case 매퍼를 `lib/api/mappers/{sales,reservations,expenses,customers}.ts`로 통합. photos는 "있으면 매핑" 동작으로 단일화(예약→매출 전환 응답은 photos가 null이라 결과 동일). 매퍼 단위 테스트 9개 추가. 액션 파일은 import만 한다.

### 5. 타입 단일 파일 → 도메인 분리

**문제**: `types/database.ts` 424줄에 전 도메인 타입과 상수(SCHEDULE_COLORS 등)가 혼재.

**해결**: `types/{sales,expenses,customers,gallery,reservations,insights,community,user}.ts`로 분리(내용 무변경). `database.ts`는 re-export 배럴로 유지해 기존 import 호환 — 신규 코드는 도메인 파일 직접 import 권장.

### 6. lint 282 errors → 0

**문제**: errors의 전부가 `.claude/worktrees/*/.next` **빌드 산출물을 ESLint가 긁은 것**. 진짜 소스 문제는 미사용 변수 소수였다.

**해결**: `eslint.config.mjs` globalIgnores에 `.claude/**`·Playwright 산출물 추가, 소스의 미사용 import/데드 핸들러 제거, `^_` 접두사 ignore 패턴 추가. 잔여 ~46 warnings는 점진 도입 중인 a11y·react-hooks 룰(기존 정책 유지).

### 7. 파일명·위치 비일관 → kebab-case + colocation 규칙

**문제**: PascalCase·kebab-case 파일명 혼재, 같은 도메인 컴포넌트가 `components/도메인`과 `app/.../components`에 흩어짐.

**해결**:
- 파일명 전부 **kebab-case** (`git mv`로 이력 보존, 컴포넌트 심볼명은 PascalCase 유지).
- 위치 규칙 확정: **한 라우트 트리 전용 → `app/.../<route>/components/`, 2개 이상 라우트 공유 → `components/<도메인>/`**. 이 규칙대로 gallery 6·community 8·expenses 2·insights 2·sales 1개 이동, 공유 컴포넌트(category-badge, sale-photo-modal, customer-autocomplete, auth-header)는 유지. 미사용 배럴(index.ts) 3개 삭제.

## 검증 방법 (모든 단계 공통 게이트)

```bash
npx tsc --noEmit   # 0 errors
npm test           # 560 passed
npm run lint       # 0 errors
pnpm e2e           # 21 passed (Playwright)
```

추출/이동 단위마다 위 게이트 통과 후 아토믹 커밋 — 어느 시점이든 롤백 가능.

## 남은 일 (후속 권장)

- [ ] 500줄 초과 잔여 파일: `profile-client.tsx`(564), `recurring-expenses-section.tsx`(557), `onboarding-form.tsx`(532), `sale-photo-modal.tsx`(508) — 같은 패턴으로 분해 가능
- [ ] gallery 커서 기반 무한스크롤의 공용 훅 통합 검토 (use-infinite-list에 cursor 모드 추가)
- [ ] lint warnings(~46) 점진 해소 후 해당 룰 error 승격
- [ ] e2e 시나리오 확장: 설정(라벨 관리), 통계 탭 전환, 커뮤니티 작성 플로우
- [ ] `.claude/worktrees/{console-redesign,onboarding-console}` 고아 디렉터리 삭제 (git 미등록 잔여물, 12MB — 사용자 확인 필요)
