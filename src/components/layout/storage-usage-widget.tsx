'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getStorageUsage, requestStorageIncrease } from '@/lib/actions/storage';
import { formatBytes } from '@/lib/format-bytes';
import type { StorageUsage } from '@/types/storage';
import { cn } from '@/lib/utils';

/**
 * 점주 저장 용량 상시 표시 위젯(사이드바 푸터 / 모바일 헤더 칩 공용) + 클릭 시 증설요청 모달.
 * 평상시 muted, 90%+면 amber, 100%면 red 강조. 사용량 못 불러오면 렌더 안 함(레이아웃 영향 0).
 */
export function StorageUsageWidget({
  variant,
  isCollapsed = false,
}: {
  variant: 'sidebar' | 'chip';
  isCollapsed?: boolean;
}) {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    getStorageUsage().then(setUsage).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!usage) return null;

  const warn = usage.status === 'WARN' || usage.status === 'FULL';
  const barTone =
    usage.status === 'FULL' ? '[&>div]:bg-danger' : usage.status === 'WARN' ? '[&>div]:bg-warning' : '';
  const accentText =
    usage.status === 'FULL' ? 'text-danger' : usage.status === 'WARN' ? 'text-warning' : 'text-muted-foreground';
  const fillColor =
    usage.status === 'FULL' ? 'bg-danger' : usage.status === 'WARN' ? 'bg-warning' : 'bg-brand';

  const submit = async () => {
    setSubmitting(true);
    try {
      await requestStorageIncrease(reason.trim() || undefined);
      toast.success('증설 요청을 접수했어요. 운영팀이 확인 후 처리합니다.');
      setReason('');
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '요청에 실패했어요');
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    setOpen(false);
    setReason('');
  };

  let trigger: React.ReactNode;
  if (variant === 'chip') {
    // 모바일 헤더 칩: 미니바 + %
    trigger = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`저장 용량 ${usage.percent}% 사용, 탭하면 상세`}
        className={cn('flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium hover:bg-accent', accentText)}
      >
        <span className="relative inline-block h-1 w-7 overflow-hidden rounded-full bg-muted">
          <span
            className={cn('absolute inset-y-0 left-0 rounded-full', fillColor)}
            style={{ width: `${Math.min(usage.percent, 100)}%` }}
          />
        </span>
        {usage.percent}%
      </button>
    );
  } else if (isCollapsed) {
    // 접힌 사이드바: 아이콘 + 툴팁
    trigger = (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`저장 용량 ${usage.percent}%`}
            className="flex w-full items-center justify-center py-1.5 text-muted-foreground hover:text-foreground"
          >
            <HardDrive className={cn('h-4 w-4', warn && accentText)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          저장 용량 {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)} ({usage.percent}%)
        </TooltipContent>
      </Tooltip>
    );
  } else {
    // 펼친 사이드바: 풀 위젯
    trigger = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
      >
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>저장 용량</span>
          <span className="tabular-nums">
            {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)}
          </span>
        </div>
        <Progress value={Math.min(usage.percent, 100)} className={cn('h-1', barTone)} />
        {warn && (
          <p className={cn('mt-1 text-[10px]', accentText)}>
            {usage.status === 'FULL' ? '가득 참 · 증설 요청' : '거의 참(90%+)'}
          </p>
        )}
      </button>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>저장 용량</DialogTitle>
            <DialogDescription>사진첩에 저장된 이미지 용량입니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Progress value={Math.min(usage.percent, 100)} className={cn('h-2', barTone)} />
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums">
                {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)}
              </span>
              <span className={cn('font-medium', accentText)}>{usage.percent}%</span>
            </div>
          </div>
          {warn && (
            <div
              className={cn(
                'rounded-md p-2.5 text-xs',
                usage.status === 'FULL' ? 'bg-danger/10 text-danger' : 'bg-warning-soft text-warning',
              )}
            >
              {usage.status === 'FULL'
                ? '저장 용량이 가득 찼어요. 더 올리려면 증설이 필요해요.'
                : '저장 용량이 거의 찼어요(90%+). 필요하면 증설을 요청해 주세요.'}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="storage-reason" className="text-xs text-muted-foreground">
              증설 요청 사유 (선택)
            </Label>
            <Textarea
              id="storage-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="예: 사진이 많아 용량이 부족합니다"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              닫기
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? '요청 중...' : '증설 요청'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
