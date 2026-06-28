'use client';

import {useCallback, useMemo, useState} from 'react';
import {toast} from 'sonner';
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {loadMoreGrants} from '@/lib/actions/grants';
import type {GrantCategory, GrantProgram} from '@/types/grants';
import type {ScrapMap} from '@/types/insights';

const PAGE_SIZE = 50;

interface Options {
  initialPrograms: GrantProgram[];
  category: GrantCategory | null;
  scrapMap: ScrapMap;
  scrapedOnly: boolean;
}

/**
 * 지원사업 목록 상태: 무한스크롤(apply_end asc) + 카테고리/스크랩 필터 + 디바운스 서버 검색(제목·요약·기관).
 */
export function useGrantsList({initialPrograms, category, scrapMap, scrapedOnly}: Options) {
  const [searchQuery, setSearchQuery] = useState('');

  const loadPage = useCallback(
    async (offset: number, search: string) => {
      const items = await loadMoreGrants(offset, {
        category: category ?? undefined,
        keyword: search || undefined,
        limit: PAGE_SIZE,
      });
      return {items, hasMore: items.length === PAGE_SIZE};
    },
    [category],
  );

  const {items, hasMore, isLoadingMore, isSearching, loadMore} = useInfiniteList<GrantProgram>({
    initialItems: initialPrograms,
    initialHasMore: initialPrograms.length === PAGE_SIZE,
    loadPage,
    searchQuery,
    onSearchError: () => toast.error('지원사업 검색에 실패했어요'),
    onLoadMoreError: () => toast.error('지원사업을 더 불러오지 못했어요'),
  });

  const filtered = useMemo(
    () => (scrapedOnly ? items.filter((p) => scrapMap[p.id]) : items),
    [items, scrapedOnly, scrapMap],
  );

  return {items, filtered, hasMore, isLoadingMore, isSearching, loadMore, searchQuery, setSearchQuery};
}
