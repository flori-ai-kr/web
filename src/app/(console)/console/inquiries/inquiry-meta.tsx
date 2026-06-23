import { StatusBadge } from '@/components/console/status-badge';
import type { InquiryCategory, InquiryStatus } from '@/types/admin';

export const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  bug: '버그',
  feature: '기능요청',
  account: '계정',
  payment: '결제',
  feedback: '피드백',
  etc: '기타',
};

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const STATUS_META: Record<InquiryStatus, { tone: Tone; label: string }> = {
  open: { tone: 'warning', label: '접수' },
  in_progress: { tone: 'info', label: '처리중' },
  resolved: { tone: 'success', label: '완료' },
  closed: { tone: 'muted', label: '종료' },
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const meta = STATUS_META[status];
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function InquiryCategoryBadge({ category }: { category: InquiryCategory }) {
  return <StatusBadge tone="muted">{CATEGORY_LABELS[category]}</StatusBadge>;
}
