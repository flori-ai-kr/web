'use client';

import {useMemo, useState} from 'react';
import {Gavel, Search} from 'lucide-react';
import {EmptyState} from '@/components/layout/empty-state';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {StatSectionHeader} from '@/app/(admin)/admin/statistics/components/stat-section-header';
import {AuctionFilterPills} from './auction-filter-pills';
import {AuctionDateNav} from './auction-date-nav';
import {AuctionItemRow} from './auction-item-row';
import {formatPriceDelta, priceDeltaTone, TONE_TEXT} from './price-row';
import {filterAuctionItems, pickAuctionExtremes, useAuction} from '../hooks/use-auction';
import type {AuctionCategory, AuctionSummary, AuctionSummaryItem} from '@/types/auction';

/**
 * 화훼구분별 거래단위 라벨. 가격은 거래단위당 값이라 단위가 구분마다 다르다.
 * 절화는 속(묶음), 관엽·난·춘란은 분(화분) 단위.
 */
function unitMeta(gubn: string): string {
  switch (gubn) {
    case '절화':
      return '대표가 = 거래량 가중평균 · 1속당';
    case '관엽':
    case '난':
    case '춘란':
      return '대표가 = 거래량 가중평균 · 1분당';
    default:
      return '대표가 = 거래량 가중평균 · 단위는 구분별 상이';
  }
}

interface AuctionPanelProps {
  categories: AuctionCategory[];
  initialSummary: AuctionSummary;
  initialDates: string[];
  initialScraps: string[];
}

export function AuctionPanel({
  categories,
  initialSummary,
  initialDates,
  initialScraps,
}: AuctionPanelProps) {
  const {gubn, setGubn, date, setDate, summary, dates, loading, error, scrappedNames, toggleItemScrap} =
    useAuction({initialSummary, initialDates, initialScraps});
  const [searchQuery, setSearchQuery] = useState('');
  const [scrapedOnly, setScrapedOnly] = useState(false);

  // KPI는 전체 요약 기준 그대로 유지하고, 검색·스크랩은 보이는 목록만 좁힌다.
  const {strongest, weakest} = pickAuctionExtremes(summary.items);
  const visibleItems = useMemo(() => {
    const searched = filterAuctionItems(summary.items, searchQuery);
    return scrapedOnly ? searched.filter((it) => scrappedNames.has(it.pum_name)) : searched;
  }, [summary.items, searchQuery, scrapedOnly, scrappedNames]);
  const meta = summary.items.length > 0 ? `aT 양재 · ${summary.items.length}개 품목` : 'aT 양재';

  return (
    <div>
      {/* 화훼구분 칩 필터 (native select 폐기) */}
      <AuctionFilterPills
        categories={categories}
        gubn={gubn}
        onChange={setGubn}
        scrapedOnly={scrapedOnly}
        scrappedCount={scrappedNames.size}
        onScrapToggle={() => setScrapedOnly((v) => !v)}
      />

      {/* 날짜 직접 선택 */}
      <AuctionDateNav date={date} availableDates={dates} onChange={setDate} meta={meta} />

      {/* 강세/약세 KPI 2칸 */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <ExtremeKpiCard label="오늘 강세" item={strongest} />
        <ExtremeKpiCard label="오늘 약세" item={weakest} />
      </div>

      <StatSectionHeader title="품목별 시세" meta={unitMeta(gubn)} />

      {/* 품목 검색 — 불러온 목록을 pum_name 으로 즉시 좁힘(클라이언트). KPI엔 영향 없음. */}
      {!loading && !error && summary.items.length > 0 && (
        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="품목 검색"
            className="pl-9"
            aria-label="품목 검색"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({length: 6}).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Gavel}
          title="시세를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      ) : summary.items.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="해당 날짜의 시세가 없어요"
          description="다른 날짜나 화훼구분을 선택해 보세요."
        />
      ) : visibleItems.length === 0 ? (
        scrapedOnly && !searchQuery ? (
          <EmptyState
            icon={Gavel}
            title="스크랩한 품목이 없어요"
            description="관심 품목의 북마크를 눌러 모아 보세요."
          />
        ) : (
          <EmptyState icon={Search} title="검색 결과가 없어요" description="다른 품목명으로 검색해 보세요." />
        )
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {visibleItems.map((item) => (
            <AuctionItemRow
              key={item.pum_name}
              item={item}
              date={date}
              gubn={gubn}
              scrapped={scrappedNames.has(item.pum_name)}
              onScrapToggle={() => toggleItemScrap(item.pum_name)}
            />
          ))}
        </div>
      )}

      {/* 출처 표기 (이용허락범위 '제작자표시' 의무) */}
      <p className="mt-3 text-[11px] text-muted-foreground">출처: {summary.source} · 양재 화훼공판장</p>
    </div>
  );
}

function ExtremeKpiCard({label, item}: {label: string; item: AuctionSummaryItem | null}) {
  const tone = item ? priceDeltaTone(item.rep_change_rate) : 'flat';
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      {item ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base font-bold text-foreground">{item.pum_name}</span>
          <span className={`text-sm font-bold tabular-nums ${TONE_TEXT[tone]}`}>
            {formatPriceDelta(item.rep_change_rate)}
          </span>
        </div>
      ) : (
        <p className="text-base font-bold text-muted-foreground">—</p>
      )}
    </div>
  );
}
