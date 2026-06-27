# HANDOFF — 토스페이먼츠 빌링 (구독·결제·쿠폰) · session4-billing

작성: 2026-06-25 · 워크트리: `api-session4-billing` / `web-session4-billing` (둘 다 브랜치 `session4-billing`, origin/dev 분기 후 dev 머지됨)

---

## 0) 한 줄 요약
**api 백엔드는 Part1~5 전부 구현 완료(통합리뷰 Ready-to-merge, check 그린, 미머지).** **web은 구현 계획서까지만 작성**됨 — 다음 세션은 `web-session4-billing`에서 그 계획서(`docs/plans/26-06-25-billing-web-plan.md`)를 실행하면 됨.

---

## 1) 완료된 작업

### 설계 (양 레포 커밋됨)
- 설계 스펙: `docs/plans/26-06-25-tosspayments-billing-design.md` (api·web 동일 복제).
- 확정: 토스 **자동결제(빌링)**, 카드 결제창만. 14일 무료체험→자동 유료전환. 월 14,900 / 연 154,800(일시불). dunning=IN_GRACE 3일 매일 재시도→EXPIRED. 쿠폰=무료일수(`next_billing_at += days`). 재가입 어뷰징 방어(provider+providerId 해시 원장). billingKey AES 암호화. 모바일 제외.

### api 백엔드 — **전체 완료** (브랜치 f80d62d..27e8f1b, `./gradlew check` 그린, working tree clean)
서브에이전트 구동 TDD(태스크별 리뷰+픽스+게이트) + 파트별/통합 최종리뷰(opus).
- **Part 1 기반**: 6테이블 마이그레이션(billing_key·subscription·payment_history·coupon·coupon_redemption·subscription_eligibility), 엔티티/리포지토리, billingKey AES-256-GCM 컨버터, `TossPaymentsProperties`+`BillingErrorCode`, `BillingClient`(빌링키발급·승인), prod 약한 시크릿 부팅거부.
- **Part 2 구독**: `/billing/prepare`·`/subscribe`(체험·재가입 어뷰징방어)·`/me`·`/cancel`·`/resume`·`/card` + 구독시작 이벤트·디스코드·푸시.
- **Part 3 결제엔진**: RestClient 타임아웃, `PaymentService.chargeOnce`(멱등 단일결제), `RecurringBillingScheduler`+`BillingChargeProcessor`(매일 04:00 갱신·dunning), `BillingReminderScheduler`(D-3 04:30).
- **Part 4 쿠폰**: `/coupons/redeem`(검증4종·무료일수·레이트리밋), 콘솔 `/admin/coupons` 발행(자동코드 12자 Crockford Base32)·목록·상세(사용현황)·폐기 + 감사로그.
- **Part 5 웹훅·집계**: `/webhooks/toss`(환불 재조회 동기화·항상200), `AdminOverview.subscriptions` 집계, `GET /admin/subscriptions`.
- 🔧 **dev 머지**: base가 트렌드제거 이전이라 부팅에러(missing trend_articles) → `merge origin/dev`(api 45b1002 / web 33a3cc0, 충돌0)로 해결.
- 진행 상세 원장: `api-session4-billing/.superpowers/sdd/progress.md`.

### web — 계획서만
- `web-session4-billing/docs/plans/26-06-25-billing-web-plan.md` 작성·커밋(300b2f5). **코드 0줄.**

---

## 2) 진행 중인 작업
- 없음(api는 완결, web은 계획 단계). 다음 세션이 web 실행 시작점.

---

## 3) 다음에 해야 할 것 (우선순위)

### A. web 구현 (이 워크트리에서) — `docs/plans/26-06-25-billing-web-plan.md` 실행
subagent-driven-development로 T1~T5:
1. **T1 인프라**: `@tosspayments/tosspayments-sdk` 설치, `NEXT_PUBLIC_TOSS_CLIENT_KEY`(env.ts/zod), `src/types/billing.ts`, Server Actions(`src/lib/actions/billing.ts`·`admin-coupons.ts`).
2. **T2 구독 시작**: `/admin/billing/checkout`(loadTossPayments→requestBillingAuth)·`/success`·`/fail`.
3. **T3 구독 관리+게이트**: `/admin/billing`(me·해지/재개/카드교체/쿠폰등록) + admin layout에 `SubscriptionGate`(EXPIRED/NONE 페이월, IN_GRACE 배너).
4. **T4 콘솔 쿠폰**: `/console/coupons`(목록·발행 dialog·상세·폐기) — 기존 `/console/broadcasts` 패턴.
5. **T5 콘솔 구독현황 정합**: 기존 `/console/subscriptions`가 **구 RevenueCat 타입**(`store/productId/entitlement`·소문자상태)을 기대 → 새 api 계약(`plan`·대문자 상태·`nextBillingAt`·`cancelAtPeriodEnd`)으로 `AdminSubscriptionRow` 타입·`subscriptions-client.tsx`·`SubscriptionBadge` 수정.

### B. api PR/머지 — **`/feature-finalize`** 로 (CLAUDE.md 규칙, raw gh pr 금지). 미머지 상태.

### C. 비블로커 follow-up (선택, api)
WEBHOOK_SIGNATURE(E-BILLING-201) 데드코드 정리, `IdentityHasher` providerId null 방어, crypto 복호화 예외 래핑, `/webhooks` IP allowlist, CANCEL_STATUS_CHANGED 테스트케이스 등. (원장 참조)

### D. E2E 수동검증 (api)
토스 **테스트키**(개발자센터 체험상점)를 api env(`TOSS_SECRET_KEY` 등)에 주입 → 구독 시작~스케줄러 첫결제~상태전이 검증. 테스트카드 BIN6자리·본인인증 `000000`.

---

## 4) 중요한 결정사항 / 컨텍스트

### api 계약 (web이 호출, 확정)
- 점주(requireAuth): `GET /billing/prepare`→{customerKey}; `POST /billing/subscribe`{plan,authKey,customerKey}; `GET /billing/me`→{subscription,card,recentPayments}; `POST /billing/cancel`·`/resume`·`/card`{authKey,customerKey}; `POST /coupons/redeem`{code}→{grantedDays,nextBillingAt,pending}.
- 콘솔(requireAdmin): `POST /admin/coupons`{days,code?,validFrom?,validUntil?,maxRedemptions?,perUserLimit,source,memo?}; `GET /admin/coupons`; `GET /admin/coupons/{id}`→{coupon,redemptions}; `POST /admin/coupons/{id}/disable`; `GET /admin/subscriptions?status=`.
- 상태값 **대문자**: TRIALING/ACTIVE/IN_GRACE/EXPIRED. CouponResponse.effectiveStatus: ACTIVE/DISABLED/EXPIRED/EXHAUSTED.
- 정확한 응답 필드는 api `billing/dto/*.kt`·`admin/dto/AdminStatsDtos.kt` 대조.

### 설계 결정
- 쿠폰 사용 = **결제일 미루기**(날짜 가산), 금액 크레딧 아님. 구독 없으면 pending(subscribe 시 적용).
- 모든 과금은 **스케줄러로 단일화**(subscribe엔 동기 결제 없음). 재가입자는 ACTIVE+next=now로 스케줄러가 ≤1일내 첫 과금.
- 웹훅은 토스가 서명 미문서화 → **재조회(getPayment) 패턴**으로 검증(본문 비신뢰). 항상 200.
- 게이트 순서: 로그인 → 사업자인증(APPROVED) → 구독. web admin layout에 SubscriptionGate 추가.
- **출시 마이그레이션**(설계 §8-4): 기존 활성 유저 전원 14일 체험 자동부여 후 게이트 ON — 게이트로 전원 잠금 방지(api 정책과 함께).

### 작업 규율 (이 브랜치에서 학습됨)
- 태스크마다 커밋 전 **전체 게이트**(api `./gradlew check` / web `npm run lint`+`npm test`+`build`) **+ `git status` clean** 확인. (`test`만으론 ktlint/detekt 미검출 → Part2서 미커밋 포맷 잔재 사고. 계획 코드도 lint 준수로 작성.)
- `git add -A` 금지(변경 파일만). 커밋 트레일러 `Co-Authored-By: Claude <noreply@anthropic.com>`.
- @Transactional self-invocation 금지(별도 빈 분리). 멀티테넌시 TenantContext 격리 + 화이트리스트(배치/웹훅/어드민/전역코드/신원원장만 cross-tenant).

### 메모리
- `toss-billing-feature.md`(메모리)에 진행상태 보존. MEMORY.md 인덱스 갱신됨.
