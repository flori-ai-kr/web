# 슈퍼어드민 콘솔 리디자인 + 통계 보강 설계

> 작성일: 2026-06-03 · 상태: 설계 · 대상: `flori-ai/web` (+ `flori-ai/server` 통계 엔드포인트)
> 작업 위치: 워크트리 `.claude/worktrees/console-redesign` (branch `worktree-console-redesign`, dev 기반)

## 1. 배경 / 문제
초기 콘솔(`/console/*`)이 `bg-zinc-950` 등 **하드코딩 다크**로 만들어져 flori 디자인 토큰을 무시 → 다크 강제, shadcn 버튼이 흰 배경에 흰 글씨로 깨짐(검색·비활성화·페이지네이션), 통계 빈약. 점주 어드민(라이트 페이퍼 + 더스티 로즈)과 톤 불일치.

## 2. 목표
- 전 화면을 flori 어드민 **시맨틱 토큰**으로 재구성(라이트 기본 + 테마 토글 존중).
- onetime 백엔드 콘솔(`~/Desktop/onetime/backend`) UX 벤치마크: 그룹 사이드바 + 토픽바, 요약카드(기간 대비 증감%), 날짜필터, 추이 차트, 스켈레톤, dense 테이블.
- 운영 통계 보강(증감·시계열) + 유저 상세 드릴다운.
- 시안: `docs/mockups/console-redesign-mockup.html`(승인됨).

## 3. 디자인 시스템 (전 화면 공통 규칙)
- `zinc-*`/하드코딩 색 전부 제거 → 토큰: `bg-background`(#FBF8F3)·`bg-card`·`border-border`·`text-foreground`·`text-muted-foreground`·`bg-muted`·`bg-brand`(#A85475)·`text-brand`·`bg-brand-muted`.
- 상태색은 토큰화한 의미색 유틸(success/warn/danger) — `globals.css`에 없으면 콘솔 전용 CSS 변수로 추가(green #3F8F5B / amber #B5852A / red #C0492F + bg). **단독 옅은색 금지**(가독성).
- shadcn `Button(variant=default→brand, outline, ghost)/Table/Badge/Dialog/Tabs/Input/Skeleton` 토큰대로 사용.
- 폰트: 제목 Cormorant Garamond(`.serif` 기존), 본문 Pretendard/Noto Sans. lucide 아이콘.
- 테마 강제 금지 — `next-themes` 토글 그대로 반영.

## 4. 콘솔 셸 (onetime식 라이트 전용)
`src/components/console/` 로 분리:
- `ConsoleSidebar` — 그룹 네비: **개요** / **통계**(대시보드·유저·매출) / **운영**(사업자 인증[대기 배지]·유저 관리·구독) / **시스템**(AI 헬스). 활성 = brand 강조. 모바일은 `Sheet` 토글.
- `ConsoleTopbar` — 페이지 타이틀+서브, 데이터 기준 시각, 새로고침, 테마 토글, 운영자 아바타, "← 점주 화면" 링크.
- `ConsoleShell` — 위 둘 + `bg-muted` 콘텐츠 래퍼. (기존 `console-shell.tsx` 대체)
- `layout.tsx` 는 `requireAdmin()` 유지, 셸만 교체.

## 5. 페이지별 설계
### 5.1 개요 `/console`
- **날짜 필터**(7/30/90일·전체) — URL `?range=` 또는 클라 상태. 선택값을 stats 호출에 전달.
- 인증 대기 콜아웃(대기>0일 때) → 인증 페이지 링크.
- 요약 카드 4(가입자·매출입력·구독활성·인증대기): 값 + **기간 대비 증감%**(▲▼ 색상) + 아이콘, 클릭 → 해당 섹션.
- **추이 차트 2**: 가입자(라인)·매출입력(바) — `recharts`. 데이터 없으면 빈 상태 안내.
- AI 헬스 카드(UP/DOWN + latency + 새로고침).
- 로딩 시 `Skeleton`.

### 5.2 사업자 인증 `/console/verifications`
상태탭(대기/승인/거절) + 토큰화 테이블 + 상세 다이얼로그(등록증 미리보기·승인/거절). 버튼 가시성 정상화, 빈/로딩 상태.

### 5.3 유저 관리 `/console/users`
- dense 테이블 토큰화(현재 깨진 버튼·페이저 수정), 상태 **Badge**(구독/인증/활성 스위치), 검색·페이지네이션 정상.
- **행 클릭 → 유저 상세 드릴다운**(다이얼로그 또는 `/console/users/[id]`): 프로필(가게·지역), 구독 상태, 사업자 인증 이력, 매출 요약(건수·총액·최근일), 가입일. active 토글.
- 운영자 본인 행 비활성화 버튼 disabled(서버도 차단).

### 5.4 구독 `/console/subscriptions`
상태 Badge + 정렬 + 빈 상태(토큰화).

### 5.5 AI 헬스 `/console/health`
UP/DOWN 카드 + latency + 수동 새로고침 + 미설정 안내(토큰화).

## 6. 서버 통계 보강 (`flori-ai/server`, 별도 작업)
신규/확장 (`@RequiresAdmin`, cross-tenant native SQL, 파라미터 바인딩, 테스트 포함):
- `GET /admin/stats/overview?from&to` — 기존 카운트 + **직전 동기간 대비** 비교 필드(`*Change` %). from/to 미지정 시 기본 30일.
- `GET /admin/stats/timeseries?metric=signups|sales&from&to` — 일별 시계열 `[{date,count}]` (가입자=users.created_at, 매출=sales.date).
- `GET /admin/users/{id}` 확장 — 드릴다운용 상세(프로필·구독·검증 이력·매출 요약). 기존 setActive 유지.
- page/size 클램핑·자기 비활성화 차단 등 기존 가드 유지.
- **배포 의존**: server 배포돼야 신규 통계 동작. 미배포 구간엔 web이 graceful degrade(차트/증감 숨김).

## 7. 웹 데이터/타입
- `recharts` 의존성 추가.
- `lib/actions/admin-stats.ts` 확장(`getAdminOverview(range)`, `getTimeseries(metric,range)`), `admin-users.ts`(`getAdminUserDetail(id)`).
- `types/admin.ts` 확장(comparison/timeseries/userDetail).

## 8. 테스트
- web: 셸/가드 vitest, range→파라미터 매핑, 차트 빈상태 렌더 라이트 테스트.
- server: overview 비교·timeseries SQL·user detail 통합테스트(기존 admin 테스트 패턴).
- 마무리: `/feature-finalize`(web), server 별도 PR. E2E 라이브 확인.

## 9. 영향 파일(예상)
**web**: `components/console/{ConsoleShell,ConsoleSidebar,ConsoleTopbar,StatCard,TrendChart,...}.tsx`,
`app/(console)/console/**`(layout + 5 page/client + users/[id]),
`lib/actions/admin-stats.ts`·`admin-users.ts`, `types/admin.ts`, `globals.css`(상태색 토큰), `package.json`(recharts).
**server**: `admin/controller/AdminStatsController`·`AdminUserController`, `service/AdminStatsService`·`AdminUserService`, dto, 테스트.

## 10. 스코프 / YAGNI
- **포함(P1)**: 디자인 토큰화·셸·5페이지·증감/시계열 차트·날짜필터·유저 드릴다운·서버 통계 보강.
- **후속**: 커뮤니티 모더레이션, 공지/푸시 브로드캐스트, CSV Export, 코호트·퍼널·리텐션·MAU(데이터 축적 후).
