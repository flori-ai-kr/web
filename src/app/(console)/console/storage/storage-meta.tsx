import { StatusBadge } from '@/components/console/status-badge';
import type { StorageRequestStatus } from '@/types/admin';

const META: Record<StorageRequestStatus, { tone: 'warning' | 'success' | 'danger'; label: string }> = {
  PENDING: { tone: 'warning', label: '대기' },
  APPROVED: { tone: 'success', label: '승인' },
  REJECTED: { tone: 'danger', label: '거절' },
};

export function StorageStatusBadge({ status }: { status: StorageRequestStatus }) {
  const m = META[status];
  return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
}
