'use client';

import {ExternalLink} from 'lucide-react';
import {CategoryBadge} from '@/components/insights/category-badge';
import {ScrapButton} from './scrap-button';
import type {TrendArticle} from '@/types/insights';

interface TrendListItemProps {
  article: TrendArticle;
  scraped: boolean;
  onClick: () => void;
}

export function TrendListItem({article, scraped, onClick}: TrendListItemProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${article.title} 상세 보기`}
        className="w-full rounded-xl border border-border bg-card p-5 pr-14 text-left shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <CategoryBadge category={article.category} />
          {article.source_name && (
            <span className="text-[12px] text-muted-foreground">{article.source_name}</span>
          )}
        </div>
        <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
          {article.title}
        </h4>
        <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{article.summary}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand">
          원문 보기
          <ExternalLink className="h-3 w-3" aria-hidden />
        </span>
      </button>
      <div className="absolute right-3 top-3">
        <ScrapButton targetType="trend" targetId={article.id} scraped={scraped} size="sm" />
      </div>
    </div>
  );
}
