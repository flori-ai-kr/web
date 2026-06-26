import { StatusBadge } from '@/components/console/status-badge';
import type { StorageRequestStatus } from '@/types/admin';

const META: Record<StorageRequestStatus, { tone: 'warning' | 'success'; label: string }> = {
  PENDING: { tone: 'warning', label: '대기' },
  RESOLVED: { tone: 'success', label: '처리됨' },
};

export function StorageStatusBadge({ status }: { status: StorageRequestStatus }) {
  const m = META[status];
  return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
}
