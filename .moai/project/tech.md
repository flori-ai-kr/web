---
작성일: 2026-05-04
소스: CLAUDE.md + package.json + next.config.ts + tsconfig.json + docs/ARCHITECTURE.md
대상 독자: 개발자 + AI 에이전트
---

# 기술 스택

## 한눈에 보기

| 영역 | 기술 | 버전 |
|------|------|------|
| 언어 | TypeScript | ^5.x (ES2022 target) |
| 프레임워크 | Next.js | ^16.1.6 |
| UI 라이브러리 | React | 19.2.0 |
| 데이터베이스 | Supabase (PostgreSQL) | @supabase/supabase-js ^2.86.0 |
| SSR 세션 | @supabase/ssr | ^0.8.0 |
| 스타일링 | Tailwind CSS | ^4 |
| UI 컴포넌트 | shadcn/ui + Radix UI | radix-ui ^1.4.3 |
| 아이콘 | lucide-react | ^0.555.0 |
| 토스트 | sonner | ^2.0.7 |
| 다크모드 | next-themes | ^0.4.6 |
| 검증 | Zod | ^4.3.6 |
| 스토리지 | @aws-sdk/client-s3 (Cloudflare R2) | ^3.990.0 |
| Presigned URL | @aws-sdk/s3-request-presigner | ^3.990.0 |
| 푸시 알림 | web-push | ^3.6.7 |
| 날짜 처리 | date-fns | ^4.1.0 |
| DnD | @dnd-kit/core + sortable + utilities | 6.3.1 / 10.0.0 / 3.2.2 |
| 이미지 압축 | browser-image-compression | ^2.0.2 |
| 캘린더 UI | react-day-picker | ^9.11.3 |
| 내보내기 | exceljs + jspdf + jspdf-autotable | 4.4.0 / 4.1.0 / 5.0.7 |
| 테스트 | vitest | ^4.0.15 |
| 테스트 DOM | @testing-library/react + jsdom | ^16.3.0 / ^27.2.0 |
| 프로퍼티 테스트 | fast-check | ^4.3.0 |
| 린터 | ESLint | ^9 (flat config) |
| 패키지 매니저 | pnpm | — |
| 배포 | Vercel | — |

## 프레임워크

### Next.js 16.1.6 + React 19.2.0

**App Router 채택 이유**: 꽃집 어드민의 핵심 패턴은 CRUD이다. `page.tsx`에서 Supabase를 직접 호출해 데이터를 fetch하고 `*-client.tsx`에 props로 내리는 구조가 Server Components로 자연스럽게 구현된다. 별도 API 레이어(Express, API Routes)를 만들 필요가 없다.

**Server Components**: 초기 페이지 데이터 fetch 담당. 클라이언트 번들에 포함되지 않으므로 번들 크기를 최소화한다.

**Server Actions**: `'use server'` 함수 하나로 DB 접근·검증·에러 처리가 한 파일 안에서 끝난다. `createSale()`, `updateCustomer()` 같은 함수를 클라이언트에서 직접 호출하는 RPC 패턴이다.

**React 19**: Server Components·Actions가 안정 API로 확정된 버전. `use()` 훅, 폼 개선 등 최신 기능 활용.

**`next.config.ts` 설정 포인트**:
- `serverExternalPackages`: `@aws-sdk/*` — 서버사이드 번들에서 외부 패키지로 처리
- `serverActions.bodySizeLimit: '10mb'` — 사진 업로드 허용
- 보안 헤더: `X-Frame-Options: DENY`, `Content-Security-Policy`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`
- 이미지 `minimumCacheTTL: 30일` — Instagram CDN 만료 후에도 Vercel Edge 캐시 서빙

**개발 포트**: `3100` (`next dev -p 3100`)

## 백엔드/DB

### Supabase PostgreSQL + RLS

꽃집 데이터는 관계형이다. 매출 → 고객, 사진 → 매출, 예약 → 매출 전환 등 JOIN과 집계가 핵심이다. MongoDB 같은 문서형 DB보다 PostgreSQL이 이 요구사항에 정확히 맞다.

**멀티테넌시 구현 방식**:
- 12개 테이블에 `user_id UUID NOT NULL REFERENCES auth.users(id)` 추가
- RLS 정책: `auth.uid() = user_id` — DB 레벨 데이터 격리
- `UNIQUE(column, user_id)` 복합 제약: 사용자별 독립 설정 (카드사명, 결제수단, 태그 등)
- Server Action에서 INSERT 시 `requireAuth()` 반환값의 `user.id` 삽입

**@supabase/ssr 0.8.0**: Next.js App Router의 쿠키 기반 세션을 공식 지원. `createServerClient()`로 Server Component·Action·middleware에서 각각 올바른 클라이언트를 생성한다.

**공유 읽기 테이블** (`trend_articles`, `instagram_accounts`, `instagram_posts`): RLS가 `auth.uid() IS NOT NULL`이므로 인증된 모든 사용자가 읽을 수 있다. 쓰기는 Service Role만 가능.

## 스토리지

### Cloudflare R2 via @aws-sdk/client-s3

S3 호환 API를 사용하므로 AWS SDK를 그대로 활용한다. Cloudflare R2를 선택한 이유:
- 이그레스 비용 없음 (Supabase Storage 대비 비용 절감)
- 글로벌 CDN 내장
- S3 호환으로 SDK 전환 없이 연결 가능

`src/lib/storage.ts`가 R2 연결을 추상화한다. 주요 기능:
- 파일 업로드·삭제
- Presigned URL 생성 (직접 업로드 지원)
- 3MB 초과 이미지 자동 압축 (`browser-image-compression`)
- 카드당 최대 10장 제한 (Zod 스키마로 검증)

환경변수: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

## 인증

### Supabase Auth 쿠키 기반 + 3단 방어

**흐름**:
1. `middleware.ts` — 모든 요청에서 Supabase 쿠키 세션 갱신. `/admin/*` 미인증 시 `/login` 리다이렉트
2. `requireAuth()` (`src/lib/auth-guard.ts`) — 모든 Server Action 최상단에서 세션 검증. 미인증 시 `AppError` throw
3. Supabase RLS — DB 레벨에서 `auth.uid() = user_id` 강제 적용

**내부 API 인증** (`/api/internal/*`): HTTP `Authorization: Bearer INTERNAL_API_KEY` 헤더. `timingSafeEqual`로 timing attack 방지. Service Role 클라이언트로 RLS 우회 후 공유 테이블 쓰기.

인증 누락 시 보안 결함으로 간주: Server Action에서 `user_id` 삽입 누락 = RLS 정책 위반 → INSERT 실패.

## UI

### Tailwind 4 + shadcn/ui + Radix UI

**Tailwind 4**: PostCSS 플러그인 방식. CSS 변수 기반 컬러 시스템 (`--brand: #E5614E`, `--sage: #8B9D83`). `transition-all` 금지 — 구체적 속성 명시.

**shadcn/ui**: 22개 컴포넌트 (`src/components/ui/`). Radix UI 프리미티브 기반, 접근성 내장. 커스터마이징은 소스 복사 방식이므로 직접 편집 가능.

**다크모드**: `next-themes` + `:root` / `.dark` CSS 변수 전환. 하드코딩 색상 절대 금지.

**토스트**: `sonner` — `toast.success()` / `toast.error()` 패턴 통일.

**DnD**: `@dnd-kit` — BottomNav 항목 드래그·정렬 (설정 페이지).

**캘린더**: `react-day-picker` v9 — 예약 캘린더 UI.

## 검증

### Zod 4.3.6

`src/lib/validations.ts`에 모든 스키마 중앙화. 적용 범위:
- 모든 CUD Server Action 입력값
- ID 파라미터 UUID 형식 검증
- 파일 크기 5MB 제한, 이미지 MIME 타입 검증
- 환경변수 빌드타임 검증 (`src/lib/env.ts`)

## PWA + 푸시

### Service Worker + Web Push (VAPID)

`public/sw.js`: Web Push 이벤트 수신 → 알림 표시 → 클릭 시 `/admin/calendar` 이동.

`app/manifest.ts`: PWA 매니페스트 (이름, 아이콘, `display: standalone`).

**푸시 흐름**:
1. 사용자가 설정에서 알림 허용 → `push_subscriptions` 테이블에 저장
2. Vercel Cron (`/api/cron/daily-reminder`) 08:00 KST → `push-broadcast.ts` → VAPID 푸시
3. 예약별 리마인더: `reservations.reminder_at` → `/api/cron/scheduled-reminders`

푸시 실패 처리: 404/410 (구독 만료) → 구독 비활성화. 일시 에러는 구독 유지.

## 외부 연동

| 서비스 | 용도 | 연동 방식 |
|--------|------|-----------|
| Apify | 인스타그램 포스트 스크래핑 | Actor 호출 → `/api/internal/instagram` POST |
| 트렌드 RSS | 트렌드 아티클 수집 | RemoteTrigger → `/api/internal/trends` POST |
| Discord Webhook | 미지 에러 로깅 | `src/lib/logger.ts` → `reportError()` |
| RemoteTrigger | Cron 대안 외부 호출 | Mon/Fri 08:00 KST Bearer 인증 호출 |
| Vercel Edge | 이미지 CDN 캐시 | 30일 `minimumCacheTTL` |

**Instagram CDN**: `normalizeInstagramImageUrl()`으로 `stp` 파라미터 제거 → 흰 여백 방지.

## 빌드 / 배포

**Vercel**: Next.js 공식 배포 플랫폼. Edge Network 이미지 최적화.

**환경변수 검증**: `src/lib/env.ts`에서 Zod로 빌드타임 검증. 누락 시 빌드 실패 → 런타임 에러 방지.

**`next.config.ts`**: `validateEnv()`를 최상단에서 호출해 설정 파일 자체가 환경변수를 보증한다.

**보안 헤더** (모든 경로 적용):
- `X-Frame-Options: DENY` — 클릭재킹 방지
- `Content-Security-Policy` — XSS 방지 (허용 도메인 명시)
- `Strict-Transport-Security: max-age=63072000` — HTTPS 강제
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=()` — 하드웨어 차단

`/sw.js`: `Cache-Control: no-cache` — Service Worker 항상 최신 버전 로드.

## 테스트

**vitest 4**: 단위 테스트 실행기. jsdom 환경, `@testing-library/react`로 React 컴포넌트 테스트.

**fast-check**: 프로퍼티 기반 테스트 — 입력값 엣지 케이스 자동 탐색.

현재 상태: 4개 테스트 파일, 약 2.8% 커버리지. 유닛 테스트 위주. E2E 테스트 미구현.

실행 명령: `pnpm test` (vitest run), `pnpm test:watch` (vitest)

## 개발 환경

- **패키지 매니저**: pnpm
- **개발 포트**: 3100 (`next dev -p 3100`)
- **린터**: ESLint 9 flat config (`eslint-config-next 16.0.5`)
- **TypeScript**: strict 모드, `target: ES2022`, `paths: {"@/*": ["./src/*"]}`
- **모듈 해석**: `moduleResolution: bundler` (Next.js 최적화)

## 의존성 카탈로그

### dependencies

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | ^16.1.6 | App Router 프레임워크 |
| `react` / `react-dom` | 19.2.0 | UI 라이브러리 |
| `@supabase/supabase-js` | ^2.86.0 | Supabase 클라이언트 |
| `@supabase/ssr` | ^0.8.0 | Next.js App Router SSR 세션 |
| `@aws-sdk/client-s3` | ^3.990.0 | Cloudflare R2 S3 호환 |
| `@aws-sdk/s3-request-presigner` | ^3.990.0 | Presigned URL 생성 |
| `zod` | ^4.3.6 | 런타임 스키마 검증 |
| `web-push` | ^3.6.7 | VAPID Web Push |
| `date-fns` | ^4.1.0 | 날짜 포맷·계산 |
| `next-themes` | ^0.4.6 | 다크모드 Provider |
| `sonner` | ^2.0.7 | 토스트 알림 |
| `lucide-react` | ^0.555.0 | 아이콘 라이브러리 |
| `tailwind-merge` | ^3.4.0 | 클래스 병합 (`cn()`) |
| `clsx` | ^2.1.1 | 조건부 클래스 |
| `class-variance-authority` | ^0.7.1 | shadcn/ui 변형 관리 |
| `radix-ui` | ^1.4.3 | Radix UI 메타 패키지 |
| `@radix-ui/react-*` | 각 최신 | Dialog, Select, Tabs 등 |
| `@dnd-kit/core` | ^6.3.1 | DnD 코어 |
| `@dnd-kit/sortable` | ^10.0.0 | 정렬 가능 DnD |
| `@dnd-kit/utilities` | ^3.2.2 | DnD 유틸리티 |
| `browser-image-compression` | ^2.0.2 | 클라이언트 이미지 압축 |
| `react-day-picker` | ^9.11.3 | 캘린더 UI |
| `exceljs` | ^4.4.0 | Excel 내보내기 |
| `jspdf` | ^4.1.0 | PDF 생성 |
| `jspdf-autotable` | ^5.0.7 | PDF 표 렌더링 |

### devDependencies

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `typescript` | ^5 | 타입 시스템 |
| `tailwindcss` | ^4 | CSS 프레임워크 |
| `@tailwindcss/postcss` | ^4 | PostCSS 플러그인 |
| `tw-animate-css` | ^1.4.0 | Tailwind 애니메이션 |
| `eslint` | ^9 | 린터 |
| `eslint-config-next` | 16.0.5 | Next.js ESLint 규칙 |
| `vitest` | ^4.0.15 | 테스트 실행기 |
| `@testing-library/react` | ^16.3.0 | React 컴포넌트 테스트 |
| `@testing-library/jest-dom` | ^6.9.1 | DOM 매처 |
| `jsdom` | ^27.2.0 | 브라우저 환경 시뮬레이션 |
| `fast-check` | ^4.3.0 | 프로퍼티 기반 테스트 |
| `@types/node` | ^20 | Node.js 타입 |
| `@types/react` | ^19 | React 타입 |
| `@types/web-push` | ^3.6.4 | web-push 타입 |

관련 문서: [프로젝트 구조](./structure.md) | [코드맵 의존성](./codemaps/dependencies.md)
