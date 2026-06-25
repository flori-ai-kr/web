'use client';

import {cn} from '@/lib/utils';
import {PageHeader} from '@/components/layout/page-header';
import {AuctionPanel} from './components/auction-panel';
import {GrantsPanel} from './components/grants-panel';
import {INFO_TABS, useInfoTabs, type InfoTab} from './hooks/use-info-tabs';
import type {AuctionCategory, AuctionSummary} from '@/types/auction';
import type {GrantCategory, GrantProgram, GrantScrap} from '@/types/grants';
import type {ScrapMap} from '@/types/insights';

interface InfoClientProps {
  initialTab: InfoTab;
  initialCategory: string | null;
  initialScrapedOnly: boolean;
  // 경매 시세
  auctionCategories: AuctionCategory[];
  auctionSummary: AuctionSummary;
  auctionDates: string[];
  auctionScraps: string[];
  // 지원사업
  grants: GrantProgram[];
  grantScrapMap: ScrapMap;
  grantScraps: GrantScrap[];
}

export function InfoClient({
  initialTab,
  initialCategory,
  initialScrapedOnly,
  auctionCategories,
  auctionSummary,
  auctionDates,
  auctionScraps,
  grants,
  grantScrapMap,
  grantScraps,
}: InfoClientProps) {
  const {tab, category, scrapedOnly, changeTab, changeFilter} = useInfoTabs({
    initialTab,
    initialCategory,
    initialScrapedOnly,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-1 sm:px-6 sm:py-2">
      <PageHeader title="인사이트" description="경매 시세 · 지원사업" />

      {/* 메인 언더라인 탭 (= statistics 4탭 패턴) */}
      <div role="tablist" aria-label="인사이트 탭" className="flex gap-1 overflow-x-auto border-b border-border scrollbar-hide">
        {INFO_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`info-tab-${t.value}`}
            aria-controls={`info-panel-${t.value}`}
            aria-selected={tab === t.value}
            onClick={() => changeTab(t.value)}
            className={cn(
              'whitespace-nowrap border-b-2 -mb-px px-3.5 pb-2.5 pt-1.5 text-sm font-semibold leading-none',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              tab === t.value
                ? 'border-[var(--brand)] text-[var(--brand)]'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`info-panel-${tab}`} aria-labelledby={`info-tab-${tab}`}>
        {tab === 'price' && (
          <AuctionPanel
            categories={auctionCategories}
            initialSummary={auctionSummary}
            initialDates={auctionDates}
            initialScraps={auctionScraps}
          />
        )}
        {tab === 'grant' && (
          <GrantsPanel
            programs={grants}
            scrapMap={grantScrapMap}
            scrappedGrants={grantScraps}
            category={category as GrantCategory | null}
            scrapedOnly={scrapedOnly}
            onCategoryChange={changeFilter}
          />
        )}
      </div>
    </div>
  );
}
