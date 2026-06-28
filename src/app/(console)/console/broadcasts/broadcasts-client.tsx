'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/console/status-badge';
import {
  listBroadcasts,
  sendBroadcast,
  deleteBroadcast,
} from '@/lib/actions/admin-broadcasts';
import type { Broadcast } from '@/types/admin';
import { ComposeDialog } from './compose-dialog';
import { SEGMENT_LABELS, STATUS_LABELS, STATUS_TONE } from './segment-labels';

export function BroadcastsClient({ initial }: { initial: Broadcast[] }) {
  const [rows, setRows] = useState<Broadcast[]>(initial);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<Broadcast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => startTransition(async () => setRows(await listBroadcasts()));

  const confirmSend = () => {
    if (!sendTarget) return;
    const row = sendTarget;
    startTransition(async () => {
      try {
        await sendBroadcast(row.id);
        toast.success('발송했습니다');
        setSendTarget(null);
        setRows(await listBroadcasts());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '발송 실패');
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const row = deleteTarget;
    startTransition(async () => {
      try {
        await deleteBroadcast(row.id);
        toast.success('삭제했습니다');
        setDeleteTarget(null);
        setRows(await listBroadcasts());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '삭제 실패');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">브로드캐스트</h1>
        <Button onClick={() => setComposeOpen(true)}>새 브로드캐스트</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>세그먼트</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">대상/성공/실패</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  브로드캐스트가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>
                    <StatusBadge tone="muted">{SEGMENT_LABELS[b.segment]}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONE[b.status]}>{STATUS_LABELS[b.status]}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b.targetCount} / {b.sentCount} / {b.failedCount}
                  </TableCell>
                  <TableCell className="tabular-nums">{b.createdAt?.slice(0, 10) ?? '-'}</TableCell>
                  <TableCell>
                    {b.status === 'draft' || b.status === 'scheduled' ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" disabled={pending} onClick={() => setSendTarget(b)}>
                          발송
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => setDeleteTarget(b)}
                        >
                          삭제
                        </Button>
                      </div>
                    ) : b.status === 'sent' ? (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {b.sentAt?.slice(0, 10) ?? '-'}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} onCreated={refresh} />

      <Dialog open={!!sendTarget} onOpenChange={(o) => { if (!o) setSendTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>브로드캐스트 발송</DialogTitle>
            <DialogDescription>
              {sendTarget && `${SEGMENT_LABELS[sendTarget.segment]} 세그먼트에 발송할까요?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendTarget(null)}>
              취소
            </Button>
            <Button disabled={pending} onClick={confirmSend}>
              발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>브로드캐스트 삭제</DialogTitle>
            <DialogDescription>
              {deleteTarget && `"${deleteTarget.title}" 을(를) 삭제할까요?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button disabled={pending} onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
