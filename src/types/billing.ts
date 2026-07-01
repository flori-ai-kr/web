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
  /** 활성 구독이 없고 무카드 1달 무료체험을 시작할 수 있을 때 true (체험 미소진). */
  trialEligible: boolean;
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
  validFrom: string | null;
  validUntil: string | null;
  source: string;
  memo: string | null;
  createdAt: string;
}

export interface RedemptionRow {
  userId: number;
  /** 사용자 닉네임(있으면 표시, 없으면 null). */
  nickname?: string | null;
  /** 가게명(있으면 표시, 없으면 null). */
  storeName?: string | null;
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
  source: string;
  memo?: string | null;
}

/** PATCH /admin/coupons/{id} 요청 바디. code·source는 수정 불가(요청에 포함하지 않음). */
export interface CouponUpdateInput {
  days: number;
  validFrom?: string | null;
  validUntil?: string | null;
  maxRedemptions?: number | null;
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
