'use client';

import {useEffect} from 'react';

/**
 * 스크롤 중에만 스크롤바를 보이게 한다 (html.scrolling 토글).
 * 마지막 스크롤 후 IDLE_MS 지나면 클래스를 제거 → CSS 가 thumb 를 페이드아웃.
 * 캡처 단계 리스너라 중첩 스크롤 컨테이너(사이드바·드롭다운 등)도 함께 감지.
 */
const IDLE_MS = 1200;

export function ScrollbarAutohide() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      root.classList.add('scrolling');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => root.classList.remove('scrolling'), IDLE_MS);
    };

    document.addEventListener('scroll', onScroll, {capture: true, passive: true});
    return () => {
      document.removeEventListener('scroll', onScroll, {capture: true});
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
