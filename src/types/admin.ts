// ─── 운영 콘솔(/console) 타입 — Kotlin admin DTO 미러 (camelCase) ───────────

export interface AdminOverview {
  users: { total: number; active: number; onboarded: number };
  sales: { entryCount: number; totalAmount: number; last30dCount: number };
  subscriptions: { active: number; inGrace: number; expired: number; none: number };
  verifications: { pending: number; approved: number; rejected: number };
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminVerification {
  id: number;
  userId: number;
  businessNumber: string;
  businessName: string;
  representativeName: string;
  businessLicenseUrl: string;
  status: VerificationStatus;
  rejectReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AdminUserRow {
  id: number;
  email: string | null;
  nickname: string | null;
  storeName: string | null;
  isActive: boolean;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  verificationStatus: string | null;
  createdAt: string | null;
}

export interface AdminUserPage {
  rows: AdminUserRow[];
  page: number;
  size: number;
  total: number;
}

export interface AdminSubscriptionRow {
  userId: number;
  status: string;
  store: string;
  productId: string;
  entitlement: string;
  currentPeriodEnd: string | null;
}

export interface AiHealthTarget {
  name: string;
  status: 'UP' | 'DOWN';
  latencyMs: number | null;
  detail: string | null;
}

export interface AiHealthResponse {
  targets: AiHealthTarget[];
}
