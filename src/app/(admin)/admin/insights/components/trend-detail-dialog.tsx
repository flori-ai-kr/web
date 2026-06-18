'use client';

import {ExternalLink} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {CategoryBadge} from '@/components/insights/category-badge';
import {ScrapMemoEditor} from './scrap-memo-editor';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import type {ScrapMap, TrendArticle} from '@/types/insights';

interface TrendDetailDialogProps {
  article: TrendArticle | null;
  open: boolean;
  onClose: () => void;
  scrapMap: ScrapMap;
}

export function TrendDetailDialog({article, open, onClose, scrapMap}: TrendDetailDialogProps) {
  if (!article) return null;
  const scrap = scrapMap[article.id];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-left">
          <div className="mb-2 flex items-center gap-2">
            <CategoryBadge category={article.category} />
            {article.source_name && (
              <span className="text-xs text-muted-foreground">{article.source_name}</span>
            )}
          </div>
          <DialogTitle className="pr-8 text-xl leading-snug">{article.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-foreground">{article.summary}</p>

          {article.key_points.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                핵심 포인트
              </h4>
              <ul className="space-y-1.5">
                {article.key_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-brand">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ScrapMemoEditor
            targetType="trend"
            targetId={article.id}
            initialScraped={!!scrap}
            initialMemo={scrap?.memo ?? null}
          />

          <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
            <span>
              {article.published_at
                ? format(new Date(article.published_at), 'yyyy년 M월 d일', {locale: ko})
                : format(new Date(article.collected_at), 'yyyy년 M월 d일 수집', {locale: ko})}
            </span>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
            >
              원문 보기
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
