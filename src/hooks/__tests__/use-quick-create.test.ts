import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuickCreate } from '../use-quick-create';

const replace = vi.fn();
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}));

describe('useQuickCreate', () => {
  beforeEach(() => {
    replace.mockClear();
    window.history.replaceState(null, '', '/admin/sales');
  });

  it('?new=1이면 onOpen을 호출하고 파라미터를 제거한다', () => {
    params = new URLSearchParams('new=1');
    window.history.replaceState(null, '', '/admin/sales?new=1');
    const onOpen = vi.fn();

    renderHook(() => useQuickCreate(onOpen));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/admin/sales', { scroll: false });
  });

  it('파라미터가 없으면 아무것도 하지 않는다', () => {
    params = new URLSearchParams();
    const onOpen = vi.fn();

    renderHook(() => useQuickCreate(onOpen));

    expect(onOpen).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('리렌더돼도 1회만 처리한다', () => {
    params = new URLSearchParams('new=1');
    window.history.replaceState(null, '', '/admin/sales?new=1');
    const onOpen = vi.fn();

    const { rerender } = renderHook(() => useQuickCreate(onOpen));
    rerender();

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
