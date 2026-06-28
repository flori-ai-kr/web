'use client';

import {HelpCircle} from 'lucide-react';
import {cn} from '@/lib/utils';
import {PageHeader} from '@/components/layout/page-header';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
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

/** 제목 옆 ? 버튼 — 스크랩 시 받는 푸시 알림 동작 안내(경매=새 시세, 지원사업=D-1·D-day). */
function ScrapInfoButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="스크랩 알림 안내"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HelpCircle className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-foreground">스크랩하면 알림을 받아요</p>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">경매 시세</span> — 관심 품목을 스크랩해두면, 새 경매
              시세가 들어올 때 푸시 알림으로 알려드려요.
            </p>
            <p>
              <span className="font-medium text-foreground">지원사업</span> — 스크랩해두면 마감 하루 전(D-1)과
              마감 당일(D-day)에 푸시 알림으로 알려드려요.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80">알림은 설정 &gt; 알림 수신 설정에서 켜고 끌 수 있어요.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
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
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            인사이트
            <ScrapInfoButton />
          </span>
        }
        description="경매 시세 · 지원사업"
      />

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
