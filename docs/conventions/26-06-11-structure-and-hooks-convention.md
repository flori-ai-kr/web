# 구조·훅 컨벤션 (2026-06-11 전면 리팩터링에서 확정)

> 배경과 전/후 비교는 `docs/refactoring/26-06-11-full-refactor.md` 참조.

## 파일명

- **모든 .ts/.tsx 파일명은 kebab-case** (`sale-photo-modal.tsx`). 컴포넌트 심볼명은 PascalCase 유지(`export function SalePhotoModal`).
- 테스트는 대상과 같은 이름 + `.test.ts(x)`, 라우트 로컬 훅은 `use-*.ts`.

## 컴포넌트 위치 (colocation)

| 사용 범위 | 위치 |
|-----------|------|
| 한 라우트 트리 전용 (예: 커뮤니티 목록+상세+write 전부 `community/**`) | `app/.../<route>/components/` |
| 2개 이상 라우트 트리가 공유 (예: sale-photo-modal — sales+calendar) | `components/<도메인>/` |
| 전역 공통 (레이아웃·shadcn) | `components/layout/`, `components/ui/` |

- 새 컴포넌트는 일단 라우트 로컬로 시작하고, 두 번째 사용처가 생길 때 `components/<도메인>/`으로 승격한다.
- 배럴(index.ts)은 만들지 않는다 — 직접 경로 import.

## 페이지 클라이언트 분해 규칙

`*-client.tsx`는 **조립만** 담당한다(목표 ≤300줄): 서버 props 수신 → 훅 연결 → 컴포넌트 배치.

- 상태+핸들러 응집 단위 → 라우트 로컬 `hooks/use-<무엇>.ts`. 훅은 상태·핸들러를 묶은 **컨트롤러 객체**를 반환하고, 다이얼로그 컴포넌트가 통째로 받는다:
  ```tsx
  const form = useReservationForm({ selectedDate, onSaved: fetchData });
  <ReservationFormDialog form={form} ... />
  ```
- 다이얼로그·FAB 등 자기완결 JSX 블록 → 라우트 로컬 `components/`.
- 참고 구현: `app/(admin)/admin/{calendar,expenses,customers,sales}/{hooks,components}/`

## 공용 훅 (`src/hooks/`)

| 훅 | 용도 | 비고 |
|----|------|------|
| `use-infinite-list` | 서버 페이지네이션 목록: offset 무한스크롤 + 300ms 디바운스 서버 검색 + initialItems 변경 리셋 + stale 응답 가드 | `loadPage(offset, search)`만 주입. 낙관적 삭제는 호출부에서 `useOptimistic(items)` + `setItems` 조합 (sales/expenses 참고). **initialItems는 참조가 안정적인 서버 props여야 한다** |
| `use-quick-create` | 대시보드 빠른 등록 `?new=1` 1회 소비 → 콜백 → URL 정리 | sales/expenses/calendar 사용 |

- URL 필터 동기화는 도메인별 파라미터 모델이 달라 **공용화하지 않는다** — 라우트 로컬 훅으로 (`use-sales-url-filters` 참고).
- 새 공용 훅은 반드시 `renderHook` 단위 테스트 동반 (`src/hooks/__tests__/`).

## BFF DTO 매퍼 (`lib/api/mappers/`)

- Kotlin 응답(camelCase) ↔ 웹 타입(snake_case) 변환은 **여기에만** 둔다. 액션 파일에 인라인 매퍼 작성 금지(과거 mapKotlinSale 3벌 중복 사고 방지).
- DTO 인터페이스(`KotlinSale` 등)도 매퍼 파일에서 export — 액션은 import만.
- 매퍼는 순수 함수 — 단위 테스트 작성 (`lib/api/mappers/__tests__/`).

## 타입 (`src/types/`)

- 도메인별 파일(`types/sales.ts` 등)에 정의. `types/database.ts`는 호환용 re-export 배럴 — 신규 코드는 도메인 파일을 직접 import.

## e2e (`e2e/`)

- 구조: Playwright → next(3110, `API_URL`=mock) → mock BFF(18080, `e2e/mock-bff/server.mjs`). 서버 간 호출이라 `page.route()` 모킹 불가 — **BFF 엔드포인트 추가 시 mock에도 추가**해야 한다(누락 시 404 + `[mock-bff] unhandled` 경고로 드러남). 응답 형태는 액션 파일의 Kotlin DTO 미러에서 역산할 것(추측 금지).
- 로그인: `signIn(context, baseURL)` — 무서명 JWT 쿠키 주입.
- 모든 테스트에 `trackErrors`/`expectNoErrors`(런타임 에러 0 검증) 적용.
- 새 화면/플로우 추가 시: 렌더 스모크(seed 데이터 표시) 1개 + 핵심 CRUD 1개를 기본으로.
- **날짜 의존 테스트 규칙**: seed 날짜를 테스트에서 자체 계산(`오늘+1` 등)하지 말 것 — mock 서버 기동 시점과 어긋난다(자정/월 경계 플레이크). mock API를 직접 조회해 실제 날짜를 얻는다(`calendar.spec.ts`의 `seedReservationDate()` 참고). e2e 전 프로세스는 TZ=Asia/Seoul로 고정돼 있다(playwright.config.ts).
