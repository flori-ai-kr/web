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
import {GuideButton} from '@/components/guide/guide-button';

interface PageProps {
  searchParams: Promise<{tab?: string; category?: string; scraped?: string}>;
}

const VALID_TABS: InfoTab[] = ['price', 'grant'];

/** Next 내부 제어 에러(redirect/notFound)는 전파하고, BFF 미구현/오류만 흡수한다. */
function isNextControlError(e: unknown): boolean {
  return (
    !!e &&
    typeof e === 'object' &&
    'digest' in e &&
    typeof (e as {digest: unknown}).digest === 'string' &&
    (e as {digest: string}).digest.startsWith('NEXT_')
  );
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isNextControlError(e)) throw e;
    return fallback;
  }
}

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

  // 각 탭 데이터를 개별 try/catch 로 적재 — 하나의 BFF 엔드포인트 실패가 페이지를 깨지 않게 한다.
  const auctionCategories = await safe<AuctionCategory[]>(
    () => getAuctionCategories(),
    [...AUCTION_CATEGORIES],
  );
  // 기본 화훼구분(전체 '')로 SSR — useAuction 의 초기 gubn 과 일치시킨다.
  const auctionSummary = await safe<AuctionSummary>(
    () => getAuctionSummary({gubn: AUCTION_DEFAULT_GUBN}),
    {date: null, source: AUCTION_SOURCE, items: []},
  );
  const auctionDates = await safe<string[]>(() => getAuctionDates(AUCTION_DEFAULT_GUBN), []);
  const auctionScraps = await safe<string[]>(() => getAuctionItemScraps(), []);

  const grants = await safe(() => getGrants({category: grantCategory ?? undefined}), []);
  const grantScrapMap = await safe<ScrapMap>(() => getScrapMap('grant'), {});
  const grantScraps = await safe<GrantScrap[]>(() => getGrantScraps(), []);

  return (
    <div className="relative">
      <div className="absolute right-4 top-0 sm:right-6 z-10"><GuideButton slug="insights" /></div>
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
    </div>
  );
}
