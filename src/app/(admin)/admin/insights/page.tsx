import {requireAuth} from '@/lib/auth-guard';
import {getAuctionCategories, getAuctionDates, getAuctionItemScraps, getAuctionSummary} from '@/lib/actions/auction';
import {getGrants} from '@/lib/actions/grants';
import {getGrantScraps, getScrapMap} from '@/lib/actions/scraps';
import {GRANT_CATEGORIES, type GrantCategory, type GrantScrap} from '@/types/grants';
import {AUCTION_CATEGORIES, AUCTION_DEFAULT_GUBN, AUCTION_SOURCE} from '@/types/auction';
import type {AuctionCategory, AuctionSummary} from '@/types/auction';
import type {ScrapMap} from '@/types/insights';
import {InfoClient} from './info-client';
import type {InfoTab} from './hooks/use-info-tabs';
import {safe} from '@/lib/server-safe';

interface PageProps {
  searchParams: Promise<{tab?: string; category?: string; scraped?: string}>;
}

const VALID_TABS: InfoTab[] = ['price', 'grant'];

export default async function InsightsPage({searchParams}: PageProps) {
  await requireAuth();

  const params = await searchParams;
  const tab: InfoTab = VALID_TABS.includes(params.tab as InfoTab)
    ? (params.tab as InfoTab)
    : 'price';
  const rawCategory = params.category ?? null;
  const scrapedOnly = params.scraped === '1';

  // 탭별 카테고리 화이트리스트 검증
  const grantCategory = GRANT_CATEGORIES.some((c) => c.value === rawCategory)
    ? (rawCategory as GrantCategory)
    : null;
  const activeCategory = tab === 'grant' ? grantCategory : null;

  // 서로 독립적인 7개 조회를 병렬화(기존 7연속 await 워터폴 제거 — 본 페이지 최악의 워터폴).
  // safe()로 개별 폴백 유지 → 하나의 BFF 엔드포인트 실패가 페이지를 깨지 않는다.
  // 기본 화훼구분(전체 '')로 SSR — useAuction 의 초기 gubn 과 일치시킨다.
  const [
    auctionCategories,
    auctionSummary,
    auctionDates,
    auctionScraps,
    grants,
    grantScrapMap,
    grantScraps,
  ] = await Promise.all([
    safe<AuctionCategory[]>(() => getAuctionCategories(), [...AUCTION_CATEGORIES]),
    safe<AuctionSummary>(
      () => getAuctionSummary({gubn: AUCTION_DEFAULT_GUBN}),
      {date: null, source: AUCTION_SOURCE, items: []},
    ),
    safe<string[]>(() => getAuctionDates(AUCTION_DEFAULT_GUBN), []),
    safe<string[]>(() => getAuctionItemScraps(), []),
    safe(() => getGrants({category: grantCategory ?? undefined}), []),
    safe<ScrapMap>(() => getScrapMap('grant'), {}),
    safe<GrantScrap[]>(() => getGrantScraps(), []),
  ]);

  return (
    <InfoClient
      initialTab={tab}
      initialCategory={activeCategory}
      initialScrapedOnly={scrapedOnly}
      auctionCategories={auctionCategories}
      auctionSummary={auctionSummary}
      auctionDates={auctionDates}
      auctionScraps={auctionScraps}
      grants={grants}
      grantScrapMap={grantScrapMap}
      grantScraps={grantScraps}
    />
  );
}
