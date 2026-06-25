// ─── 토스 빌링 도메인 타입 ─────────────────────────────────────────
// api DTO(Kotlin) → TS 타입 매핑. Instant→string(ISO-8601), Int/Long→number.

export type BillingPlan = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'IN_GRACE' | 'EXPIRED';
export type CouponEffectiveStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'EXHAUSTED';

// ─── 구독 & 결제 ────────────────────────────────────────────────────

export interface CardSummary {
  company: string | null;
  numberMasked: string | null;
  cardType: string | null;
}

export interface SubscriptionResponse {
  plan: BillingPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  nextBillingAt: string;
  cancelAtPeriodEnd: boolean;
  card: CardSummary | null;
}

export interface PaymentSummary {
  amount: number;
  status: string;
  approvedAt: string | null;
  createdAt: string;
}

/** GET /billing/me 응답. card는 subscription 안에 있음(top-level 없음). */
export interface MeResponse {
  subscription: SubscriptionResponse | null;
  recentPayments: PaymentSummary[];
}

/** GET /billing/prepare 응답 */
export interface PrepareResponse {
  customerKey: string;
}

/** POST /coupons/redeem 응답 */
export interface RedeemResponse {
  grantedDays: number;
  nextBillingAt: string | null;
  pending: boolean;
}

// ─── 쿠폰 ───────────────────────────────────────────────────────────

export interface CouponResponse {
  id: number;
  code: string;
  days: number;
  status: string;
  effectiveStatus: CouponEffectiveStatus;
  redeemedCount: number;
  maxRedemptions: number | null;
  perUserLimit: number;
  validFrom: string | null;
  validUntil: string | null;
  source: string;
  memo: string | null;
  createdAt: string;
}

export interface RedemptionRow {
  userId: number;
  grantedDays: number;
  redeemedAt: string;
}

export interface CouponDetailResponse {
  coupon: CouponResponse;
  redemptions: RedemptionRow[];
}

/** POST /admin/coupons 요청 바디 */
export interface CouponIssueInput {
  code?: string | null;
  days: number;
  validFrom?: string | null;
  validUntil?: string | null;
  maxRedemptions?: number | null;
  perUserLimit: number;
  source: string;
  memo?: string | null;
}

// ─── 콘솔 ───────────────────────────────────────────────────────────

export interface AdminSubscriptionRow {
  userId: number;
  plan: BillingPlan;
  status: SubscriptionStatus;
  nextBillingAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}
