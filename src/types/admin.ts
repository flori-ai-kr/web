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
  // 구독: BFF AdminOverviewResponse 는 아직 subscriptions 를 반환하지 않는다(구독 백엔드 미구현).
  // 서버가 보강하기 전까지 항상 부재하므로 옵셔널 — 렌더 측에서 가드한다.
  subscriptions?: { active: number; inGrace: number; expired: number; none: number } | null;
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

// ─── 콘솔 v2: 대시보드 고도화 ────────────────────────────────────────────────

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

export interface ChurnReasonSlice {
  reason: string;
  count: number;
}

export interface RetentionCohortRow {
  cohortWeek: string;
  cohortSize: number;
  retention: (number | null)[];
}

// ─── 콘솔 v2: 커뮤니티 모더레이션 ────────────────────────────────────────────

export type ReportTargetType = 'post' | 'comment';
export type ReportReason = 'spam' | 'abuse' | 'privacy' | 'sexual' | 'etc';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportResolution = 'deleted' | 'hidden' | 'dismissed';

export interface ReportQueueItem {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  reporterUserId: number;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  resolution: string | null;
  reportCount: number;
  targetPreview: string | null;
  authorUserId: number | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CommunityBan {
  id: number;
  userId: number;
  reason: string | null;
  bannedBy: number;
  expiresAt: string | null;
  liftedAt: string | null;
  createdAt: string;
}

// ─── 콘솔 v2: 브로드캐스트 + 발송 로그 ───────────────────────────────────────

export type BroadcastSegment = 'all' | 'active_7d' | 'verified' | 'dormant_14d' | 'ai_unused';
export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface Broadcast {
  id: number;
  title: string;
  body: string;
  deepLink: string | null;
  segment: BroadcastSegment;
  status: BroadcastStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SegmentPreview {
  segment: string;
  targetCount: number;
}

export type NotificationSendStatus = 'sent' | 'failed' | 'partial';

export interface NotificationLog {
  id: number;
  source: string;
  type: string;
  segment: string | null;
  targetUserId: number | null;
  title: string | null;
  body: string | null;
  status: NotificationSendStatus;
  sentCount: number;
  failedCount: number;
  errorMessage: string | null;
  broadcastId: number | null;
  actorUserId: number | null;
  createdAt: string | null;
}

// ─── 콘솔 v2: 공지 배너 CMS ──────────────────────────────────────────────────

export type AnnouncementPlacement = 'modal' | 'bar';

export interface Announcement {
  id: number;
  placement: AnnouncementPlacement;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  clickCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ─── 콘솔 v2: 1:1 문의 인박스 ────────────────────────────────────────────────

export type InquiryCategory = 'bug' | 'feature' | 'account' | 'payment' | 'feedback' | 'etc';
export type InquiryStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportInquiry {
  id: number;
  userId: number;
  /** 작성자 닉네임(users.nickname). 콘솔 전용 */
  authorNickname: string | null;
  /** 작성자 가게명(user_profiles.store_name). 온보딩 전이면 null */
  authorStoreName: string | null;
  category: InquiryCategory;
  title: string;
  body: string;
  imageUrls: string[];
  status: InquiryStatus;
  answer: string | null;
  answeredBy: number | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── 콘솔 v2: 감사 로그 ──────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  actorUserId: number;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
}

// ─── 콘솔: 백그라운드 작업(cron) 실행 로그 ──────────────────────────────────

export type JobRunStatus = 'success' | 'failed' | 'skipped';
export type JobRunTrigger = 'schedule' | 'manual';

/** 작업별 최신 상태(콘솔 카드). 한번도 안 돈 작업은 last* 가 null. */
export interface JobRunSummary {
  jobName: string;
  lastStatus: JobRunStatus | null;
  lastRunAt: string | null;
  lastFinishedAt: string | null;
  lastDurationMs: number | null;
  lastProcessedCount: number;
  lastErrorMessage: string | null;
  lastSuccessAt: string | null;
}

/** 작업 실행 이력 1건(콘솔 테이블). */
export interface JobRunLog {
  id: number;
  jobName: string;
  status: JobRunStatus;
  trigger: JobRunTrigger;
  processedCount: number;
  durationMs: number | null;
  errorMessage: string | null;
  actorUserId: number | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}
