'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, Bookmark, ExternalLink, Sparkles} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {cn} from '@/lib/utils';
import {type ScrapMap, TREND_CATEGORIES, type TrendArticle, type TrendCategory,} from '@/types/database';
import {CategoryBadge} from '@/components/insights/category-badge';
import {ScrapButton} from '@/components/insights/scrap-button';
import {ScrapMemoEditor} from '@/components/insights/scrap-memo-editor';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';

interface TrendsClientProps {
  initialArticles: TrendArticle[];
  initialCategory: TrendCategory | null;
  initialArticleId: string | null;
  initialScrapMap: ScrapMap;
  initialScrapedOnly: boolean;
}

export function TrendsClient({
  initialArticles,
  initialCategory,
  initialArticleId,
  initialScrapMap,
  initialScrapedOnly,
}: TrendsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<TrendCategory | null>(initialCategory);
  const [scrapedOnly, setScrapedOnly] = useState(initialScrapedOnly);

  const selectedArticle = useMemo(
    () => initialArticles.find((a) => a.id === initialArticleId) ?? null,
    [initialArticles, initialArticleId],
  );

  const filteredArticles = useMemo(() => {
    let list = initialArticles;
    if (selectedCategory) list = list.filter((a) => a.category === selectedCategory);
    if (scrapedOnly) list = list.filter((a) => initialScrapMap[a.id]);
    return list;
  }, [initialArticles, selectedCategory, scrapedOnly, initialScrapMap]);

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

  const scrappedCount = useMemo(
    () => initialArticles.filter((a) => initialScrapMap[a.id]).length,
    [initialArticles, initialScrapMap],
  );

  const updateCategoryUrl = (cat: TrendCategory | null) => {
    setSelectedCategory(cat);
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set('category', cat);
    else params.delete('category');
    params.delete('articleId');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const toggleScrapedOnly = () => {
    const next = !scrapedOnly;
    setScrapedOnly(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('scraped', '1');
    else params.delete('scraped');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Header */}
      <header>
        <Link
          href="/admin/insights"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          인사이트
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">트렌드</h1>
            <p className="text-sm text-muted-foreground mt-1">
              주 2회 자동 수집 · 월·금 08:00 KST
            </p>
          </div>
          <Link
            href="/admin/insights/scraps"
            className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <Bookmark className="w-4 h-4" />
            내 스크랩 보기
          </Link>
        </div>
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
        <button
          type="button"
          onClick={toggleScrapedOnly}
          aria-pressed={scrapedOnly}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border shrink-0',
            scrapedOnly
              ? 'bg-brand text-white border-brand'
              : 'bg-card border-border text-foreground hover:border-brand/50',
          )}
        >
          <Bookmark className={cn('w-3.5 h-3.5', scrapedOnly && 'fill-current')} />
          스크랩만
          <span className={cn('text-xs', scrapedOnly ? 'opacity-80' : 'text-muted-foreground')}>
            {scrappedCount}
          </span>
        </button>
      </div>

      {/* List */}
      {groupedByDate.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed border-border bg-card/50">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">
            {scrapedOnly ? '스크랩한 트렌드가 없어요' : '수집된 트렌드가 없어요'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {scrapedOnly ? '관심 있는 기사를 스크랩해보세요' : '다음 수집 시각에 자동으로 도착합니다'}
          </p>
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
                    scraped={!!initialScrapMap[article.id]}
                    onClick={() => openDetail(article.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TrendDetailDialog
        article={selectedArticle}
        open={!!selectedArticle}
        onClose={closeDetail}
        scrapMap={initialScrapMap}
      />
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
  scraped,
  onClick,
}: {
  article: TrendArticle;
  scraped: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full text-left rounded-xl border border-border bg-card p-5 pr-14 hover:shadow-sm transition-shadow"
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
      <div className="absolute top-3 right-3">
        <ScrapButton
          targetType="trend"
          targetId={article.id}
          scraped={scraped}
          size="sm"
        />
      </div>
    </div>
  );
}

function TrendDetailDialog({
  article,
  open,
  onClose,
  scrapMap,
}: {
  article: TrendArticle | null;
  open: boolean;
  onClose: () => void;
  scrapMap: ScrapMap;
}) {
  if (!article) return null;
  const scrap = scrapMap[article.id];

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
          <DialogTitle className="text-xl leading-snug pr-8">{article.title}</DialogTitle>
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

          <ScrapMemoEditor
            targetType="trend"
            targetId={article.id}
            initialScraped={!!scrap}
            initialMemo={scrap?.memo ?? null}
          />

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
