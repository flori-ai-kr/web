'use client';

import Link from 'next/link';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/console/status-badge';
import { activatePrompt, deletePrompt, listPrompts } from '@/lib/actions/admin-prompts';
import type { PromptSummary } from '@/types/admin-prompt';

const modelLabel = (m: string | null): string => m ?? '기본(ai-server)';
const tempLabel = (t: number | null): string => (t == null ? '–' : t.toFixed(2));

export function PromptsClient({ initial }: { initial: PromptSummary[] }) {
  const [rows, setRows] = useState<PromptSummary[]>(initial);
  const [deleteTarget, setDeleteTarget] = useState<PromptSummary | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => startTransition(async () => setRows(await listPrompts('blog')));

  const onActivate = (p: PromptSummary) =>
    startTransition(async () => {
      try {
        await activatePrompt(p.id);
        toast.success(`${p.version} 활성화되었습니다`);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });

  const onDelete = (p: PromptSummary) =>
    startTransition(async () => {
      try {
        await deletePrompt(p.id);
        toast.success('삭제되었습니다');
        setDeleteTarget(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">AI 프롬프트</h1>
          <p className="text-sm text-muted-foreground">
            마케팅 블로그 생성 프롬프트. 채널당 활성 1개 · DB가 비어도 코드 기본값으로 동작합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/console/prompts/new">새 버전</Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>버전</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>모델</TableHead>
              <TableHead className="text-right">temp</TableHead>
              <TableHead className="hidden lg:table-cell">메모</TableHead>
              <TableHead className="hidden md:table-cell">수정일</TableHead>
              <TableHead className="sticky right-0 bg-card text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  등록된 프롬프트가 없습니다. 비어 있어도 코드 기본값으로 블로그 생성은 동작합니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-medium">
                    <Link href={`/console/prompts/${p.id}`} className="hover:underline">
                      {p.version}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={p.isActive ? 'success' : 'muted'}>
                      {p.isActive ? '활성' : '비활성'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{modelLabel(p.model)}</TableCell>
                  <TableCell className="text-right tabular-nums">{tempLabel(p.temperature)}</TableCell>
                  <TableCell className="hidden max-w-[16rem] truncate text-sm text-muted-foreground lg:table-cell">
                    {p.notes ?? '-'}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {p.updatedAt?.slice(0, 10) ?? '-'}
                  </TableCell>
                  <TableCell className="sticky right-0 border-l border-border bg-card group-hover:bg-muted/50">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/console/prompts/${p.id}`}>편집</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending || p.isActive}
                        onClick={() => onActivate(p)}
                      >
                        활성화
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        disabled={pending || p.isActive}
                        title={p.isActive ? '활성 버전은 삭제할 수 없습니다' : undefined}
                        onClick={() => setDeleteTarget(p)}
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

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프롬프트를 삭제할까요?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.version} 버전을 삭제합니다(soft delete). 이 작업은 목록에서 숨겨집니다.
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
