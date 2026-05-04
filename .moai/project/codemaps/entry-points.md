---
작성일: 2026-05-04
소스: CLAUDE.md + src/app/ 구조 분석 + Phase 1 분석
대상 독자: 개발자 + AI 에이전트
---

# 엔트리포인트

## HTTP 라우트 표

### 페이지 라우트 (인증 필요)

| 메서드 | 경로 | 파일 | 인증 방식 | 응답 타입 |
|--------|------|------|-----------|-----------|
| GET | `/admin` | `(admin)/admin/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/sales` | `(admin)/admin/sales/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/expenses` | `(admin)/admin/expenses/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/customers` | `(admin)/admin/customers/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/calendar` | `(admin)/admin/calendar/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/gallery` | `(admin)/admin/gallery/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/deposits` | `(admin)/admin/deposits/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/insights` | `(admin)/admin/insights/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/insights/trends` | `(admin)/admin/insights/trends/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/insights/follows` | `(admin)/admin/insights/follows/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/insights/scraps` | `(admin)/admin/insights/scraps/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |
| GET | `/admin/settings` | `(admin)/admin/settings/page.tsx` | middleware.ts 리다이렉트 | HTML (SSR) |

### 페이지 라우트 (인증 불필요)

| 메서드 | 경로 | 파일 | 인증 방식 | 응답 타입 |
|--------|------|------|-----------|-----------|
| GET | `/` | `(public)/page.tsx` | 없음 (공개) | HTML (SSR) |
| GET | `/login` | `login/page.tsx` | 없음 | HTML (SSR) |

### API 라우트 — Vercel Cron

| 메서드 | 경로 | 파일 | 인증 방식 | 응답 타입 |
|--------|------|------|-----------|-----------|
| GET/POST | `/api/cron/daily-reminder` | `api/cron/daily-reminder/route.ts` | `CRON_SECRET` 헤더 (Vercel 자동) | JSON |
| GET/POST | `/api/cron/scheduled-reminders` | `api/cron/scheduled-reminders/route.ts` | `CRON_SECRET` 헤더 (Vercel 자동) | JSON |

Vercel Cron 스케줄: `daily-reminder`는 매일 08:00 KST (23:00 UTC). `scheduled-reminders`는 분 단위 폴링 (`reservations.reminder_at` 기준).

### API 라우트 — Internal (외부 루틴 호출)

| 메서드 | 경로 | 파일 | 인증 방식 | 응답 타입 |
|--------|------|------|-----------|-----------|
| POST | `/api/internal/trends` | `api/internal/trends/route.ts` | `Bearer INTERNAL_API_KEY` | JSON |
| POST | `/api/internal/instagram` | `api/internal/instagram/route.ts` | `Bearer INTERNAL_API_KEY` | JSON |
| GET | `/api/internal/instagram-accounts` | `api/internal/instagram-accounts/route.ts` | `Bearer INTERNAL_API_KEY` | JSON |

인증 처리: `src/lib/internal-auth.ts`의 `verifyInternalAuth()` — `timingSafeEqual`로 timing attack 방지. Service Role 클라이언트 사용 (RLS 우회).

### 특수 라우트

| 경로 | 파일 | 설명 |
|------|------|------|
| `/sw.js` | `public/sw.js` | Service Worker — `Cache-Control: no-cache` |
| `/manifest.webmanifest` | `app/manifest.ts` | PWA 매니페스트 자동 생성 |
| `/icon.svg` | `app/icon.svg` | 파비콘 |

## Service Worker 엔트리포인트

`public/sw.js`는 브라우저가 직접 등록하는 별도 스크립트다. Next.js 빌드 파이프라인 밖에서 서빙된다.

```
이벤트 리스너:
  push         → 알림 데이터 파싱 → self.registration.showNotification()
  notificationclick → 클릭한 알림 닫기 → clients.matchAll() → /admin/calendar 이동
  install      → skipWaiting() (즉시 활성화)
  activate     → clients.claim() (기존 페이지 즉시 제어)
```

등록: `src/components/sw-register.tsx` — 클라이언트 컴포넌트에서 `navigator.serviceWorker.register('/sw.js')`

## Server Actions — 내부 RPC 엔트리포인트

Server Action은 HTTP 엔드포인트는 아니지만, Next.js가 내부적으로 POST 요청으로 처리한다. 클라이언트 컴포넌트에서 직접 함수를 호출하는 RPC 패턴이다.

| 도메인 | 파일 | 주요 Actions (예시) |
|--------|------|---------------------|
| 인증 | `actions/auth.ts` | `signIn()`, `signOut()` |
| 매출 | `actions/sales.ts` | `createSale()`, `updateSale()`, `deleteSale()`, `completeUnpaidSale()`, `revertUnpaidSale()` |
| 지출 | `actions/expenses.ts` | `createExpense()`, `updateExpense()`, `deleteExpense()` |
| 고객 | `actions/customers.ts` | `createCustomer()`, `updateCustomer()`, `deleteCustomer()` |
| 예약 | `actions/reservations.ts` | `createReservation()`, `updateReservation()`, `deleteReservation()` |
| 캘린더 | `actions/calendar-events.ts` | `createCalendarEvent()`, `updateCalendarEvent()` |
| 사진 | `actions/photo-cards.ts` | `uploadSalePhotos()`, `deletePhotoCard()` |
| 사진 태그 | `actions/photo-tags.ts` | `createPhotoTag()`, `deletePhotoTag()` |
| 입금 | `actions/deposits.ts` | `getDepositRecords()` |
| 인사이트 | `actions/insights.ts` | `getTrendArticles()`, `getInstagramPosts()` |
| 스크랩 | `actions/scraps.ts` | `toggleScrap()`, `updateScrapMemo()` |
| 설정 | `actions/settings.ts` | `getUserPreferences()`, `updateBottomNavItems()` |
| 매출 설정 | `actions/sale-settings.ts` | `createCardCompany()`, `updateCardCompany()` |
| 지출 설정 | `actions/expense-settings.ts` | `createExpenseCategory()` |
| 푸시 | `actions/push.ts` | `subscribePush()`, `unsubscribePush()` |
| 대시보드 | `actions/dashboard.ts` | `getDashboardStats()` |
| 통계 | `actions/statistics.ts` | `getMonthlySales()` |

도메인별 파일 수: 거래 3개, 고객·예약 3개, 미디어 2개, 인사이트 2개, 설정 3개, 인프라 4개 = 합계 17개

관련 문서: [코드맵 개요](./overview.md) | [모듈 경계](./modules.md) | [데이터 흐름](./data-flow.md)
