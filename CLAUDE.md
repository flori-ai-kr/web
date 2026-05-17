# Hazel Admin - 꽃집 관리 시스템

꽃집(헤이즐) 매출/지출/고객/사진첩/예약/인사이트를 관리하는 PWA 어드민 웹앱.

## 핵심 패턴

```
page.tsx (Server) → 데이터 fetch → *-client.tsx (Client) → UI 렌더링
```

- **Server Actions**: `src/lib/actions/` — `'use server'`, throw 패턴 (withErrorLogging 래퍼), 직접 import 사용 (barrel import 금지)
- **에러 처리**: `withErrorLogging()` 래퍼 → AppError(예상된 에러) / Unknown(Discord 로깅)
- **인증**: middleware.ts → Supabase Auth 쿠키 → `requireAuth()` 가드 (읽기 포함 모든 액션에 적용). `/admin/*` 경로만 인증 강제, `/`·`(public)/*` 공개 라우트는 인증 불필요
- **멀티테넌시**: 10개 테이블에 `user_id` 컬럼, RLS `auth.uid() = user_id`, Server Action에서 `user.id` 삽입
- **검증**: Zod 스키마 (`src/lib/validations.ts`) — 모든 CUD 액션 + ID 파라미터 UUID 검증 + 파일 크기 5MB 제한
- **상태**: useState/useMemo만 사용. 글로벌 상태 없음. 변경 후 `router.refresh()`
- **검색**: 서버사이드 (Supabase ilike + `SalesFilters.search`) + 클라이언트 디바운스(300ms). 검색 시 페이지네이션 리셋
- **네비게이션**: 데스크톱은 Sidebar, 모바일/태블릿은 BottomNav (lg 브레이크포인트 기준). BottomNav는 `user_preferences.bottom_nav_items` JSONB로 4~6개 항목을 사용자 지정 가능 (설정 → more-sheet + @dnd-kit/sortable)
- **내부 API**: `src/app/api/internal/` — `Authorization: Bearer INTERNAL_API_KEY` (timing-safe 검증), Service Role로 RLS 우회, 외부 루틴(RemoteTrigger)에서 호출
- **다크모드**: next-themes + CSS 변수 (`:root` / `.dark`) — 하드코딩 색상 금지
- **푸시 알림**: Service Worker + Web Push API (VAPID), 예약 리마인더

## 코드 규칙

- 한국어 UI (라벨, 메시지, 플레이스홀더 전부)
- 엔터키 폼 제출 방지 필수: `onSubmit={(e) => { e.preventDefault(); ... }}`
- 삭제는 Dialog 사용 (`confirm()` 금지)
- 금액: `AmountInput` 컴포넌트, 전화번호: 자동 포맷팅 + `inputMode="tel"`
- 아이콘 버튼: `aria-label` 필수
- 클릭 가능한 Card: `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `aria-label`
- 이미지 alt: 의미 있는 설명 (`alt=""` 금지)
- 애니메이션: `transition-all` 금지 → 구체적 속성 명시 (`transition-colors` 등)
- date-fns locale: `@/lib/date-locale`에서 import (`date-fns/locale` 직접 import 금지)
- 통계 데이터: DB 하드코딩 금지, 실시간 집계
- toast: `sonner` — `toast.success()` / `toast.error()`
- UI 컴포넌트: `@/components/ui/*` (shadcn/ui), 아이콘: `lucide-react`
- 에러: 예상된 에러는 `AppError`, 미지 에러는 `withErrorLogging()`으로 Discord 전송

## 디렉터리 구조

```
src/
├── app/(public)/        # 공개 홈페이지 (인증 불필요, /)
│   ├── layout.tsx       # 공개 레이아웃 (.site-public CSS 클래스)
│   └── page.tsx         # 공개 홈페이지 — hero/statement/instagram + floating-cta (Footer는 layout)
├── app/(admin)/admin/   # 어드민 라우트 그룹 (인증 필요, /admin/*)
│   ├── page.tsx         # 대시보드
│   ├── dashboard-client.tsx  # 대시보드 클라이언트
│   ├── sales/           # 매출
│   │   ├── sales-client.tsx       # 메인 컨테이너 (상태 관리)
│   │   └── components/            # SalesSummary, SalesList, SaleFormDialog, SaleDetailDialog
│   ├── expenses/        # 지출
│   │   ├── expenses-client.tsx    # 메인 컨테이너
│   │   └── components/            # ExpensesList
│   ├── customers/       # 고객
│   │   ├── customers-client.tsx   # 메인 컨테이너
│   │   └── components/            # CustomerCard, CustomerFormDialog, CustomerDetailDialog
│   ├── deposits/        # 입금 대조
│   ├── gallery/         # 사진첩
│   ├── calendar/        # 예약 캘린더
│   ├── insights/        # 인사이트 (랜딩)
│   │   ├── page.tsx / insights-client.tsx
│   │   ├── trends/      # 트렌드 아티클 (카테고리 필터 + 스크랩 토글)
│   │   ├── follows/     # 인스타그램 피드 (계정별 + 포스트 라이트박스)
│   │   └── scraps/      # 내 스크랩 — 트렌드/포스트 탭, 메모 표시
│   ├── settings/        # 설정 (카드사 + 푸시 알림 + BottomNav 커스텀)
│   └── error.tsx        # 에러 바운더리
├── app/api/cron/        # Vercel Cron 라우트
│   ├── daily-reminder/  # 매일 08:00 KST 예약 요약 푸시
│   └── scheduled-reminders/ # 개별 예약 리마인더 푸시
├── app/api/internal/    # 내부 API (Bearer INTERNAL_API_KEY, Service Role)
│   ├── trends/          # POST — 트렌드 아티클 수집 + 푸시 브로드캐스트
│   ├── instagram/       # POST — 인스타그램 포스트 수집 + 푸시 브로드캐스트
│   └── instagram-accounts/ # GET — 팔로우 계정 목록
├── app/login/           # 로그인
├── app/manifest.ts      # PWA 매니페스트
├── app/global-error.tsx # 글로벌 에러 바운더리
├── components/ui/       # shadcn/ui (22개, sheet.tsx 추가)
├── components/layout/   # AppLayout, Header, Sidebar, BottomNav
├── components/theme-provider.tsx  # next-themes 프로바이더
├── components/sales/    # 매출 공통 (SalePhotoModal, SalesSettingsModal, CustomerAutocomplete)
├── components/gallery/  # 갤러리 관련 컴포넌트
├── components/expenses/ # 지출 관련 컴포넌트
├── components/insights/ # 인사이트 공통 (category-badge, scrap-button, scrap-memo-editor)
├── components/public/   # 공개 홈페이지 섹션 (hero, statement, instagram, footer, header, floating-cta)
├── lib/actions/         # Server Actions (17개, 직접 import — scraps.ts 포함)
├── lib/public-config.ts # 공개 홈페이지 비즈니스 데이터 SSOT (HAZEL_BUSINESS, HAZEL_LINKS, HAZEL_SEO)
├── lib/instagram-url.ts # Instagram CDN URL stp 파라미터 정규화 (썸네일 흰 여백 제거)
├── lib/constants.ts     # 공유 라벨 상수 (PAYMENT_LABELS, CHANNEL_LABELS, EXPENSE_LABELS)
├── lib/photo-upload.ts  # 클라이언트 업로드 헬퍼 — presigned URL 발급 → 브라우저→R2 직접 PUT → PhotoFile[] 반환
├── lib/storage.ts       # Cloudflare R2 스토리지 추상화 (S3 호환) — uploadFile + getSignedUploadUrl(presigned PUT)
├── lib/supabase/        # client.ts, server.ts, middleware.ts, service.ts (Service Role 클라이언트)
├── lib/internal-auth.ts # Bearer INTERNAL_API_KEY timing-safe 검증
├── lib/push-broadcast.ts # 모든 활성 구독자에게 푸시 브로드캐스트
├── lib/errors.ts        # AppError, ErrorCode, withErrorLogging()
├── lib/logger.ts        # reportError() → Discord 웹훅
├── lib/validations.ts   # Zod 스키마 + 이미지 파일 검증 — validateImageFile(File) + validateImageMeta({name,type,size})
├── lib/date-locale.ts   # date-fns 로케일 추상화 (ko)
├── lib/auth-guard.ts    # requireAuth()
├── lib/env.ts           # 환경변수 Zod 검증
├── lib/utils.ts         # cn(), formatPhoneNumber(), getMonthDateRange() 등
├── lib/export.ts        # ExportConfig<T> 제네릭, CSV/Excel/PDF 내보내기
├── types/database.ts    # 전체 타입 정의
└── public/
    ├── sw.js            # Service Worker (푸시 알림)
    └── icons/           # PWA 아이콘 (192/512, maskable)
```

## 멀티테넌시

- 15개 테이블에 `user_id UUID NOT NULL REFERENCES auth.users(id)` 추가 (인사이트 스크랩 포함)
  - sales, expenses, customers, reservations, photo_cards, photo_tags, card_company_settings, sale_categories, payment_methods, push_subscriptions, user_preferences, insight_scraps
  - 공유 읽기 테이블 (SELECT only, writes via service role): trend_articles, instagram_accounts, instagram_posts
- RLS 정책: `auth.uid() = user_id` (CRUD별 분리)
- unique 제약: 기존 단일 컬럼에서 `(column, user_id)` 복합으로 변경
  - `customers(phone, user_id)`, `card_company_settings(name, user_id)`, `photo_tags(name, user_id)`, `sale_categories(value, user_id)`, `payment_methods(value, user_id)`
- Server Action에서 INSERT 시 `user_id: user.id` 삽입 (requireAuth()로 획득)
- app_config: RLS는 `auth.uid() IS NOT NULL` (공유 설정)

## 비즈니스 로직

- 고객 식별: 전화번호 + user_id 기준 (복합 unique), 성별(male/female) 선택 가능
- 로드 구입: 매출 등록 시 간편 모드 (결제방식=현금, 채널=road로 고정, 카드사/주문자명/연락처 생략)
- 카드 수수료: `expected_deposit = amount * (1 - fee_rate/100)`
- 입금 예정일: 영업일 기준 N일
- 지출 총액: `unit_price * quantity`
- 사진: 3MB 초과 시 자동 압축 (`useWebWorker: false` — CSP worker-src 제약), 카드당 최대 10장, Cloudflare R2 저장 (CDN 캐싱), 매출/캘린더 양쪽에서 등록/수정/삭제 가능. 업로드 흐름: `createPhotoUploadTargets()` Server Action으로 presigned PUT URL 발급 → 브라우저가 R2 S3 API 엔드포인트에 직접 PUT (Vercel 4.5MB 본문 제한 우회)
- 예약 리마인더: `reminder_at` 시간 설정 → Cron으로 푸시 알림 발송
- 미수(외상): `payment_method='unpaid'` + `is_unpaid=true`, 결제 완료 시 `completeUnpaidSale()`, 되돌리기 `revertUnpaidSale()`
- 푸시 실패: 영구 실패(404/410)만 구독 비활성화, 일시 에러는 유지
- 인사이트 스크랩: `insight_scraps(user_id, target_type, target_id, memo)` 복합 unique. 트렌드 카드/포스트 카드에 북마크 토글, 상세 다이얼로그 내 메모 편집(포커스 해제 시 자동 저장). `/insights/scraps` 전용 페이지 + 트렌드·팔로우 목록 "스크랩만" 필터(`?scraped=1`)
- 팔로우 포스트: 썸네일 클릭 → 라이트박스(확대 뷰 + prev/next + Esc/화살표 키). Instagram 이동은 딥링크 버튼만. Instagram CDN `stp=dst-jpg_e35_p1080x1080_sh0.08_tt6` 패딩 옵션을 `normalizeInstagramImageUrl()`로 제거해 흰 여백 방지

## 컬러 시스템

- **어드민 브랜드**: Warm Coral (`--brand: #E5614E`) + Sage Green (`--sage: #8B9D83`)
- **공개 홈페이지 v2 팔레트** (Sage & Wood, `.site-public` 스코프):
  - `--site-paper: #FAF7EF` / `--site-paper-soft: #FFFCF5` (베이스 — 따뜻한 거의-흰)
  - `--site-ink: #2D2418` / `--site-ink-soft: rgba(45,36,24,0.66)` (잉크 다크 브라운)
  - `--site-accent: #6E7457` (무광 올리브 — 매장 그린월 톤, 액센트)
  - `--site-muted: rgba(45,36,24,0.42)` / `--site-line: rgba(45,36,24,0.14)`
  - 폰트: Cormorant Garamond (display, `--font-display`) + Noto Serif KR (`--font-serif-kr`) + Pretendard (sans)
  - Legacy alias 유지 (`--site-ivory/parchment/charcoal/oxblood/pewter/olive` → v2 매핑)
- **배지 패턴**: `backgroundColor: ${color}40`, `color: color`
- 상세 컬러는 `globals.css`의 CSS 변수 참조

## 기술 스택 상세

→ `docs/ARCHITECTURE.md` 참조
