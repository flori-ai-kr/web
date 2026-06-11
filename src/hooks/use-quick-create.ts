'use client';

import {useEffect, useRef} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

/**
 * 대시보드 빠른 등록(`?new=1`) 진입 처리.
 * 마운트 시 1회만: 파라미터가 있으면 onOpen()을 호출하고 URL에서 제거한다.
 * sales/expenses/calendar 클라이언트가 공유한다.
 */
export function useQuickCreate(onOpen: () => void) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    if (searchParams.get('new') === '1') {
      onOpen();
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      router.replace(url.pathname + (url.search || ''), { scroll: false });
    }
  // 마운트 시 1회만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
