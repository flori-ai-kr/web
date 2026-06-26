'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserQuota } from '@/lib/actions/admin-storage';
import { formatBytes, gbToBytes, bytesToGb } from '@/lib/format-bytes';
import type { AdminStorageRequest } from '@/types/admin';
import { StorageStatusBadge } from './storage-meta';

export function StorageDetailDialog({
  request,
  pending,
  onClose,
  onDone,
}: {
  request: AdminStorageRequest | null;
  pending: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [gb, setGb] = useState('');

  useEffect(() => {
    if (request) {
      setGb(String(Math.max(Math.ceil(bytesToGb(request.quotaBytes)) + 1, 1)));
    }
  }, [request]);

  if (!request) return null;

  const apply = async () => {
    const n = Number(gb);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('새 한도(GB)를 입력하세요');
      return;
    }
    try {
      await updateUserQuota(request.userId, gbToBytes(n));
      toast.success('용량을 상향했어요. 대기 요청이 처리됨으로 바뀝니다.');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '처리 실패');
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StorageStatusBadge status={request.status} />
            증설요청 #{request.id}
          </DialogTitle>
          <DialogDescription>
            {request.storeName ?? '-'} · {request.nickname ?? `user_${request.userId}`} ·{' '}
            {request.createdAt.slice(0, 10)}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">가게 / 작성자</dt>
            <dd>
              {request.storeName ?? '-'} · {request.nickname ?? `user_${request.userId}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">현재 사용량</dt>
            <dd className="tabular-nums">
              {formatBytes(request.usedBytes)} / {formatBytes(request.quotaBytes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">사유</dt>
            <dd className="whitespace-pre-wrap rounded bg-muted/40 p-2">{request.reason ?? '(없음)'}</dd>
          </div>
        </dl>

        {request.status === 'PENDING' && (
          <div className="space-y-2 border-t pt-3">
            <Label>새 한도 (GB)</Label>
            <Input
              type="number"
              min="1"
              value={gb}
              onChange={(e) => setGb(e.target.value)}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            닫기
          </Button>
          {request.status === 'PENDING' && (
            <Button onClick={apply} disabled={pending}>
              용량 상향
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
