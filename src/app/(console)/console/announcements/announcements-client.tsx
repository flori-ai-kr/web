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
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/console/status-badge';
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  setAnnouncementActive,
  deleteAnnouncement,
  type AnnouncementInput,
} from '@/lib/actions/admin-announcements';
import type { Announcement } from '@/types/admin';
import { AnnouncementFormDialog } from './announcement-form-dialog';

const PLACEMENT_LABEL: Record<Announcement['placement'], string> = {
  modal: '모달(전면)',
  bar: '상단바',
};

const period = (a: Announcement): string => {
  if (!a.startsAt && !a.endsAt) return '무기한';
  return `${a.startsAt?.slice(0, 10) ?? '∼'} ~ ${a.endsAt?.slice(0, 10) ?? '∼'}`;
};

export function AnnouncementsClient({ initial }: { initial: Announcement[] }) {
  const [rows, setRows] = useState<Announcement[]>(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => startTransition(async () => setRows(await listAnnouncements()));

  const onSubmit = (input: AnnouncementInput) =>
    startTransition(async () => {
      try {
        if (editTarget) {
          await updateAnnouncement(editTarget.id, input);
          toast.success('수정되었습니다');
        } else {
          await createAnnouncement(input);
          toast.success('등록되었습니다');
        }
        setFormOpen(false);
        setEditTarget(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });

  const onToggleActive = (a: Announcement, active: boolean) => {
    // 낙관적 업데이트
    setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, isActive: active } : r)));
    startTransition(async () => {
      try {
        await setAnnouncementActive(a.id, active);
        toast.success(active ? '활성화되었습니다' : '비활성화되었습니다');
      } catch (e) {
        // 롤백
        setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, isActive: !active } : r)));
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  const onDelete = (a: Announcement) =>
    startTransition(async () => {
      try {
        await deleteAnnouncement(a.id);
        toast.success('삭제되었습니다');
        setDeleteTarget(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">공지 배너</h1>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          새 공지
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>위치</TableHead>
              <TableHead>활성</TableHead>
              <TableHead>노출기간</TableHead>
              <TableHead className="text-right">클릭수</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  등록된 공지가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    <StatusBadge tone={a.placement === 'modal' ? 'info' : 'muted'}>
                      {PLACEMENT_LABEL[a.placement]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={a.isActive}
                        disabled={pending}
                        aria-label={a.isActive ? '비활성화' : '활성화'}
                        onCheckedChange={(c) => onToggleActive(a, c === true)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {a.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{period(a)}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.clickCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.createdAt?.slice(0, 10) ?? '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditTarget(a);
                          setFormOpen(true);
                        }}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditTarget(null);
        }}
        target={editTarget}
        pending={pending}
        onSubmit={onSubmit}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지를 삭제할까요?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.title} 공지를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => deleteTarget && onDelete(deleteTarget)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
