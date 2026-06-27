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

## ⚠️ 시안 v2 승인 반영 (2026-06-25 — 이게 우선)
점주앱은 **데스크톱 웹 셸**(상단 Header + 좌측 Sidebar + max-w-7xl, 모바일은 BottomNav) 기준. 시안: `docs/_tmp/billing-mockup.html`. 핵심 변경 2가지:
1. **구독 관리 UI는 독립 페이지가 아니라 설정 페이지(`/admin/settings`) 최상단 카드**(푸시 알림 카드 **위**). → `/admin/billing/page.tsx` 만들지 않음.
2. **구독 시작 체크아웃은 페이월 게이트가 사용하는 컴포넌트(`BillingCheckout`)**로. success/fail은 **구독 게이트에 막히면 안 되므로**(토스 복귀 시점엔 아직 미구독) `(admin)` 레이아웃 **밖** 새 라우트그룹 `(billing)`에 배치.

## 마일스톤 / 태스크
- T1 인프라(SDK·env·타입·Server Actions)
- T2 구독 시작 플로우(`BillingCheckout` 컴포넌트 + `(billing)` 라우트그룹 success/fail — 게이트에 안 막히게)
- T3 설정 내 구독·결제 카드(최상단) + 페이월 게이트(SubscriptionGate) + IN_GRACE 배너
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

## Task 2: 구독 시작 플로우 (BillingCheckout 컴포넌트 + (billing) 라우트그룹 success/fail)

> ⚠️ 시안 v2 반영: 독립 `/admin/billing/checkout` **게이트드 페이지를 만들지 않는다.** 체크아웃(플랜 선택+토스 호출)은 **클라 컴포넌트**(`BillingCheckout`)로 만들어 페이월 게이트(T3)가 임포트해 쓴다. success/fail은 **구독 게이트에 막히면 안 되므로**(토스 복귀 시점엔 아직 미구독) `(admin)` 레이아웃 **밖** 새 라우트그룹 `(billing)`에 둔다.

**Files:**
- Create: `src/app/(admin)/admin/billing/components/billing-checkout.tsx`('use client') — 플랜 선택 + 토스 호출(게이트가 임포트)
- Create: `src/app/(billing)/layout.tsx`(requireAuth만 — 구독 게이트 없음), `src/app/(billing)/billing/success/page.tsx`, `src/app/(billing)/billing/fail/page.tsx`

**Steps:**
- [ ] `billing-checkout.tsx`('use client'): 월/연 플랜 선택(**월 디폴트 ◉ 14,900원/월** / 연 ○ 154,800원/년 + `13% 절약·월 12,900원꼴` 뱃지) → [14일 무료로 시작하기] 클릭 시:
  ```ts
  import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
  const { customerKey } = await prepareBilling()
  const tp = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
  const payment = tp.payment({ customerKey })
  await payment.requestBillingAuth({
    method: 'CARD',
    successUrl: `${location.origin}/billing/success?plan=${plan}`,
    failUrl: `${location.origin}/billing/fail`,
    customerEmail, customerName, // (선택) 세션/`/me`에서. 없으면 생략 가능
  })
  ```
  props로 페이월 카피(EXPIRED vs 미구독)와 customerEmail/Name을 주입받게.
- [ ] `(billing)/layout.tsx`: `requireAuth()`만(구독·페이월 게이트 없음 — 미구독자가 토스 복귀로 들어오는 통로). 최소 셸(브랜드마크) 정도.
- [ ] `success/page.tsx`(Server Component): `searchParams: Promise<{authKey?,customerKey?,plan?}>` → 셋 다 있으면 `subscribe(plan, authKey, customerKey)` 호출 → 성공 화면("14일 무료체험 시작! 다음 결제 {nextBillingAt}") + `/admin`로 이동(`<Link>`). 파라미터 누락/`subscribe` 실패 시 `/billing/fail`로 redirect.
- [ ] `fail/page.tsx`: 실패 사유(searchParams `code`,`message`) 안내 + [다시 시도] → `/admin`(게이트가 다시 페이월 노출).
- [ ] 수동 검증(토스 테스트키+테스트카드 BIN+본인인증 000000) — E2E는 토스창 외부라 부분 모킹.
- [ ] `npm run lint`+관련 `npm test`+`build` → 커밋 `feat(web): 구독 시작 플로우(BillingCheckout·(billing) success/fail)`.

> 주의: `requestBillingAuth`는 클라이언트에서만. `NEXT_PUBLIC_TOSS_CLIENT_KEY`는 클라 노출 OK. successUrl로 토스가 `authKey`,`customerKey`를 쿼리로 붙여 돌려줌. **success는 미구독 상태에서 렌더돼야 하므로 절대 `(admin)` 게이트 안에 두지 말 것.**

---

## Task 3: 설정 내 구독·결제 카드(최상단) + 페이월 게이트 + IN_GRACE 배너

> ⚠️ 시안 v2 반영: 구독 **관리 UI는 독립 페이지가 아니라 설정 페이지(`/admin/settings`) 최상단 카드**(푸시 알림 카드 **위**). `/admin/billing/page.tsx`는 만들지 않는다.

**Files:**
- Modify: `src/app/(admin)/admin/settings/page.tsx` — 제목 "설정" 아래·푸시 알림 카드 **위**에 구독·결제 카드 추가
- Create: `src/app/(admin)/admin/settings/components/billing-card.tsx`('use client') — 구독 상태 표시 + 관리 액션
- Create: `src/app/(admin)/admin/billing/components/subscription-gate.tsx`('use client') — 페이월(T2 `BillingCheckout` 임포트)
- Create: `src/app/(admin)/admin/components/subscription-grace-banner.tsx`(또는 layout 인라인) — IN_GRACE 상단 경고
- Modify: `src/app/(admin)/admin/layout.tsx` (게이트 + 배너 분기 추가)
- (의존) `getMyBilling()`·`cancelSubscription()`·`resumeSubscription()`·`changeCard()`·`redeemCoupon()`는 T1 `src/lib/actions/billing.ts`.

**Steps:**
- [ ] `billing-card.tsx`('use client'): 마운트 시 `getMyBilling()`(Server Action) 호출(로딩 스켈레톤 — 기존 푸시 카드의 async 패턴 참고). 표시: 상태 뱃지(**TRIALING=체험중/info · ACTIVE=이용중/success · IN_GRACE=결제유예/warning**)·플랜·다음 결제일·카드(`신한 ····1234`) + [카드 교체]/[해지|재개(cancelAtPeriodEnd면 재개)] + 쿠폰 입력([등록]→`redeemCoupon(code)`→결과 toast) + 최근 결제내역(접이식 `<details>` 또는 리스트). 해지예약·IN_GRACE 변형 카피 포함. 액션은 `useTransition`+sonner toast, 성공 시 재패칭. (설정 페이지는 기존대로 `'use client'` 유지 — billing-card가 스스로 패칭하므로 서버 리팩터 불필요)
- [ ] `settings/page.tsx`: `<BillingCard/>`를 제목 아래·푸시 알림 카드 위에 삽입.
- [ ] `subscription-gate.tsx`('use client'): 미구독(NONE)/EXPIRED 페이월 — `BillingCheckout`(T2) 임포트해 플랜 선택+토스 호출 노출. 카피 EXPIRED("무료체험이 끝났어요")/NONE 분기. `BusinessVerificationGate`의 `GateShell`(브랜드마크 상단 + 로그아웃 하단, AppLayout 없는 풀스크린) 패턴 참고.
- [ ] `layout.tsx`: `Promise.all`에 `getMyBilling()` 추가 → 사업자인증 게이트(APPROVED) 통과 **후** `subscription==null || status==='EXPIRED'`면 `<SubscriptionGate/>`만 렌더(AppLayout 없이). `IN_GRACE`면 AppLayout 진입 허용 + 상단 경고 배너(IN_GRACE banner: "결제에 실패했어요…" + [카드 교체]→`/admin/settings`). `TRIALING/ACTIVE`는 정상.
  - ⚠️ 출시 마이그레이션(설계 §8-4): 기존 활성 유저는 api에서 체험 부여 정책 적용 후 게이트 ON. 게이트로 전원 잠기지 않게 출시 전 확인.
- [ ] `npm run lint`+관련 `npm test`+`build` → 커밋 `feat(web): 설정 내 구독·결제 카드 + 페이월 게이트 + IN_GRACE 배너`.

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
