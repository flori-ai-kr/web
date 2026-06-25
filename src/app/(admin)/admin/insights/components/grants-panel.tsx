'use client';

import {Landmark, Search} from 'lucide-react';
import {EmptyState} from '@/components/layout/empty-state';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {FilterPill} from './filter-pill';
import {GrantCard} from './grant-card';
import {SearchResetButton} from './search-reset-button';
import {StatSectionHeader} from '@/app/(admin)/admin/statistics/components/stat-section-header';
import {useGrantsList} from '../hooks/use-grants-list';
import {GRANT_CATEGORIES, type GrantCategory, type GrantProgram, type GrantScrap} from '@/types/grants';
import type {ScrapMap} from '@/types/insights';

interface GrantsPanelProps {
  programs: GrantProgram[];
  scrapMap: ScrapMap;
  /** 내가 스크랩한 지원사업(카테고리 무관 전체). 스크랩 보기·카운트의 단일 출처. */
  scrappedGrants: GrantScrap[];
  category: GrantCategory | null;
  scrapedOnly: boolean;
  onCategoryChange: (cat: GrantCategory | null, scrapedOnly: boolean) => void;
}

export function GrantsPanel({
  programs,
  scrapMap,
  scrappedGrants,
  category,
  scrapedOnly,
  onCategoryChange,
}: GrantsPanelProps) {
  const {filtered, hasMore, isLoadingMore, loadMore, searchQuery, setSearchQuery} = useGrantsList({
    initialPrograms: programs,
    category,
    scrapMap,
    scrapedOnly,
  });

  // 스크랩 카운트·목록은 카테고리/페이지와 무관하게 항상 '내 전체 스크랩' 기준.
  const scrappedCount = scrappedGrants.length;
  const displayPrograms = scrapedOnly ? scrappedGrants.map((s) => s.program) : filtered;

  return (
    <div>
      {/* 카테고리 필터 칩 */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <FilterPill
          active={scrapedOnly}
          onClick={() => onCategoryChange(category, !scrapedOnly)}
          label="스크랩"
          glyph="🔖"
          count={scrappedCount}
        />
        <FilterPill
          active={!category && !scrapedOnly}
          onClick={() => onCategoryChange(null, false)}
          label="전체"
        />
        {GRANT_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat.value}
            active={category === cat.value && !scrapedOnly}
            onClick={() => onCategoryChange(cat.value as GrantCategory, false)}
            label={cat.label}
          />
        ))}
      </div>

      {/* 제목·요약·기관 서버 검색 (디바운스). 스크랩 보기에서는 숨김. */}
      {!scrapedOnly && (
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="지원사업 검색 (제목·기관)"
              className="pl-9"
              aria-label="지원사업 검색"
            />
          </div>
          {searchQuery && <SearchResetButton onClick={() => setSearchQuery('')} />}
        </div>
      )}

      <StatSectionHeader title="모집 중" meta="출처: K-Startup" />

      {displayPrograms.length === 0 ? (
        <EmptyState
          icon={searchQuery ? Search : Landmark}
          title={
            searchQuery
              ? '검색 결과가 없어요'
              : scrapedOnly
                ? '스크랩한 지원사업이 없어요'
                : '모집 중인 지원사업이 없어요'
          }
          description={
            searchQuery
              ? '다른 검색어로 시도해 보세요'
              : scrapedOnly
                ? '관심 있는 지원사업을 스크랩해보세요'
                : '새 공고가 올라오면 여기에 도착합니다'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          {displayPrograms.map((program) => (
            <GrantCard
              key={`${program.id}-${scrapedOnly ? 'scrap' : 'all'}`}
              program={program}
              scraped={scrapedOnly ? true : !!scrapMap[program.id]}
            />
          ))}
        </div>
      )}

      {!scrapedOnly && hasMore && displayPrograms.length > 0 && (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
