'use client';

import { useCallback, useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">저장 용량</span>
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)} ({usage.percent}%)
        </span>
      </div>
      <Progress
        value={Math.min(usage.percent, 100)}
        className={
          usage.status === 'FULL'
            ? '[&>div]:bg-danger'
            : warn
            ? '[&>div]:bg-warning'
            : ''
        }
      />
      {warn && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning-soft p-2">
          <p className="text-xs text-warning">
            {usage.status === 'FULL'
              ? '저장 용량이 가득 찼어요. 증설을 요청해 주세요.'
              : '저장 용량이 거의 찼어요(90%+).'}
          </p>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            증설 요청
          </Button>
        </div>
      )}
      <StorageIncreaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDone={refresh}
      />
    </div>
  );
}
