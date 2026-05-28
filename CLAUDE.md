# CLAUDE.md

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참조하는 가이드입니다.

---

## 프로젝트 개요

**flori** — 꽃집 매출·지출·고객·사진첩·예약·인사이트를 관리하는 PWA 어드민 웹앱.

멀티테넌시(테넌트별 데이터 격리)를 기본으로 하며, 인증은 Kotlin BFF(`flori-ai/server`)를 Next.js 서버 레이어 경유로 호출하고, 비즈니스 데이터는 Supabase(PostgreSQL + RLS)에 저장한다.

### 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI) |
| Database | Supabase (PostgreSQL, Row Level Security) |
| Auth | Kotlin BFF JWT 쿠키 + 소셜 OAuth (kakao·google·naver) |
| Storage | Cloudflare R2 (S3 호환, CDN, presigned 업로드) |
| Validation | Zod 4 |
| State | React hooks (글로벌 스토어 없음) |
| Push | Web Push API (VAPID) + Service Worker |
| Export | ExcelJS, jsPDF |
| Test | Vitest, fast-check, Testing Library |
| Deploy | Vercel (Cron 포함) |
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
```

---

## 프로젝트 구조

```
page.tsx (Server) → 데이터 fetch → *-client.tsx (Client) → UI 렌더링
```

```
src/
├── app/(public)/        # 공개 홈페이지 (인증 불필요, /)
│   ├── layout.tsx       # 공개 레이아웃 (.site-public CSS 클래스)
│   └── page.tsx         # hero/statement/instagram + floating-cta (Footer는 layout)
├── app/(admin)/admin/   # 어드민 라우트 그룹 (인증 필요, /admin/*)
│   ├── page.tsx              # 대시보드
│   ├── dashboard-client.tsx
│   ├── sales/           # 매출 — sales-client.tsx + components/(SalesSummary, SalesList, SaleFormDialog, SaleDetailDialog)
│   ├── expenses/        # 지출 — expenses-client.tsx + components/(ExpensesList)
│   ├── customers/       # 고객 — customers-client.tsx + components/(CustomerCard, CustomerFormDialog, CustomerDetailDialog)
│   ├── gallery/         # 사진첩
│   ├── calendar/        # 예약 캘린더
│   ├── insights/        # 인사이트 — trends/(트렌드) follows/(인스타) scraps/(내 스크랩)
│   ├── settings/        # 설정 (카드사 + 푸시 알림 + BottomNav 커스텀)
│   └── error.tsx        # 에러 바운더리
├── app/api/cron/        # Vercel Cron — daily-reminder / scheduled-reminders / generate-recurring-expenses
├── app/api/internal/    # 내부 API (Bearer INTERNAL_API_KEY, Service Role) — trends / instagram / instagram-accounts
├── app/auth/            # 소셜 OAuth Route Handlers — oauth-providers.ts, login/[provider], callback/[provider]
├── app/onboarding/      # 소셜 신규 가입 온보딩 (registerToken 가드) — page.tsx, onboarding-form.tsx, actions.ts
├── app/policy/          # 정책 문서 (인증 불필요) — privacy/, terms/, policy-ui.tsx
├── app/login/           # 로그인 (소셜 전용)
├── app/manifest.ts      # PWA 매니페스트
├── app/global-error.tsx # 글로벌 에러 바운더리
├── components/ui/        # shadcn/ui (category-multi-select.tsx 다중선택 포함)
├── components/layout/    # AppLayout, Header, Sidebar, BottomNav
├── components/{sales,gallery,expenses,insights,auth,public}/  # 도메인별 공통 컴포넌트
├── components/theme-provider.tsx
├── lib/actions/          # Server Actions (직접 import)
├── lib/supabase/         # client / server / middleware / service(Service Role)
├── lib/api/              # Kotlin BFF 클라이언트 (client.ts, auth-cookies.ts, cookie-names.ts)
├── lib/storage.ts        # Cloudflare R2 추상화 (uploadFile + getSignedUploadUrl)
├── lib/photo-upload.ts   # presigned URL 발급 → 브라우저→R2 직접 PUT
├── lib/validations.ts    # Zod 스키마 + 이미지 검증
├── lib/errors.ts         # AppError, ErrorCode, withErrorLogging()
├── lib/auth-guard.ts     # requireAuth() — /me 조회 + 온보딩 게이트
├── lib/env.ts            # 환경변수 Zod 검증
├── lib/{constants,utils,date-locale,export,logger,internal-auth,push-broadcast}.ts
├── lib/{public-config,instagram-url,legal-config,onboarding-options}.ts
├── types/database.ts     # 전체 타입 정의
└── public/
    ├── sw.js             # Service Worker (푸시 알림)
    └── icons/            # PWA 아이콘 (192/512, maskable)
```

### 인증 흐름

- middleware.ts → Kotlin BFF JWT 쿠키(`flori_access`/`flori_refresh`) → `requireAuth()` 가드 + 온보딩 게이트(`onboarded === false` → `/onboarding`)
- `/admin/*` 경로만 인증 강제. `/`·`(public)/*`·`/login`·`/onboarding`·`/policy/*` 는 공개 라우트
- 소셜 OAuth: `/auth/login/[provider]` → 공급자 redirect → `/auth/callback/[provider]` → BFF `POST /auth/oauth/{provider}` → registered=true이면 `/admin`, false이면 `registerToken` 쿠키(`flori_register`) → `/onboarding`

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

- 고객 식별: 전화번호 + user_id 복합 unique, 성별(male/female) 선택
- 로드 구입: 매출 등록 간편 모드 (결제방식=현금, 채널=road 고정, 카드사/주문자명/연락처 생략)
- 카드 수수료: `expected_deposit = amount * (1 - fee_rate/100)`, 입금 예정일은 영업일 기준 N일
- 지출 총액: `unit_price * quantity`
- 사진: 3MB 초과 시 자동 압축(`useWebWorker: false` — CSP worker-src 제약), 카드당 최대 10장, Cloudflare R2 저장(CDN). 업로드: `createPhotoUploadTargets()` 로 presigned PUT URL 발급 → 브라우저가 R2 S3 엔드포인트에 직접 PUT (Vercel 4.5MB 본문 제한 우회)
- 예약 리마인더: `reminder_at` 설정 → Cron 푸시 발송
- 미수(외상): `payment_method='unpaid'` + `is_unpaid=true`, 결제 완료 `completeUnpaidSale()`, 되돌리기 `revertUnpaidSale()`
- 푸시 실패: 영구 실패(404/410)만 구독 비활성화, 일시 에러는 유지
- 인사이트 스크랩: `insight_scraps(user_id, target_type, target_id, memo)` 복합 unique. 트렌드/포스트 북마크 토글 + 상세 다이얼로그 메모 편집(blur 자동 저장). `/insights/scraps` + 목록 "스크랩만" 필터(`?scraped=1`)
- 팔로우 포스트: 썸네일 → 라이트박스(prev/next + Esc/화살표). Instagram CDN `stp` 패딩 옵션을 `normalizeInstagramImageUrl()` 로 제거
- 고정비(반복 지출): `recurring_expenses`(주/월/연 + 다중 일자) + `recurring_skips`. `expenses.recurring_id` FK + `(recurring_id, date) UNIQUE`. Cron KST 00:30 자동 등록. 지출 페이지 `[내역|고정비]` 탭. 수정 시 'iOS 이것만/이후 모두' 분기(`updateRecurringExpense` `mode: 'this' | 'future'`)
- 다중선택 필터: `SalesFilters.category`/`payment`/`channel` 은 `string[]`, RPC `get_sales_summary` 인자도 `text[]`

---

## 컬러 시스템

- **어드민 브랜드**: Warm Coral (`--brand: #E5614E`) + Sage Green (`--sage: #8B9D83`)
- **공개 홈페이지 v2 팔레트** (Sage & Wood, `.site-public` 스코프):
  - `--site-paper: #FAF7EF` / `--site-paper-soft: #FFFCF5` (베이스)
  - `--site-ink: #2D2418` / `--site-ink-soft: rgba(45,36,24,0.66)` (잉크 다크 브라운)
  - `--site-accent: #6E7457` (무광 올리브 — 매장 그린월 톤)
  - `--site-muted: rgba(45,36,24,0.42)` / `--site-line: rgba(45,36,24,0.14)`
  - 폰트: Cormorant Garamond(display) + Noto Serif KR + Pretendard(sans)
  - Legacy alias 유지 (`--site-ivory/parchment/charcoal/oxblood/pewter/olive` → v2 매핑)
- **배지 패턴**: `backgroundColor: ${color}40`, `color: color`
- 상세 컬러는 `globals.css` 의 CSS 변수 참조

---

## 주요 파일 위치

| 용도 | 위치 |
|------|------|
| 에러/로깅 | `lib/errors.ts` (AppError, withErrorLogging), `lib/logger.ts` (Discord) |
| 인증 가드 | `lib/auth-guard.ts` (requireAuth — /me + 온보딩 게이트) |
| BFF 클라이언트 | `lib/api/client.ts`, `lib/api/auth-cookies.ts` |
| 검증 스키마 | `lib/validations.ts` (Zod + 이미지 검증) |
| R2 스토리지 | `lib/storage.ts`, `lib/photo-upload.ts` |
| 내부 API 인증 | `lib/internal-auth.ts` (Bearer timing-safe) |
| 푸시 브로드캐스트 | `lib/push-broadcast.ts` |
| 환경변수 검증 | `lib/env.ts` |
| 공유 라벨 상수 | `lib/constants.ts` (PAYMENT_LABELS, CHANNEL_LABELS, EXPENSE_LABELS) |
| 공개 홈 SSOT | `lib/public-config.ts`, `lib/legal-config.ts`, `lib/onboarding-options.ts` |
| 타입 정의 | `types/database.ts` |
| Service Worker | `public/sw.js` |

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
