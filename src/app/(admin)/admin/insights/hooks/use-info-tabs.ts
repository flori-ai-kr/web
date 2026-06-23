'use client';

import {useCallback, useState, useTransition} from 'react';
import {usePathname, useRouter} from 'next/navigation';

export type InfoTab = 'price' | 'grant' | 'trend';

export const INFO_TABS: {value: InfoTab; label: string}[] = [
  {value: 'price', label: '경매 시세'},
  {value: 'grant', label: '지원사업'},
  {value: 'trend', label: '트렌드 · 뉴스'},
];

interface State {
  initialTab: InfoTab;
  initialCategory: string | null;
  initialScrapedOnly: boolean;
}

/**
 * 정보 페이지의 탭/카테고리/스크랩 필터 URL 상태(?tab=&category=&scraped=).
 * statistics/trends 와 동일하게 router.replace 로 동기화한다.
 */
export function useInfoTabs({initialTab, initialCategory, initialScrapedOnly}: State) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<InfoTab>(initialTab);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [scrapedOnly, setScrapedOnly] = useState(initialScrapedOnly);

  const pushUrl = useCallback(
    (nextTab: InfoTab, nextCategory: string | null, nextScraped: boolean) => {
      const params = new URLSearchParams();
      params.set('tab', nextTab);
      if (nextCategory) params.set('category', nextCategory);
      if (nextScraped) params.set('scraped', '1');
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname],
  );

  const changeTab = useCallback(
    (next: InfoTab) => {
      setTab(next);
      // 탭 전환 시 필터는 초기화(탭마다 카테고리 의미가 다름)
      setCategory(null);
      setScrapedOnly(false);
      pushUrl(next, null, false);
    },
    [pushUrl],
  );

  const changeFilter = useCallback(
    (nextCategory: string | null, nextScraped: boolean) => {
      setCategory(nextCategory);
      setScrapedOnly(nextScraped);
      pushUrl(tab, nextCategory, nextScraped);
    },
    [pushUrl, tab],
  );

  return {tab, category, scrapedOnly, changeTab, changeFilter};
}
