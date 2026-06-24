'use client';

import {useEffect, useState} from 'react';
import {Clock, FileText, Loader2, Trash2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {ko} from '@/lib/date-locale';
import {deleteBlogContent, getBlogContent, listBlogContents} from '@/lib/actions/marketing';
import {AppError} from '@/lib/errors';
import type {BlogContentDetail, BlogContentSummary} from '@/types/marketing';

interface BlogHistoryProps {
  /** 생성/삭제 이벤트 후 목록 리프레시 트리거(부모 카운터). */
  refreshKey: number;
  onOpen: (detail: BlogContentDetail) => void;
}

const PAGE_SIZE = 10;

/** 과거 생성한 초안 목록. 클릭 시 상세 로드 → 부모가 미리보기에 표시. 삭제는 소프트삭제. */
export function BlogHistory({refreshKey, onOpen}: BlogHistoryProps) {
  const [items, setItems] = useState<BlogContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogContentSummary | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 새 초안 생성/삭제로 refreshKey가 바뀌면 1페이지로 리셋(렌더 중 state 비교 — React 권장 패턴).
  const [syncedRefresh, setSyncedRefresh] = useState(refreshKey);
  if (syncedRefresh !== refreshKey) {
    setSyncedRefresh(refreshKey);
    setPage(0);
  }

  useEffect(() => {
    let active = true;
    // setState를 effect 본문에서 동기 호출하지 않도록 비동기 함수로 감싼다(cascading render 방지).
    const load = async () => {
      setLoading(true);
      try {
        const result = await listBlogContents({offset: page * PAGE_SIZE, limit: PAGE_SIZE});
        if (active) {
          setItems(result.contents);
          setHasMore(result.hasMore);
        }
      } catch {
        if (active) {
          setItems([]);
          setHasMore(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [refreshKey, page]);

  async function open(id: string) {
    setOpeningId(id);
    try {
      const detail = await getBlogContent(id);
      onOpen(detail);
    } catch (err) {
      toast.error(err instanceof AppError ? err.message : '초안을 불러오지 못했어요.');
    } finally {
      setOpeningId(null);
    }
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeletingId(target.id);
    try {
      await deleteBlogContent(target.id);
      toast.success('초안을 삭제했어요.');
      setDeleteTarget(null);
      if (items.length <= 1 && page > 0) {
        // 현재 페이지의 마지막 항목 삭제 → 이전 페이지로(빈 페이지 방지, 재조회)
        setPage((p) => Math.max(0, p - 1));
      } else {
        setItems((prev) => prev.filter((c) => c.id !== target.id));
      }
    } catch (err) {
      toast.error(err instanceof AppError ? err.message : '삭제에 실패했어요.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0 && page === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">아직 생성된 초안이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">키워드를 넣고 첫 블로그 초안을 만들어 보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => open(item.id)}
            disabled={openingId === item.id}
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-brand/50 disabled:opacity-70"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
              {openingId === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="truncate">{item.keyword}</span>
                <span aria-hidden>·</span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(item.createdAt), {addSuffix: true, locale: ko})}
                </span>
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(item);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget(item);
                }
              }}
              aria-label="초안 삭제"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
            >
              {deletingId === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </span>
          </button>
        </li>
        ))}
      </ul>

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            이전
          </Button>
          <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
            {page + 1} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>초안을 삭제할까요?</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.title}&quot; 초안을 삭제합니다. 이 작업은 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={!!deletingId} onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" disabled={!!deletingId} onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
