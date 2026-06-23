'use client';

import {useEffect, useState} from 'react';
import {Clock, FileText, Loader2, Trash2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {toast} from 'sonner';
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

  useEffect(() => {
    let active = true;
    // setState를 effect 본문에서 동기 호출하지 않도록 비동기 함수로 감싼다(cascading render 방지).
    const load = async () => {
      setLoading(true);
      try {
        const page = await listBlogContents({offset: 0, limit: PAGE_SIZE});
        if (active) setItems(page.contents);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [refreshKey]);

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

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteBlogContent(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success('초안을 삭제했어요.');
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">아직 만든 초안이 없어요</p>
        <p className="mt-1 text-xs text-muted-foreground">키워드를 넣고 첫 블로그 초안을 만들어 보세요.</p>
      </div>
    );
  }

  return (
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
              onClick={(e) => remove(item.id, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  remove(item.id, e as unknown as React.MouseEvent);
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
  );
}
