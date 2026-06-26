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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approveRequest, rejectRequest } from '@/lib/actions/admin-storage';
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
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (request) {
      setGb(String(Math.max(Math.ceil(bytesToGb(request.quotaBytes)) + 1, 1)));
      setRejectReason('');
      setMode('view');
    }
  }, [request]);

  if (!request) return null;

  const approve = async () => {
    const n = Number(gb);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('새 한도(GB)를 입력하세요');
      return;
    }
    if (gbToBytes(n) < request.usedBytes) {
      toast.error('새 한도가 현재 사용량보다 작습니다');
      return;
    }
    setSubmitting(true);
    try {
      await approveRequest(request.id, gbToBytes(n));
      toast.success('승인 완료 — 점주에게 푸시를 발송했어요.');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '처리 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      toast.error('거절 사유를 입력해 주세요');
      return;
    }
    setSubmitting(true);
    try {
      await rejectRequest(request.id, rejectReason.trim());
      toast.success('거절 처리 완료 — 점주에게 푸시를 발송했어요.');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '처리 실패');
    } finally {
      setSubmitting(false);
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
          {request.status === 'APPROVED' && request.resolvedBytes && (
            <div>
              <dt className="text-xs text-muted-foreground">승인 한도</dt>
              <dd className="text-success font-medium">{formatBytes(request.resolvedBytes)}</dd>
            </div>
          )}
          {request.status === 'REJECTED' && request.rejectReason && (
            <div>
              <dt className="text-xs text-muted-foreground">거절 사유</dt>
              <dd className="text-danger">{request.rejectReason}</dd>
            </div>
          )}
        </dl>

        {request.status === 'PENDING' && mode === 'view' && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-2">
              <Label>새 한도 (GB)</Label>
              <Input
                type="number"
                min="1"
                value={gb}
                onChange={(e) => setGb(e.target.value)}
              />
            </div>
          </div>
        )}

        {request.status === 'PENDING' && mode === 'reject' && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-2">
              <Label>거절 사유 <span className="text-danger">*</span></Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="거절 사유를 입력해 주세요"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending || submitting}>
            닫기
          </Button>
          {request.status === 'PENDING' && mode === 'view' && (
            <>
              <Button
                variant="outline"
                className="text-danger border-danger hover:bg-danger/10"
                onClick={() => setMode('reject')}
                disabled={pending || submitting}
              >
                거절
              </Button>
              <Button onClick={approve} disabled={pending || submitting}>
                {submitting ? '처리 중...' : '승인'}
              </Button>
            </>
          )}
          {request.status === 'PENDING' && mode === 'reject' && (
            <>
              <Button variant="outline" onClick={() => setMode('view')} disabled={submitting}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={reject}
                disabled={submitting || !rejectReason.trim()}
              >
                {submitting ? '처리 중...' : '거절 확인'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
