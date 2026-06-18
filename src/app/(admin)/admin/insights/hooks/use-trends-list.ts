'use client';

import {useCallback, useMemo} from 'react';
import {toast} from 'sonner';
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {loadMoreTrendArticles} from '@/lib/actions/insights';
import type {ScrapMap, TrendArticle, TrendCategory} from '@/types/insights';

const PAGE_SIZE = 50;

interface Options {
  initialArticles: TrendArticle[];
  category: TrendCategory | null;
  scrapMap: ScrapMap;
  scrapedOnly: boolean;
}

/**
 * 트렌드·뉴스 목록 상태: 무한스크롤 + 카테고리/스크랩 필터 + 일자별 그룹핑.
 */
export function useTrendsList({initialArticles, category, scrapMap, scrapedOnly}: Options) {
  const loadPage = useCallback(
    async (offset: number) => {
      const items = await loadMoreTrendArticles(offset, {
        category: category ?? undefined,
        limit: PAGE_SIZE,
      });
      return {items, hasMore: items.length === PAGE_SIZE};
    },
    [category],
  );

  const {items, hasMore, isLoadingMore, loadMore} = useInfiniteList<TrendArticle>({
    initialItems: initialArticles,
    initialHasMore: initialArticles.length === PAGE_SIZE,
    loadPage,
    onLoadMoreError: () => toast.error('트렌드를 더 불러오지 못했어요'),
  });

  const filtered = useMemo(
    () => (scrapedOnly ? items.filter((a) => scrapMap[a.id]) : items),
    [items, scrapedOnly, scrapMap],
  );

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TrendArticle[]>();
    for (const article of filtered) {
      const date = article.collected_at;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(article);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return {items, filtered, groupedByDate, hasMore, isLoadingMore, loadMore};
}
