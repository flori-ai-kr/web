// ─── 운영 콘솔(/console) 타입 — Kotlin admin DTO 미러 (camelCase) ───────────

export type StatRange = '7d' | '30d' | '90d' | 'all';

/** 기간 대비 증감(%). 서버 보강 전이면 comparison 없음(undefined/null). */
export interface OverviewComparison {
  usersChangePct: number | null;
  salesCountChangePct: number | null;
}

export interface AdminOverview {
  users: { total: number; active: number; onboarded: number };
  sales: { entryCount: number; totalAmount: number; last30dCount: number };
  subscriptions: { active: number; inGrace: number; expired: number; none: number };
  verifications: { pending: number; approved: number; rejected: number };
  comparison?: OverviewComparison | null;
}

export interface TimeseriesPoint {
  date: string;
  count: number;
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminVerificationBrief {
  status: VerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
}

/** 유저 상세 드릴다운. 서버 미배포 시 일부 필드는 null(목록 데이터로 폴백). */
export interface AdminUserDetail {
  id: number;
  email: string | null;
  nickname: string | null;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string | null;
  storeName: string | null;
  regionSido: string | null;
  regionSigungu: string | null;
  subscriptionStatus: string | null;
  verifications: AdminVerificationBrief[];
  salesCount: number | null;
  salesTotal: number | null;
  lastSaleDate: string | null;
}

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
