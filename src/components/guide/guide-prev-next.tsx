import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GuideArticleMeta } from '@/lib/guide/types';

export function GuidePrevNext({
  prev,
  next,
}: {
  prev: GuideArticleMeta | null;
  next: GuideArticleMeta | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="mt-12 flex items-stretch gap-3 border-t border-border pt-6">
      {prev ? (
        <Link
          href={`/admin/guide/${prev.slug}`}
          className="flex flex-1 flex-col gap-1 rounded-xl border border-border px-4 py-3 hover:bg-muted transition-colors group"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="size-3.5" />
            이전
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors line-clamp-1">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={`/admin/guide/${next.slug}`}
          className="flex flex-1 flex-col items-end gap-1 rounded-xl border border-border px-4 py-3 hover:bg-muted transition-colors group"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            다음
            <ChevronRight className="size-3.5" />
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors line-clamp-1">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
