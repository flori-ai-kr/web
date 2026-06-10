# CLAUDE.md

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참조하는 가이드입니다.

---

## 프로젝트 개요

**flori** — 꽃집 매출·지출·고객·사진첩·예약·인사이트를 관리하는 PWA 어드민 웹앱.

멀티테넌시(테넌트별 데이터 격리)를 기본으로 한다. 인증과 비즈니스 데이터는 **전부** Kotlin BFF(`flori-ai/server`) REST API를 Next.js 서버 레이어 경유(`apiFetch`)로 호출하며, BFF가 DB(PostgreSQL)를 소유한다. web은 DB에 직접 연결하지 않는다(Supabase 클라이언트 없음).

### 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI) |
| Data API | Kotlin BFF (`flori-ai/server`) REST — `apiFetch` 서버↔서버 호출 (유일한 데이터 경로) |
| Database | PostgreSQL — BFF가 소유. web은 DB에 직접 연결하지 않음 |
| Auth | Kotlin BFF JWT 쿠키 + 소셜 OAuth (kakao·google·naver) |
| Storage | AWS S3 + CloudFront (CDN, presigned 업로드 — BFF가 presigned URL 발급) |
| Validation | Zod 4 |
| State | React hooks (글로벌 스토어 없음) |
| Editor | Tiptap v3 (커뮤니티 게시판 본문, JSON 저장 + plain text 미리보기) |
| Push | Web Push API (VAPID) + Service Worker |
| Export | ExcelJS, jsPDF |
| Charts | recharts (운영 콘솔 통계 추이 + `/admin/statistics` area/donut/bar 차트) |
| DnD | @dnd-kit/core · @dnd-kit/sortable · @dnd-kit/utilities (BottomNav + 라벨 설정 순서 변경) |
| Test | Vitest, fast-check, Testing Library |
| Deploy | AWS 자체 호스팅 (Vercel 아님) — Docker standalone(ARM64) → ECR `flori-dev/web` → EC2(`flori-dev-app`) docker-compose, ALB `admin.flori.ai.kr`. CI: GitHub Actions `deploy-web-dev.yml`. 랜딩 apex `flori.ai.kr` 은 별도 nginx(`flori-dev/homepage`) |
| Analytics | Google Analytics 4 + Microsoft Clarity — `components/analytics.tsx`, **프로덕션 빌드에서만** 로드. ID는 `NEXT_PUBLIC_*` build-arg(baked) |
| Error Logging | Discord 웹훅 |

---

## 빌드 및 실행

```bash
npm install
npm run dev          # 로컬 개발 (http://localhost:3100)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm test             # Vitest 1회 실행
npm run test:watch   # Vitest watch 모드
npm run test:coverage # Vitest + 커버리지 리포트(@vitest/coverage-v8)
```

---

## 프로젝트 구조

```
page.tsx (Server) → 데이터 fetch → *-client.tsx (Client) → UI 렌더링
```

```
src/
├── app/(admin)/admin/   # 어드민 라우트 그룹 (인증 필요, /admin/*)
│   ├── page.tsx              # 대시보드
│   ├── dashboard-client.tsx
│   ├── sales/           # 매출 — sales-client.tsx + components/(SalesSummary, SalesList, SaleFormDialog, SaleDetailDialog)
│   ├── expenses/        # 지출 — expenses-client.tsx + components/(ExpensesFilters, ExpensesList, ExpensesSummary)
│   ├── customers/       # 고객 — customers-client.tsx + components/(CustomerCard, CustomerFormDialog, CustomerDetailDialog, CustomerGradesModal)
│   ├── gallery/         # 사진첩
│   ├── calendar/        # 예약 캘린더 — calendar-client.tsx + types.ts + components/(EventCard, ReservationCard, CalendarDialogs)
│   ├── insights/        # 인사이트 — trends/(트렌드) follows/(인스타) scraps/(내 스크랩)
│   ├── community/        # 커뮤니티 게시판 — 목록/[id](상세)/[id]/edit/write/verify(사업자 인증 게이트)
│   ├── profile/         # 내 프로필 (프로필 수정 + 아바타 업로드 + 탈퇴)
│   ├── statistics/      # 통계 — statistics-client.tsx + 빠른 선택 DateRangeSelector + 매출/지출/예약/고객 4탭 (URL ?range&from&to&tab), recharts area/donut + StatBarList + 예약 히트맵
│   ├── settings/        # 설정 (카드사 + 푸시 알림 + BottomNav 커스텀)
│   └── error.tsx        # 에러 바운더리
├── app/(console)/console/ # 슈퍼어드민 운영 콘솔 (운영자 is_admin 전용, /console/*) — 점주 /admin/* 과 분리. 어드민 토큰 라이트 셸(테마 토글 존중)
│   ├── layout.tsx           # requireAdmin() 게이트 + components/console/ConsoleShell(onetime식 그룹 사이드바+토픽바+모바일 Sheet)
│   ├── page.tsx             # 개요 (날짜필터 ?range= + 증감% 카드 + 추이 차트(recharts) + AI 헬스)
│   ├── verifications/   # 사업자 인증 심사 (상태탭 + 상세 다이얼로그 + 승인/거절)
│   ├── users/           # 유저 테이블(검색·페이지네이션 + is_active 토글) + [id]/ 상세 드릴다운(프로필·구독·인증이력·매출요약)
│   ├── subscriptions/   # 구독 현황 목록
│   └── health/          # AI 헬스 패널 (ai-server/litellm 프록시, 수동 새로고침)
│   (공통 프리미티브: components/console/{StatCard,StatusBadge,TrendChart})
├── app/auth/            # 소셜 OAuth Route Handlers — oauth-providers.ts, login/[provider], callback/[provider]
├── app/onboarding/      # 소셜 신규 가입 온보딩 (registerToken 가드) — page.tsx, onboarding-form.tsx, actions.ts. Step1에 전화번호 필수 입력 포함
├── app/healthz/         # 헬스체크 전용 라우트 (ALB/Docker health check 대상, 외부 의존 없는 정적 200)
├── app/login/           # 로그인 (소셜 전용)
├── app/offline/         # PWA 오프라인 폴백 (SW가 navigate 실패 시 서빙, 정적·인라인스타일·JS無)
├── app/manifest.ts      # PWA 매니페스트
├── app/global-error.tsx # 글로벌 에러 바운더리
├── components/ui/        # shadcn/ui (category-multi-select.tsx 다중선택, domain-badge.tsx 도메인 배지=다크 대응, date-picker.tsx 공용 날짜 선택기 — 네이티브 `<input type="date">` 전면 대체)
├── components/layout/    # AppLayout(skip-link 포함), Header, Sidebar, BottomNav, PageHeader, EmptyState, ListPageSkeleton(공통)
├── components/{sales,gallery,expenses,insights,community,auth}/  # 도메인별 공통 컴포넌트 (community: tiptap-editor/content, comment-tree, post-card, admin-badge 등)
├── components/theme-provider.tsx
├── lib/actions/          # Server Actions (직접 import)
├── lib/api/              # Kotlin BFF 클라이언트 — apiFetch(JWT) + apiFetchInternal(Bearer INTERNAL_API_KEY), auth-cookies.ts, cookie-names.ts, insights-mappers.ts(insights↔scraps 공유 DTO 매퍼)
├── lib/photo-upload.ts   # presigned URL 발급 → 브라우저→S3 직접 PUT
├── lib/validations.ts    # Zod 스키마 + 이미지 검증
├── lib/errors.ts         # AppError, ErrorCode, withErrorLogging()
├── lib/auth-guard.ts     # requireAuth() — /me 조회 + 온보딩 게이트
├── lib/env.ts            # 환경변수 Zod 검증
├── lib/business-verification.ts # 사업자 인증 타입·상수 (BusinessVerification, BUSINESS_LICENSE_TYPES 등)
├── lib/{constants,utils,date-locale,export,logger}.ts
├── lib/{instagram-url,onboarding-options}.ts
├── types/database.ts     # 전체 타입 정의
└── public/
    ├── sw.js             # Service Worker (푸시 알림)
    └── icons/            # PWA 아이콘 (192/512, maskable)
```

### 인증 흐름

- `src/middleware.ts` → **루트 `/` 분기 먼저**: 인증 쿠키(`flori_access` 또는 `flori_refresh`) 존재하면 `/admin` redirect, 없으면 `/login` redirect (랜딩은 별도 사이트 `flori.ai.kr`로 이관됨). 분기 로직은 순수 함수 `rootRedirectTarget`(`src/lib/middleware-routing.ts`)로 분리. 이후 `/admin/*`·`/console/*` 경로에 Kotlin BFF JWT 쿠키 검사 + `requireAuth()` 가드 + 온보딩 게이트(`onboarded === false` → `/onboarding`). `requireAuth()` 내부 `fetchAuthUser`: access 쿠키 없이 refresh 쿠키만 있으면 `/login` 즉시 리다이렉트 없이 `apiFetch(/me)` 진행 → 401 시 자동 refresh. access·refresh 둘 다 없을 때만 `/login`.
- `/admin/*`·`/console/*` 경로만 인증 강제. `/login`·`/onboarding`·`/auth/*`·`/healthz` 는 공개 라우트. 정책 문서(`/policy/*`)는 이 앱에 없으며 `flori.ai.kr` 홈페이지가 canonical로 보유한다(`lib/constants.ts` `PRIVACY_POLICY_URL`, `TERMS_URL`로 외부 링크)
- 운영자 콘솔: `/console/*` 는 `requireAdmin()`(`lib/admin-guard.ts` — `/me` 인증 후 BFF `GET /admin/me`로 is_admin 재검증, 비운영자면 `/admin` redirect)로 게이트. 진짜 방어선은 BFF `@RequiresAdmin`(cross-tenant `/admin/**`)
- 소셜 OAuth: `/auth/login/[provider]` → 공급자 redirect → `/auth/callback/[provider]` → BFF `POST /auth/oauth/{provider}` → registered=true이면 `/admin`, false이면 `registerToken` 쿠키(`flori_register`) → `/onboarding`

### 데이터 접근

- **유일 경로**: Server Action에서 `apiFetch`(`src/lib/api/client.ts`)로 Kotlin BFF REST 호출. JWT 쿠키를 Authorization 헤더로 붙이고, 401이면 refresh로 1회 자동 재발급 후 재시도. 테넌트 격리·카드수수료 등 계산은 **BFF가 JWT 기준으로 수행** (web은 `user_id`를 보내지 않음)
- **내부 API 호출**: 서버에 사용자용 엔드포인트가 없는 관리 작업(인스타 계정 CRUD)은 `apiFetchInternal`로 BFF `/internal/*`(Bearer `INTERNAL_API_KEY`) 호출 — 서버 액션 내부에서만
- page.tsx는 데이터 클라이언트를 직접 import하지 않고 Server Action만 호출한다
- **서버 미구현 대기**: `getSalesSummary`·트렌드 카테고리 카운트·IG 최근 수집시각·테스트 푸시는 아직 미구현 BFF 엔드포인트를 호출 → 서버 배포 전까지 비동작 (`docs/plans/` TODO 참조)

---

## 코딩 컨벤션

> 상세 내용과 코드 예시는 `docs/conventions/` 참조

| 컨벤션 | 핵심 규칙 | 상세 문서 |
|--------|-----------|-----------|
| Server Action | `'use server'` + `withErrorLogging()` throw 패턴, 직접 import(barrel 금지), `requireAuth()` + `user_id` 삽입, Zod 검증 | `26-05-28-server-action-convention.md` |
| UI 컴포넌트 | 한국어 UI, 엔터키 제출 방지, 삭제는 Dialog(`confirm()` 금지), 접근성 속성 필수, `transition-all` 금지 | `26-05-28-ui-component-convention.md` |
| 데이터 페칭 | Server/Client 분리, useState/useMemo만, 다중선택 필터(URL 쉼표+`.in()`), 통계 실시간 집계 | `26-05-28-data-fetching-convention.md` |
| 에러 처리 | 예상된 에러 → `AppError`, 미지 에러 → `withErrorLogging()` Discord 전송 | `lib/errors.ts` |

---

## 멀티테넌시

> 테넌트 격리는 Kotlin 서버가 JWT 기준으로 수행한다 (web은 `user_id`를 보내지 않음). 아래 `user_id`·RLS 규칙은 BFF가 소유한 DB 스키마 설명이며, web 코드에는 더 이상 반영되지 않는다.

- 19개 테이블에 `user_id UUID NOT NULL REFERENCES auth.users(id)` (인사이트 스크랩, 고정비 포함)
  - sales, expenses, customers, reservations, photo_cards, photo_tags, card_company_settings, sale_categories, payment_methods, expense_categories, expense_payment_methods, push_subscriptions, user_preferences, insight_scraps, recurring_expenses, recurring_skips
  - 공유 읽기 테이블 (SELECT only, writes via service role): trend_articles, instagram_accounts, instagram_posts
- RLS 정책: `auth.uid() = user_id` (CRUD별 분리)
- unique 제약: 단일 컬럼 → `(column, user_id)` 복합으로 변경
  - `customers(phone, user_id)`, `card_company_settings(name, user_id)`, `photo_tags(name, user_id)`, `sale_categories(value, user_id)`, `payment_methods(value, user_id)`, `expense_categories(value, user_id)`, `expense_payment_methods(value, user_id)`
- Server Action INSERT 시 `user_id: user.id` 삽입 (`requireAuth()` 로 획득)
- app_config: RLS는 `auth.uid() IS NOT NULL` (공유 설정)

---

## 비즈니스 로직

- 고객 식별: 전화번호 + user_id 복합 unique, 성별(male/female) 선택. 등급은 테넌트별 커스텀(`customer_grades` 테이블) — 이름(string)·구매횟수 임계값(optional)으로 자유 정의. 구매횟수가 임계값 도달 시 자동승급, 수동 지정 시 `grade_locked=true`(자동 재계산 제외). 고객 상세에서 "자동 등급으로 되돌리기"로 잠금 해제. 등급 관리는 고객 목록 FAB → `CustomerGradesModal`
- 로드 구입: 매출 등록 간편 모드 (결제방식=현금, 채널=road 고정, 카드사/주문자명/연락처 생략)
- 카드 수수료: `expected_deposit = amount * (1 - fee_rate/100)`, 입금 예정일은 영업일 기준 N일. **fee/expected_deposit/deposit_status/is_unpaid 계산은 BFF가 수행** (web은 입력값만 POST)
- 지출 총액: `unit_price * quantity`
- 사진: 5MB 초과 시 하드 거부(클라이언트 자동 압축 제거됨), 카드당 최대 10장, AWS S3 + CloudFront 저장(CDN). 업로드: `createPhotoUploadTargets()` 로 BFF에서 presigned PUT URL 발급 → 브라우저가 S3 엔드포인트에 직접 PUT (Server Action 본문 크기 제한 우회). 사진카드 ↔ 고객 soft 참조(`photo_cards.customer_id`, FK 없음): 사진 작성/편집 모달에서 고객 검색 연결(선택), 사진 상세에서 고객 상세로 이동. 고객 카드/상세에서 연결 사진 썸네일(`photo_thumbnails`, 최대 3장) + 카운트(`photo_count`) 표시 — BFF가 응답에 포함(N+1 없이 집계)
- 예약 리마인더: `reminder_at` 설정 → Cron 푸시 발송
- 미수(외상): `is_unpaid=true` 플래그 별도 관리 (`payment_method='unpaid'` 폐지). 등록 시 `is_unpaid: true` + `payment_method_id: null`로 전송. 결제 완료 `completeUnpaidSale()`, 되돌리기 `revertUnpaidSale()`. **미수 판정 헬퍼**: `isUnsettledUnpaid(sale)` (`lib/utils.ts`) = `is_unpaid && payment_method_id == null`. `is_unpaid`는 '외상이었음'을 나타내는 영구 마커이고 결제 후에도 BFF가 유지하므로, 실제 '미수 중'은 payment_method_id가 null인 경우만이다. UI 전체(매출 리스트/상세/대시보드/캘린더)에서 직접 `sale.is_unpaid` 비교 금지 — 반드시 이 헬퍼를 사용
- 푸시 실패: 영구 실패(404/410)만 구독 비활성화, 일시 에러는 유지
- 인사이트 스크랩: `insight_scraps(user_id, target_type, target_id, memo)` 복합 unique. 트렌드/포스트 북마크 토글 + 상세 다이얼로그 메모 편집(blur 자동 저장). `/insights/scraps` + 목록 "스크랩만" 필터(`?scraped=1`)
- 팔로우 포스트: 썸네일 → 라이트박스(prev/next + Esc/화살표). Instagram CDN `stp` 패딩 옵션을 `normalizeInstagramImageUrl()` 로 제거
- 고정비(반복 지출): `recurring_expenses`(주/월/연 + 다중 일자) + `recurring_skips`. `expenses.recurring_id` FK + `(recurring_id, date) UNIQUE`. Cron KST 00:30 자동 등록. 지출 페이지 FAB → **고정비 관리 모달**(탭 구조 폐지, `RecurringExpensesSection embedded`). 수정 시 'iOS 이것만/이후 모두' 분기(`updateRecurringExpense` `mode: 'this' | 'future'`)
- 다중선택 필터: `SalesFilters.category`/`payment`/`channel` 은 `string[]`(id 기반). BFF 응답의 `category_label`/`payment_method_label`/`channel_label`을 직접 사용(프론트에서 value→label 매핑 테이블 불필요). 채널 목록은 `getSaleChannels()`로 동적 조회(`GET /settings/sale-channels`). `ExpenseFilters.category`/`payment`도 동일한 id 기반 다중선택 패턴 적용
- 대시보드 역할 변경: `/admin`(dashboard)은 '오늘·운영 홈' 역할로 개편 — 시간대별 인사말(`lib/greeting.ts`), 이번 달 4 KPI 카드(`formatManwon`), 커뮤니티 최신글(`getLatestCommunityPosts`), flori AI 브리핑 카드('개발 중' 잠금). 월별 분석(카테고리·결제방식·채널 BarList)은 대시보드에서 제거되어 `/admin/statistics`로 분리됨.
- 빠른 등록 `?new=1`: 대시보드 드롭다운에서 매출/지출/예약 등록 클릭 시 해당 페이지로 이동(`?new=1`) → 각 클라이언트(sales/expenses/calendar)가 마운트 시 폼을 오늘 날짜로 프리필하여 즉시 오픈. 1회 처리 후 파라미터 제거.
- 통계(`/admin/statistics`): 빠른 선택 글로벌 기간 셀렉터(이번 달/지난달/최근 3개월/올해/직접 선택) + 매출·지출·예약·고객 4탭 (URL `?range&from&to&tab`). BFF `GET /statistics/{sales,expenses,reservations,customers}?from=&to=` 호출. 탭별 데이터는 클라이언트 캐시로 중복 요청 방지. 예약 탭에 요일×시간대 히트맵(`ReservationHeatmap`) 포함.
- 라벨 설정 관리: 매출(카테고리·결제방식·채널)·지출(카테고리·결제방식) 설정은 공용 `LabelSettingsManager` 모달로 통합. 탭 구조로 도메인·종류를 전환하며, 각 항목은 좌측 `GripVertical` 드래그 핸들(`@dnd-kit/sortable`)로 순서를 변경한다. 순서 변경은 낙관적 적용 후 BFF `PUT /settings/{domain}/order` (5종: `sale-categories`, `payment-methods`, `sale-channels`, `expense-categories`, `expense-payment-methods`)로 저장하며 실패 시 롤백. `ExpenseCategory`·`ExpensePaymentMethod` 타입에서 `color` 필드 제거됨(BFF `LabelSettingResponse`가 color를 반환하지 않음).
- 지출 서버 페이지네이션: `getExpenses(month, offset, limit, filters, dateRange)` → BFF `GET /expenses?offset=&limit=&month=&category=&payment=&search=` (페이지 단위 100건). 무한스크롤은 `loadMoreExpenses` 클라이언트 액션으로 추가 로드. 검색어는 300ms 디바운스 후 별도 loadMore 호출. 집계는 `getExpensesSummary(month, filters, dateRange)` → BFF `GET /expenses/summary` (카테고리별 금액 슬라이스 `ExpenseCategorySlice[]` + 이전 기간 비교). 이전의 클라이언트 집계(useMemo 합산) 방식은 폐지됨
- 커뮤니티 게시판(테넌트 간 공유): 카테고리(공지/자유/질문/노하우/후기/기타)·대댓글(최대 5뎁스)·좋아요·이미지·**비밀글/비밀댓글**(작성자+글쓴이+부모작성자만 열람). 본문 Tiptap JSON. `actions/community.ts`는 BFF REST(`GET/POST /community/posts`, `GET/PATCH/DELETE /community/posts/{id}`, `POST /community/posts/{id}/like`, `GET/POST /community/posts/{id}/comments`, `DELETE /community/comments/{id}`, `POST /community/upload-targets`)로 완전 연동. **사업자 인증 게이트**: `ensureCommunityAccess()`(`lib/actions/business-verification.ts`) — status≠APPROVED이면 `/admin/community/verify`로 리다이렉트(운영자 예외 없음 — BFF `@RequiresBusinessVerified`도 전원 인증 요구). 커뮤니티 4개 페이지(목록/write/[id]/[id]/edit)에서 공통 호출. **관리자 칩**: BFF `authorIsAdmin` → `author_is_admin` 매핑 → 운영자 작성 게시글·댓글 닉네임 옆에 "관리자" 칩(`components/community/admin-badge.tsx`) 표시
- 프로필 관리: `/admin/profile`에서 가게명·닉네임(중복검증)·이메일·지역·선호정보 수정 + 프로필 사진 업로드(presigned S3 `profiles/{userId}/`). 탈퇴: soft delete(BFF `DELETE /me`) + 사유 수집 + 2초 감사 메시지 후 로그아웃
- 사전등록(waitlist): 랜딩 폼은 `flori.ai.kr` 홈페이지 정적 사이트로 이관됨. 이 web 앱(admin)에는 waitlist 관련 코드가 없다.

---

## 컬러 시스템

- **어드민 브랜드**: Dusty Rose (`--brand: #A85475`, 다크 `#DB8FA9`) + Cool Slate Sage (`--sage: #8A929E`, 다크 `#8B95A2`) — Cool slate 리스킨 반영 (구 Warm Taupe `#A09080` 폐기). 배경: 라이트 `--background: #EEF1F5`(cool 캔버스), 다크 `#101317`. 카드는 순백(`#FFFFFF`) / 다크 `#1E242C` — elevation 구분
- **배지 패턴**: 도메인 색 배지는 `<DomainBadge color>`(`components/ui/domain-badge.tsx`) 사용 — 라이트는 기존 `${color}40` 동일, 다크는 `.domain-badge` CSS가 카드색 혼합+대비 보정. 인라인 `style={{backgroundColor: ${color}40}}` 직접 작성 금지(다크 깨짐)
- 상세 컬러는 `globals.css` 의 CSS 변수 참조

---

## 주요 파일 위치

| 용도 | 위치 |
|------|------|
| 에러/로깅 | `lib/errors.ts` (AppError, withErrorLogging), `lib/logger.ts` (Discord) |
| 인증 가드 | `lib/auth-guard.ts` (requireAuth — /me + 온보딩 게이트) |
| 운영자 콘솔 가드 | `lib/admin-guard.ts` (requireAdmin — `/admin/me` is_admin 재검증), 액션 `lib/actions/admin-*.ts` |
| BFF 클라이언트 | `lib/api/client.ts`, `lib/api/auth-cookies.ts` |
| 검증 스키마 | `lib/validations.ts` (Zod + 이미지 검증) |
| 프로필 관리 | `lib/actions/profile.ts` (프로필 CRUD + 아바타 업로드 + 탈퇴) |
| 스토리지(업로드) | `lib/photo-upload.ts` (presigned URL 발급 → S3 직접 PUT) |
| 사업자 인증 | `lib/business-verification.ts` (타입·상수), `lib/actions/business-verification.ts` (Server Actions + `ensureCommunityAccess()` 커뮤니티 게이트) |
| 내부 API 인증 | `lib/internal-auth.ts` (Bearer timing-safe) |
| 푸시 브로드캐스트 | `lib/push-broadcast.ts` |
| 환경변수 검증 | `lib/env.ts` |
| 공유 라벨 상수 | `lib/constants.ts` (EXPENSE_LABELS — PAYMENT_LABELS·CHANNEL_LABELS는 id 기반 계약으로 제거됨. 외부 링크: `HOMEPAGE_URL`, `PRIVACY_POLICY_URL`, `TERMS_URL`) |
| 온보딩 옵션 | `lib/onboarding-options.ts` |
| 미들웨어 루트 분기 | `lib/middleware-routing.ts` (`rootRedirectTarget` — 런타임 안전 순수 함수, 단위 테스트 포함) |
| 타입 정의 | `types/database.ts` |
| Service Worker | `public/sw.js` |
| 날짜 선택 UI | `components/ui/date-picker.tsx` (shadcn Calendar 팝오버 — `name` prop으로 FormData 제출 지원, 모든 네이티브 `<input type="date">` 대체) |
| 미수 판정 | `lib/utils.ts` `isUnsettledUnpaid(sale)` — `is_unpaid && payment_method_id == null` |
| 금액 만원 표시 | `lib/utils.ts` `formatManwon(n)` — 1만 미만은 `₩N`, 이상은 `N만원` (대시보드·통계 집계용) |
| 대시보드 인사말 | `lib/greeting.ts` `getDashboardGreeting(name)` — KST 시간대별 인사 (서버에서 계산해 props로 전달, 하이드레이션 불일치 방지) |
| 지출 서버 액션 | `lib/actions/expenses.ts` — `getExpenses`(페이징), `loadMoreExpenses`(무한스크롤), `getExpensesSummary`(카테고리 슬라이스 집계) |
| 고객 등급 CRUD | `lib/actions/customer-grades.ts` — `getCustomerGrades`, `createCustomerGradeConfig`, `updateCustomerGradeConfig`, `deleteCustomerGradeConfig` (테넌트별 커스텀 등급 관리) |
| 통계 서버 액션 | `lib/actions/statistics.ts` — `getSalesStatistics`, `getExpensesStatistics`, `getReservationStatistics`, `getCustomerStatistics` (BFF `GET /statistics/{sales,expenses,reservations,customers}?from=&to=`) |
| 통계 컴포넌트 | `app/(admin)/admin/statistics/components/` — `SalesStatPanel`, `ExpenseStatPanel`, `ReservationStatPanel`, `CustomerStatPanel`, `DateRangeSelector`, `StatAreaChart`, `StatBarList`, `StatDonut`, `StatKpiCard`, `ReservationHeatmap` |
| 라벨 설정 공용 UI | `components/settings/label-settings-manager.tsx` — 매출·지출 카테고리·결제방식·채널 설정을 탭+드래그 핸들로 통합 관리하는 공용 모달 (`LabelSettingsManager`, `LabelTabConfig`) |
| 기간 헤더 공용 UI | `components/layout/PeriodHeader.tsx` — 월네비+기간 셀렉터 (사진첩 등). 기간↔ISO 경계 변환은 `lib/period-range.ts` |

---

## 참고 문서

```
docs/
├── ARCHITECTURE.md             # 시스템 아키텍처 & 기술 선정 이유
├── conventions/                # 코딩 컨벤션 (작업 전 필독)
├── guides/                     # 가이드 (배포, 보안, 프론트엔드)
├── plans/                      # 기능 설계 문서
└── refactoring/                # 리팩토링 / 감사 기록
```

> 기술 스택 상세는 `docs/ARCHITECTURE.md` 참조

## docs 파일명 컨벤션

`yy-mm-dd-{설명}.md` — 예: `26-05-28-server-action-convention.md`
- 설명은 다른 문서와 구분될 정도로 구체적으로 (kebab-case)
- `docs/plans/`·`docs/guides/` 등 하위도 동일 컨벤션 적용
- 단, `docs/ARCHITECTURE.md` 는 제외하며 업데이트 시에도 네이밍을 그대로 유지
- `docs/design/`·`docs/mockups/` 는 디자인 에셋 디렉터리로 본 컨벤션 미적용
