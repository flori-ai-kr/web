# flori web 전면 리팩터링 설계

> 2026-06-11. 동작 중인 서비스를 깨지 않고 유지보수성·확장성·AI 가독성을 끌어올리는 구조 리팩터링.
> 기능 추가 없음. UI·동작 100% 보존이 절대 조건.

## 배경 — 무엇이 문제인가

현재 상태: vitest 542개 전부 통과, `tsc --noEmit` 클린. 그러나 구조적 부채가 쌓여 있다.

| # | 문제 | 근거 | 심각도 |
|---|------|------|--------|
| 1 | 거대 클라이언트 파일 | `calendar-client.tsx` 1,640줄(useState 30개·핸들러 16개·인라인 다이얼로그 2개), `expenses-client.tsx` 895줄, `customers-client.tsx` 873줄 | 높음 |
| 2 | 도메인 간 복붙 | 무한스크롤·다이얼로그 open 상태·URL 필터 동기화·`?new=1` 처리 로직이 sales/expenses/customers/gallery/calendar에 각자 구현 | 높음 |
| 3 | DTO 매핑 중복 | `mapKotlinSale()`이 `sales.ts`와 `reservations.ts`에 미묘하게 다른 2벌 | 중간 |
| 4 | 타입 단일 파일 | `types/database.ts` 424줄에 전 도메인 타입 + 상수(SCHEDULE_COLORS 등) 혼재 | 중간 |
| 5 | 테스트 공백 | 서버 액션은 26개 파일로 커버되나 클라이언트 컴포넌트·훅 테스트 거의 없음, e2e 없음 | 높음 |
| 6 | lint 노이즈 | 282 errors는 전부 `.claude/worktrees/*/.next` 빌드 산출물을 ESLint가 긁는 것. 진짜 소스 워닝은 소수 | 낮음(쉬움) |
| 7 | 위치·이름 비일관 | colocation(`app/.../components`) vs `components/도메인` 혼재, PascalCase vs kebab-case 파일명 혼재 | 낮음 |

## 결정 사항 (사용자 확정)

- **E2E**: Playwright + BFF 모킹 (실서버 의존 없음)
- **범위**: 거대 파일 분해 + 공용 훅 + 타입/매퍼 + 파일명·폴더 통일 + lint 0
- **진행**: 한 브랜치(`refactor/with-fable5`)에서 아토믹 커밋
- **파일명**: kebab-case 통일

## 핵심 설계

### E2E 아키텍처 (Phase 1)

`apiFetch`는 Next 서버 → Kotlin BFF의 **서버 간 호출**이므로 Playwright `page.route()`로는 가로챌 수 없다. 따라서:

```
Playwright ──브라우저──> next (port 3100대)
                          │ apiFetch (API_URL=http://localhost:18080)
                          ▼
                        mock BFF (e2e/mock-bff — fixture 기반 Node HTTP 서버)
```

- **mock BFF**: `e2e/mock-bff/`에 경량 Node HTTP 서버. `/me`, `/sales`, `/expenses`, `/customers`, `/reservations` 등 핵심 엔드포인트를 fixture JSON으로 응답. 시나리오별 상태 변형(등록→목록 반영)은 인메모리로 최소 구현.
- **로그인 우회**: JWT 서명 검증은 BFF 몫이므로, mock 환경에서는 `flori_access` 쿠키에 아무 토큰이나 주입하면 `requireAuth()`가 mock `/me` 응답으로 통과한다.
- **범위**: 핵심 화면 렌더 스모크(대시보드·매출·지출·고객·캘린더·사진첩·통계) + 대표 CRUD 플로우(매출 등록, 지출 등록, 고객 등록, 예약 등록). 리팩터링 안전망이 목적이므로 넓고 얕게.
- 거대 파일 분해(Phase 4) **전에** 구축해 안전망으로 쓴다.

### 타입·매퍼 (Phase 2)

- `types/database.ts` → `types/{sales,expenses,customers,reservations,gallery,insights,community,user}.ts` 분리. 기존 import 경로는 일괄 치환(re-export 배럴은 임시로만, 최종적으로 제거).
- 상수(SCHEDULE_COLORS, *_LABELS 등)는 타입 파일이 아닌 적절한 위치로(도메인 타입 파일 하단 또는 lib/constants).
- Kotlin DTO → UI 타입 매핑을 `lib/api/mappers/` 로 모은다. `mapKotlinSale` 2벌의 차이(photos 처리)는 의도 차이인지 검증 후 옵션 파라미터 또는 단일 함수로 통합.
- 서버 액션의 공개 시그니처(함수명·인자·반환 타입)는 변경하지 않는다 — 호출부 영향 0.

### 공용 훅 (Phase 3)

`src/hooks/` 신설. 5개 클라이언트에 복붙된 패턴을 추출:

| 훅 | 대체하는 복붙 | 사용처 |
|----|--------------|--------|
| `use-infinite-list` | offset/limit·hasMore·isLoadingMore·중복 id 추적 | expenses, sales, gallery |
| `use-url-filters` | 필터 변경 → URLSearchParams replace 동기화 | sales, expenses, customers, gallery, calendar |
| `use-quick-create` | `?new=1` 1회 소비 → 폼 오픈 → 파라미터 제거 | sales, expenses, calendar |
| `use-dialog-controller` | open/editing/deleting 타깃 상태 더미 | 전 클라이언트 |

각 훅은 `renderHook` 단위 테스트를 동반한다. **훅 추출은 동작 동등성이 검증 가능한 가장 작은 단위로** — 한 클라이언트에 적용할 때마다 vitest + e2e 통과 확인.

### 거대 파일 분해 (Phase 4)

순서: calendar(최대·최복잡) → expenses → customers → sales(소규모 정리).

분해 원칙:
- 페이지 클라이언트는 **조립(orchestration)만** 담당: 데이터 props 수신, 훅 연결, 레이아웃.
- 폼 상태+제출 로직 → `use-*-form` 훅, 다이얼로그 → 독립 컴포넌트(해당 라우트 `components/`), 인라인 컴포넌트(TimeSelect, DatePickerButton) → 재사용 위치로 추출.
- 목표: 페이지 클라이언트 300줄 이하, 단일 파일 500줄 이하.
- JSX 구조·클래스명은 그대로 옮긴다(시각 변화 0). 상태 로직도 의미 변경 없이 이동만.

### 구조·이름 규칙 (Phase 5)

- **파일명**: 전부 kebab-case (`git mv`로 이력 보존).
- **위치 규칙**: 한 라우트에서만 쓰면 `app/.../<route>/components/`, 2개 이상 라우트가 공유하면 `components/<도메인>/`. 현재 양쪽에 흩어진 expenses·sales 컴포넌트를 이 규칙대로 정리.

### 검증 게이트 (모든 Phase 공통)

각 Phase 완료 시: `tsc --noEmit` + `npm test`(542+) + `npm run lint`(오류 0) + `pnpm e2e`(Phase 1 이후). 게이트 통과 후에만 커밋.

## 비목표

- 기능 추가·UI 변경·성능 튜닝(부수 효과로 생기는 것 외)
- 서버(Kotlin BFF) 변경
- 상태 관리 라이브러리 도입(React hooks 유지)
- CSS/디자인 시스템 변경

## 리스크와 완화

| 리스크 | 완화 |
|--------|------|
| 분해 중 동작 회귀 | Phase 1 e2e를 먼저 구축, 분해는 파일 단위 아토믹 커밋으로 롤백 가능하게 |
| mapKotlinSale 통합 시 의미 변경 | 두 구현 diff를 먼저 분석, 차이가 의도적이면 옵션으로 보존 |
| 파일 rename으로 import 깨짐 | tsc + lint + 테스트 게이트로 즉시 검출 |
| mock BFF가 실제 BFF와 계약 불일치 | mock은 안전망 용도로 한정. 계약 검증은 기존 서버 액션 단위 테스트가 담당 |

## Phase 요약

| Phase | 내용 | 산출물 |
|-------|------|--------|
| 0 | lint 베이스라인 (ignore + 소스 워닝 정리) | lint 오류 0 |
| 1 | Playwright + mock BFF e2e 안전망 | `e2e/` 스모크 + CRUD 플로우 |
| 2 | 타입 도메인 분리 + 매퍼 통합 | `types/*`, `lib/api/mappers/` |
| 3 | 공용 훅 추출 + 테스트 | `src/hooks/*` + 단위 테스트 |
| 4 | 거대 클라이언트 분해 | 페이지 클라이언트 ≤300줄 |
| 5 | kebab-case + colocation 정리 | 일관된 구조 |
| 6 | 문서화 | `docs/refactoring/26-06-11-full-refactor.md` + CLAUDE.md 갱신 |
