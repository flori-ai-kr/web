'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, ExternalLink, Sparkles} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {cn} from '@/lib/utils';
import {TREND_CATEGORIES, type TrendArticle, type TrendCategory,} from '@/types/database';
import {CategoryBadge} from '@/components/insights/category-badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';

interface TrendsClientProps {
  initialArticles: TrendArticle[];
  initialCategory: TrendCategory | null;
  initialArticleId: string | null;
}

export function TrendsClient({
  initialArticles,
  initialCategory,
  initialArticleId,
}: TrendsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<TrendCategory | null>(initialCategory);

  const selectedArticle = useMemo(
    () => initialArticles.find((a) => a.id === initialArticleId) ?? null,
    [initialArticles, initialArticleId],
  );

  const filteredArticles = useMemo(() => {
    if (!selectedCategory) return initialArticles;
    return initialArticles.filter((a) => a.category === selectedCategory);
  }, [initialArticles, selectedCategory]);

  // 일자별 그룹핑
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TrendArticle[]>();
    for (const article of filteredArticles) {
      const date = article.collected_at;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(article);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredArticles]);

  const categoryCounts = useMemo(() => {
    const counts: Record<TrendCategory, number> = {
      flower: 0,
      inspiration: 0,
      business: 0,
      industry: 0,
    };
    for (const a of initialArticles) counts[a.category]++;
    return counts;
  }, [initialArticles]);

  const updateCategoryUrl = (cat: TrendCategory | null) => {
    setSelectedCategory(cat);
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set('category', cat);
    else params.delete('category');
    params.delete('articleId');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const openDetail = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('articleId', id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('articleId');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <header>
        <Link
          href="/insights"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          인사이트
        </Link>
        <h1 className="text-2xl font-bold text-foreground">트렌드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          주 2회 자동 수집 · 월·금 08:00 KST
        </p>
      </header>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <CategoryTab
          active={!selectedCategory}
          onClick={() => updateCategoryUrl(null)}
          label="전체"
          count={initialArticles.length}
        />
        {TREND_CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat.value}
            active={selectedCategory === cat.value}
            onClick={() => updateCategoryUrl(cat.value as TrendCategory)}
            label={cat.label}
            count={categoryCounts[cat.value]}
            color={cat.color}
          />
        ))}
      </div>

      {/* List */}
      {groupedByDate.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed border-border bg-card/50">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">수집된 트렌드가 없어요</h3>
          <p className="text-sm text-muted-foreground">다음 수집 시각에 자동으로 도착합니다</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(([date, items]) => (
            <section key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {format(new Date(date), 'yyyy년 M월 d일 EEEE', { locale: ko })}
              </h3>
              <div className="space-y-3">
                {items.map((article) => (
                  <TrendListItem
                    key={article.id}
                    article={article}
                    onClick={() => openDetail(article.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TrendDetailDialog article={selectedArticle} open={!!selectedArticle} onClose={closeDetail} />
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border',
        active
          ? 'bg-brand text-white border-brand'
          : 'bg-card border-border text-foreground hover:border-brand/50',
      )}
    >
      {color && !active && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      <span>{label}</span>
      <span className={cn('text-xs', active ? 'opacity-80' : 'text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}

function TrendListItem({
  article,
  onClick,
}: {
  article: TrendArticle;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={article.category} />
          {article.source_name && (
            <span className="text-xs text-muted-foreground">{article.source_name}</span>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2 group-hover:text-brand transition-colors">
        {article.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
    </button>
  );
}

function TrendDetailDialog({
  article,
  open,
  onClose,
}: {
  article: TrendArticle | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={article.category} />
            {article.source_name && (
              <span className="text-xs text-muted-foreground">{article.source_name}</span>
            )}
          </div>
          <DialogTitle className="text-xl leading-snug">{article.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-foreground">{article.summary}</p>

          {article.key_points.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
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

          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <span>
              {article.published_at
                ? format(new Date(article.published_at), 'yyyy년 M월 d일', { locale: ko })
                : format(new Date(article.collected_at), 'yyyy년 M월 d일 수집', { locale: ko })}
            </span>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand hover:underline font-medium"
            >
              원문 보기
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
