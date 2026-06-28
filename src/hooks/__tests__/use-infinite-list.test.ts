import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useInfiniteList } from '../use-infinite-list';

interface Item { id: string }

const page = (ids: string[], hasMore: boolean) => ({
  items: ids.map((id) => ({ id })),
  hasMore,
});

// 주의: initialItems는 호출부(서버 props)에서 참조가 안정적이라는 가정의 리셋 트리거다.
// 테스트에서 inline 리터럴을 쓰면 매 렌더 새 참조 → 리셋 effect 무한 루프가 되므로 상수로 둔다.
const ONE_ITEM: Item[] = [{ id: '1' }];
const NO_ITEMS: Item[] = [];

describe('useInfiniteList', () => {
  it('초기 데이터로 시작한다', () => {
    const { result } = renderHook(() =>
      useInfiniteList<Item>({
        initialItems: ONE_ITEM,
        initialHasMore: true,
        loadPage: vi.fn(),
      }),
    );
    expect(result.current.items).toEqual([{ id: '1' }]);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore가 현재 길이를 offset으로 다음 페이지를 이어붙인다', async () => {
    const loadPage = vi.fn().mockResolvedValue(page(['2'], false));
    const { result } = renderHook(() =>
      useInfiniteList<Item>({ initialItems: ONE_ITEM, initialHasMore: true, loadPage }),
    );

    await act(() => result.current.loadMore());

    expect(loadPage).toHaveBeenCalledWith(1, '');
    expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.current.hasMore).toBe(false);
  });

  it('hasMore=false면 loadMore가 호출되지 않는다', async () => {
    const loadPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteList<Item>({ initialItems: NO_ITEMS, initialHasMore: false, loadPage }),
    );
    await act(() => result.current.loadMore());
    expect(loadPage).not.toHaveBeenCalled();
  });

  it('initialItems 참조가 바뀌면(필터 변경) 목록을 리셋한다', () => {
    const loadPage = vi.fn();
    const first = [{ id: '1' }];
    const { result, rerender } = renderHook(
      ({ items }) => useInfiniteList<Item>({ initialItems: items, initialHasMore: false, loadPage }),
      { initialProps: { items: first } },
    );
    rerender({ items: [{ id: '9' }] });
    expect(result.current.items).toEqual([{ id: '9' }]);
  });

  it('검색어를 디바운스해 offset 0으로 검색하고, 비우면 초기 데이터로 복원한다', async () => {
    const loadPage = vi.fn().mockResolvedValue(page(['s1'], false));
    const initial = [{ id: '1' }];
    const { result, rerender } = renderHook(
      ({ q }) =>
        useInfiniteList<Item>({
          initialItems: initial,
          initialHasMore: true,
          loadPage,
          searchQuery: q,
          searchDebounceMs: 1,
        }),
      { initialProps: { q: '' } },
    );

    rerender({ q: '장미' });
    expect(loadPage).not.toHaveBeenCalled(); // 디바운스 전

    await waitFor(() => expect(result.current.items).toEqual([{ id: 's1' }]));
    expect(loadPage).toHaveBeenCalledWith(0, '장미');

    rerender({ q: '' });
    await waitFor(() => expect(result.current.items).toEqual(initial)); // 초기 데이터 복원
    expect(result.current.hasMore).toBe(true);
  });

  it('검색 실패 시 onSearchError를 호출한다', async () => {
    const onSearchError = vi.fn();
    const loadPage = vi.fn().mockRejectedValue(new Error('fail'));
    renderHook(() =>
      useInfiniteList<Item>({
        initialItems: [],
        initialHasMore: false,
        loadPage,
        searchQuery: '장미',
        searchDebounceMs: 1,
        onSearchError,
      }),
    );
    await waitFor(() => expect(onSearchError).toHaveBeenCalled());
  });
});
