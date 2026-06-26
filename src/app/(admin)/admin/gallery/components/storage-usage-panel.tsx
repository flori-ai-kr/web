'use client';

import { useCallback, useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { getStorageUsage } from '@/lib/actions/storage';
import { formatBytes } from '@/lib/format-bytes';
import type { StorageUsage } from '@/types/storage';
import { StorageIncreaseDialog } from './storage-increase-dialog';

export function StorageUsagePanel() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(() => {
    getStorageUsage().then(setUsage).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!usage) return null;
  const warn = usage.status === 'WARN' || usage.status === 'FULL';

  return (
    <div className="space-y-1">
      {/* 슬림 인라인: 라벨·수치 한 줄 + 얇은 바. 평상시 눈에 안 띄게, 경고일 때만 강조. */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>저장 용량</span>
        <Progress
          value={Math.min(usage.percent, 100)}
          className={`h-1 flex-1 ${
            usage.status === 'FULL'
              ? '[&>div]:bg-danger'
              : warn
              ? '[&>div]:bg-warning'
              : ''
          }`}
        />
        <span className="tabular-nums shrink-0">
          {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)} · {usage.percent}%
        </span>
        {warn && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="shrink-0 font-medium text-warning underline-offset-2 hover:underline"
          >
            증설 요청
          </button>
        )}
      </div>
      <StorageIncreaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDone={refresh}
      />
    </div>
  );
}
