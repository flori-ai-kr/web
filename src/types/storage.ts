// ─── 스토리지 쿼터 — 점주용 타입 ─────────────────────────────────────────────

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percent: number;
  status: 'OK' | 'WARN' | 'FULL';
}

export interface StorageRequestSummary {
  id: number;
  status: 'PENDING' | 'RESOLVED';
  reason: string | null;
  resolvedBytes: number | null;
  createdAt: string;
}
