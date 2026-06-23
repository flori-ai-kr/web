import type { BroadcastSegment, BroadcastStatus } from '@/types/admin';

export const SEGMENT_LABELS: Record<BroadcastSegment, string> = {
  all: '전체',
  active_7d: '활성(7일↑)',
  verified: '인증완료',
  dormant_14d: '14일 무활동',
  ai_unused: 'AI 미사용자',
};

export const SEGMENT_OPTIONS = Object.entries(SEGMENT_LABELS) as [BroadcastSegment, string][];

export const STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: '초안',
  scheduled: '예약',
  sending: '발송중',
  sent: '발송완료',
  failed: '실패',
};

export const STATUS_TONE: Record<BroadcastStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  sent: 'success',
  scheduled: 'info',
  draft: 'muted',
  sending: 'warning',
  failed: 'danger',
};
