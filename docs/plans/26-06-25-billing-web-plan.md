# 토스 빌링 WEB 구현 계획 (Next.js 프론트엔드)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 로 태스크별 실행. Steps는 checkbox(`- [ ]`). **이 문서는 계획만 — 다음 세션에서 실행.** 작업 워크트리: `/Users/hansangho/Desktop/flori-ai/web-session4-billing` (브랜치 `session4-billing`).

**Goal:** api 백엔드(Part1~5 완료)의 빌링 계약을 소비하는 프론트 — 점주앱(구독 시작·관리·페이월·쿠폰 등록) + 슈퍼어드민 콘솔(쿠폰 발행/조회/폐기·구독 현황 정합).

**Architecture:** Server Action(`'use server'`) → `apiFetch` → api BFF. 토스 카드창은 클라이언트 컴포넌트에서 `@tosspayments/tosspayments-sdk`로 호출. 게이트는 admin layout에 추가.

## 선행 사실 (api는 완료·계약 확정)
api 브랜치 `session4-billing`(api 레포) `f80d62d..27e8f1b`, `./gradlew check` 그린, 통합리뷰 Ready-to-merge. 아래 엔드포인트가 **이미 구현**됨:
- 점주(requireAuth): `GET /billing/prepare`→`{customerKey}`; `POST /billing/subscribe`{plan,authKey,customerKey}→`{plan,status,currentPeriodEnd,nextBillingAt,cancelAtPeriodEnd,card}`; `GET /billing/me`→`{subscription,card,recentPayments}`; `POST /billing/cancel`; `POST /billing/resume`; `POST /billing/card`{authKey,customerKey}; `POST /coupons/redeem`{code}→`{grantedDays,nextBillingAt,pending}`.
- 콘솔(requireAdmin): `POST /admin/coupons`{days,code?,validFrom?,validUntil?,maxRedemptions?,perUserLimit,source,memo?}; `GET /admin/coupons`→`CouponResponse[]`; `GET /admin/coupons/{id}`→`{coupon,redemptions[]}`; `POST /admin/coupons/{id}/disable`; `GET /admin/subscriptions?status=`→`AdminSubscriptionRow[]`.
- 상태값(대문자): `TRIALING|ACTIVE|IN_GRACE|EXPIRED`. CouponResponse.effectiveStatus: `ACTIVE|DISABLED|EXPIRED|EXHAUSTED`.
- 금액: 월 14900 / 연 154800.

> **응답 DTO 정확한 필드는 api `billing/dto/*.kt`·`admin/dto/AdminStatsDtos.kt` 참조**(예: SubscriptionResponse, MeResponse, CouponResponse, CouponDetailResponse, RedemptionRow, AdminSubscriptionRow=`{userId,plan,status,nextBillingAt,currentPeriodEnd,cancelAtPeriodEnd,createdAt}`).

## Global Constraints
- 데이터 경로: **Server Action → apiFetch** (클라이언트 직접 fetch 금지). `'use server'` + `requireAuth()`/`requireAdmin()` + `withErrorLogging('name', _fn)` + 필요시 `revalidatePath()`. (기존 `admin-prompts.ts` 패턴.)
- 토스 SDK: `@tosspayments/tosspayments-sdk` 설치(React 19 → 필요시 `--legacy-peer-deps`). **`NEXT_PUBLIC_TOSS_CLIENT_KEY`만** 추가(시크릿/웹훅키는 api 몫, web에 두지 말 것). `src/lib/env.ts` zod 스키마에 등록.
- 게이트 순서: 로그인 → 사업자인증(APPROVED) → **구독**. admin layout의 `BusinessVerificationGate` 통과 후 구독 체크.
- 상태 매핑: api 대문자(TRIALING/ACTIVE/IN_GRACE/EXPIRED)를 프론트가 그대로 받음. 기존 SubscriptionBadge의 소문자 매핑은 **교체**.
- UI: shadcn/ui(`Dialog/Table/Badge/Input/Select/Button(variant=brand)/Card/Label`) + `sonner` toast + Dusty Rose 팔레트. 클라이언트 컴포넌트 `'use client'`+`useState/useTransition`.
- 린트/테스트: `npm run lint`(eslint), `npm test`(vitest run), `npm run build`. **태스크마다 커밋 전 `npm run lint` + 관련 `npm test` 통과.** Server Action 로직은 Vitest 단위테스트(기존 `admin-prompts.test.ts` 패턴, apiFetch 모킹). 토스 카드창 플로우는 수동/E2E(부분 모킹).
- Git: 변경 파일만 `git add`(`-A` 금지), `Co-Authored-By: Claude <noreply@anthropic.com>`.

## 마일스톤 / 태스크
- T1 인프라(SDK·env·타입·Server Actions)
- T2 점주앱 구독 시작 플로우(checkout→토스창→success/fail)
- T3 점주앱 구독 관리 + 페이월 게이트 + 쿠폰 등록
- T4 콘솔 쿠폰(목록·발행·상세·폐기)
- T5 콘솔 구독 현황 정합(기존 페이지 새 계약으로 수정)

---

## Task 1: 인프라 (SDK 설치 · env · 타입 · Server Actions)

**Files:**
- Modify: `package.json`(@tosspayments/tosspayments-sdk), `src/lib/env.ts`(NEXT_PUBLIC_TOSS_CLIENT_KEY), `.env.example`/`.env.local`
- Create: `src/types/billing.ts`
- Create: `src/lib/actions/billing.ts`(점주), `src/lib/actions/admin-coupons.ts`(콘솔)
- Test: `src/lib/actions/__tests__/billing.test.ts`

**Steps (요지 — 다음 세션 상세 실행):**
- [ ] `npm i @tosspayments/tosspayments-sdk` (필요시 `--legacy-peer-deps`). lockfile 커밋.
- [ ] `src/lib/env.ts` serverEnvSchema에 `NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string().min(1)` 추가, `.env.local`·`.env.example`에 `NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...`(토스 체험상점 테스트 클라이언트키).
- [ ] `src/types/billing.ts`: api DTO에 맞춘 타입 — `BillingPlan='MONTHLY'|'YEARLY'`, `SubscriptionStatus='TRIALING'|'ACTIVE'|'IN_GRACE'|'EXPIRED'`, `CardSummary`, `SubscriptionResponse`, `PaymentSummary`, `MeResponse{subscription:SubscriptionResponse|null, recentPayments:PaymentSummary[]}`, `RedeemResponse{grantedDays,nextBillingAt:string|null,pending:boolean}`, `Coupon`(effectiveStatus 포함), `CouponDetail{coupon,redemptions:RedemptionRow[]}`, `CouponIssueInput`, `AdminSubscriptionRow{userId,plan,status,nextBillingAt,currentPeriodEnd,cancelAtPeriodEnd,createdAt}`.
- [ ] `src/lib/actions/billing.ts` (점주, `requireAuth()`):
  - `prepareBilling(): {customerKey}` → `apiFetch('/billing/prepare')`
  - `subscribe(plan, authKey, customerKey)` → `apiFetch('/billing/subscribe', {method:'POST', body})` + `revalidatePath('/admin/billing')`
  - `getMyBilling(): MeResponse` → `GET /billing/me`
  - `cancelSubscription()` / `resumeSubscription()` → POST /billing/cancel · /resume + revalidate
  - `changeCard(authKey, customerKey)` → POST /billing/card
  - `redeemCoupon(code): RedeemResponse` → POST /coupons/redeem + revalidate
- [ ] `src/lib/actions/admin-coupons.ts` (콘솔, `requireAdmin()`): `listCoupons()`, `issueCoupon(input)`, `couponDetail(id)`, `disableCoupon(id)` → /admin/coupons*; revalidatePath('/console/coupons').
- [ ] Vitest: billing.test.ts — apiFetch 모킹해 각 액션이 올바른 path/method/body로 호출하는지(기존 admin-prompts.test.ts 패턴).
- [ ] `npm run lint` + `npm test` 통과 → 커밋 `feat(web): 빌링 SDK·env·타입·Server Actions 인프라`.

---

## Task 2: 점주앱 구독 시작 플로우 (checkout → 토스창 → success/fail)

**Files:**
- Create: `src/app/(admin)/admin/billing/checkout/page.tsx` + `checkout-client.tsx`('use client')
- Create: `src/app/(admin)/admin/billing/success/page.tsx`, `src/app/(admin)/admin/billing/fail/page.tsx`

**Steps:**
- [ ] `checkout-client.tsx`('use client'): 플랜 선택(월 14,900 / 연 154,800 토글) → [구독 시작] 클릭 시:
  ```ts
  import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
  const { customerKey } = await prepareBilling()
  const tp = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
  const payment = tp.payment({ customerKey })
  await payment.requestBillingAuth({
    method: 'CARD',
    successUrl: `${location.origin}/admin/billing/success?plan=${plan}`,
    failUrl: `${location.origin}/admin/billing/fail`,
    customerEmail, customerName, // /me 에서
  })
  ```
- [ ] `success/page.tsx` (Server Component): `searchParams: Promise<{authKey?,customerKey?,plan?}>` → authKey+customerKey+plan 추출 → `subscribe(plan, authKey, customerKey)` 호출 → 성공 화면("14일 무료체험 시작! 다음 결제 {nextBillingAt}") + `/admin`로 이동 버튼. 파라미터 누락/실패 시 /fail로.
- [ ] `fail/page.tsx`: 실패 사유(searchParams `code`,`message`) 안내 + 재시도 링크(/admin/billing/checkout).
- [ ] 수동 검증(토스 테스트키+테스트카드 BIN+본인인증 000000) — E2E는 토스창 외부라 부분 모킹.
- [ ] `npm run lint`+`build` → 커밋 `feat(web): 구독 시작 플로우(checkout·토스 카드창·success/fail)`.

> 주의: `requestBillingAuth`는 클라이언트에서만. `NEXT_PUBLIC_TOSS_CLIENT_KEY`는 클라 노출 OK. successUrl로 토스가 `authKey`,`customerKey`를 쿼리로 붙여 돌려줌.

---

## Task 3: 점주앱 구독 관리 + 페이월 게이트 + 쿠폰 등록

**Files:**
- Create: `src/app/(admin)/admin/billing/page.tsx` + 클라 컴포넌트(관리 액션)
- Create: `src/app/(admin)/admin/billing/components/subscription-gate.tsx`
- Modify: `src/app/(admin)/admin/layout.tsx` (게이트 추가)

**Steps:**
- [ ] `/admin/billing/page.tsx`: `getMyBilling()` → 현재 플랜·상태·다음 결제일·카드(신한 ****1234)·최근 결제내역 표시 + 클라 컴포넌트로 [해지]/[재개]/[카드교체]/[쿠폰 등록] 액션(useTransition+toast). 쿠폰 입력 → `redeemCoupon(code)` → 결과 토스트.
- [ ] `SubscriptionGate`: status가 `EXPIRED` 또는 구독 없음(NONE)일 때 페이월(플랜 안내 + /admin/billing/checkout CTA). `BusinessVerificationGate` 패턴(풀스크린) 참고.
- [ ] `layout.tsx`: `Promise.all`에 `getMyBilling()` 추가 → 사업자인증 게이트 통과 **후** `subscription==null || status==='EXPIRED'`면 `<SubscriptionGate/>` 렌더(AppLayout 없이). `IN_GRACE`는 진입 허용 + 상단 경고 배너("결제 실패, 카드 확인"). `TRIALING/ACTIVE`는 정상.
  - ⚠️ 출시 마이그레이션(설계 §8-4): 기존 활성 유저는 api에서 체험 부여 정책 적용 후 게이트 ON. 게이트로 전원 잠기지 않게 출시 전 확인.
- [ ] `npm run lint`+`build` → 커밋 `feat(web): 구독 관리 페이지 + 페이월 게이트 + 쿠폰 등록`.

---

## Task 4: 콘솔 쿠폰 (목록 · 발행 · 상세 · 폐기)

**Files:**
- Create: `src/app/(console)/console/coupons/page.tsx` + `coupons-client.tsx`, `issue-dialog.tsx`
- Create: `src/app/(console)/console/coupons/[id]/page.tsx` (+ 클라)

**Steps:** (기존 `/console/broadcasts`(compose-dialog) · `/console/prompts` 패턴 그대로)
- [ ] `/console/coupons/page.tsx`(Server) → `listCoupons()` → `coupons-client.tsx`(테이블: 코드·일수·effectiveStatus 뱃지·`사용량 37/100`·기간 + [발행] 버튼 + 행 클릭→상세).
- [ ] `issue-dialog.tsx`(Dialog+Form): 코드(◉자동생성=빈값 전송 / ○직접입력)·무료일수·등록기간(validFrom/validUntil)·총량(maxRedemptions)·1인한도(perUserLimit)·용도(source select: PROMO/REFERRAL/EVENT/MANUAL)·메모 → `issueCoupon(input)` → toast + 목록 갱신.
- [ ] `/console/coupons/[id]/page.tsx` → `couponDetail(id)` → 쿠폰 요약 + 사용현황 테이블(redemptions: userId·grantedDays·redeemedAt) + [폐기] 버튼(`disableCoupon(id)` → 확인 dialog → toast).
- [ ] effectiveStatus 뱃지 매핑: ACTIVE=success, DISABLED=muted, EXPIRED=danger, EXHAUSTED=warning (StatusBadge tone).
- [ ] 콘솔 사이드바/네비에 `/console/coupons` 항목 추가(기존 콘솔 네비 정의 위치 확인).
- [ ] `npm run lint`+관련 `npm test`+`build` → 커밋 `feat(web): 콘솔 쿠폰 발행/목록/상세/폐기`.

---

## Task 5: 콘솔 구독 현황 정합 (기존 페이지 → 새 api 계약)

**Files:**
- Modify: `src/types/admin.ts` (`AdminSubscriptionRow` 교체), `src/lib/actions/admin-subscriptions.ts`(그대로 둘 수도), `src/app/(console)/console/subscriptions/subscriptions-client.tsx`, `src/components/console/status-badge.tsx`(SubscriptionBadge)

**배경:** 기존 `/console/subscriptions`는 구 RevenueCat 형태(`store/productId/entitlement`, 소문자 상태 `active/in_grace/expired/none`)를 기대 → 우리 api `GET /admin/subscriptions`는 `{userId,plan,status(대문자),nextBillingAt,currentPeriodEnd,cancelAtPeriodEnd,createdAt}` 반환. **정합 필요.**

**Steps:**
- [ ] `AdminSubscriptionRow` 타입을 새 api 응답에 맞춰 교체(plan·status 대문자·nextBillingAt·cancelAtPeriodEnd·createdAt; store/productId/entitlement 제거).
- [ ] `subscriptions-client.tsx` 테이블 컬럼 교체: userId·상태·플랜·다음결제일(nextBillingAt)·이용종료(currentPeriodEnd)·해지예약(cancelAtPeriodEnd). (status 필터 select 추가는 선택.)
- [ ] `SubscriptionBadge`: 대문자 매핑으로 교체 — TRIALING=info(체험), ACTIVE=success, IN_GRACE=warning, EXPIRED=danger.
- [ ] (선택) AdminOverview 화면이 `subscriptions` 카운트(active/trialing/inGrace/expired)를 쓰면 표시 추가 — 콘솔 개요 페이지 확인.
- [ ] `npm run lint`+`build` → 커밋 `fix(web): 콘솔 구독현황을 새 빌링 api 계약으로 정합`.

---

## 전체 완료 검증
- [ ] `npm run lint` + `npm test` + `npm run build` 전부 통과.
- [ ] 수동 E2E(api를 토스 테스트키로 띄운 상태): 구독 시작→체험→/admin/billing 표시, 쿠폰 등록→날짜 밀림, 콘솔 발행/폐기, 구독현황 표시.

## 실행 시 확인 사항
- api 응답 DTO 정확한 필드명/형(특히 SubscriptionResponse·MeResponse·CouponResponse)을 api 코드(`billing/dto`)에서 대조 후 타입 작성.
- `requireAdmin`은 `GET /admin/me {isAdmin}` 호출 — api에 존재 확인됨.
- 콘솔 네비/라우트 등록 위치(기존 `/console/*` 사이드바 정의) 확인 후 coupons 추가.
- React 19 + `@tosspayments/tosspayments-sdk` peer-deps 충돌 시 `--legacy-peer-deps`.
- 출시일 게이트 마이그레이션(기존 유저 체험 자동부여)은 api 측 정책과 함께 — 게이트로 전원 잠금 방지.
