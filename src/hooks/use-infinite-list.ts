'use client';

import {useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction} from 'react';

interface PageResult<T> {
  items: T[];
  hasMore: boolean;
}

interface UseInfiniteListOptions<T> {
  /** 서버가 내려준 첫 페이지. 년/월/필터 변경으로 참조가 바뀌면 목록이 리셋된다. */
  initialItems: T[];
  initialHasMore: boolean;
  /**
   * offset 기반 페이지 로드. search는 디바운스된 검색어(빈 문자열 = 검색 없음).
   * 검색 시작(offset 0)과 추가 로드 모두 이 함수로 수행한다.
   */
  loadPage: (offset: number, search: string) => Promise<PageResult<T>>;
  /** 컨트롤드 검색 입력값. 디바운스 후 서버사이드 검색을 수행한다. */
  searchQuery?: string;
  searchDebounceMs?: number;
  /** 검색 실패 시 호출(토스트 등). */
  onSearchError?: () => void;
  /** 추가 로드 실패 시 호출. 미지정이면 콘솔 로그만 남긴다. */
  onLoadMoreError?: () => void;
}

/**
 * 서버 페이지네이션 목록의 공용 상태 머신.
 * sales/expenses 클라이언트에 복붙돼 있던 무한스크롤 + 디바운스 검색 + stale 응답 가드를 통합한다.
 *
 * 동작 규칙 (기존 클라이언트 동작과 동일):
 * - initialItems 참조가 바뀌면(네비게이션/필터 변경) 목록·hasMore 리셋
 * - 검색어가 비어지면 초기 데이터로 복원
 * - 로드/검색 중 데이터 버전이 바뀌면(리셋·새 검색) stale 응답은 무시
 */
export function useInfiniteList<T>({
  initialItems,
  initialHasMore,
  loadPage,
  searchQuery = '',
  searchDebounceMs = 300,
  onSearchError,
  onLoadMoreError,
}: UseInfiniteListOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const dataVersionRef = useRef(0);
  const searchVersionRef = useRef(0);

  // initialItems 변경(년/월/필터) 시 리셋
  useEffect(() => {
    dataVersionRef.current += 1;
    setItems(initialItems);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
  }, [initialItems, initialHasMore]);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), searchDebounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, searchDebounceMs]);

  // 디바운스된 검색어로 서버사이드 검색 (빈 검색어 = 초기 데이터 복원)
  useEffect(() => {
    if (debouncedSearch === '') {
      setIsSearching(false);
      dataVersionRef.current += 1;
      setItems(initialItems);
      setHasMore(initialHasMore);
      return;
    }
    const version = ++searchVersionRef.current;
    setIsSearching(true);
    loadPage(0, debouncedSearch)
      .then((result) => {
        if (version !== searchVersionRef.current) return;
        dataVersionRef.current += 1;
        setItems(result.items);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        onSearchError?.();
      })
      .finally(() => {
        if (version === searchVersionRef.current) setIsSearching(false);
      });
  // loadPage/onSearchError는 호출부 인라인 함수 — 검색어·초기 데이터 변경에만 반응한다(기존 동작 유지)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, initialItems, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const version = dataVersionRef.current;
    try {
      const result = await loadPage(items.length, debouncedSearch);
      // 로드 중 필터/네비게이션이 변경됐으면 stale 데이터 무시
      if (version !== dataVersionRef.current) return;
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more items:', error);
      onLoadMoreError?.();
    } finally {
      if (version === dataVersionRef.current) {
        setIsLoadingMore(false);
      }
    }
  // loadPage는 호출부 인라인 함수 — 의도적으로 deps 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, items.length, debouncedSearch]);

  return {
    items,
    /** 낙관적 삭제 확정 등 로컬 목록 직접 수정용 */
    setItems: setItems as Dispatch<SetStateAction<T[]>>,
    hasMore,
    isLoadingMore,
    isSearching,
    debouncedSearch,
    loadMore,
  };
}
