'use client';

import {useMemo} from 'react';
import {Landmark} from 'lucide-react';
import {EmptyState} from '@/components/layout/empty-state';
import {Button} from '@/components/ui/button';
import {FilterPill} from './filter-pill';
import {GrantCard} from './grant-card';
import {StatSectionHeader} from '@/app/(admin)/admin/statistics/components/stat-section-header';
import {useGrantsList} from '../hooks/use-grants-list';
import {GRANT_CATEGORIES, type GrantCategory, type GrantProgram} from '@/types/grants';
import type {ScrapMap} from '@/types/insights';

interface GrantsPanelProps {
  programs: GrantProgram[];
  scrapMap: ScrapMap;
  category: GrantCategory | null;
  scrapedOnly: boolean;
  onCategoryChange: (cat: GrantCategory | null, scrapedOnly: boolean) => void;
}

export function GrantsPanel({
  programs,
  scrapMap,
  category,
  scrapedOnly,
  onCategoryChange,
}: GrantsPanelProps) {
  const {filtered, hasMore, isLoadingMore, loadMore} = useGrantsList({
    initialPrograms: programs,
    category,
    scrapMap,
    scrapedOnly,
  });

  const scrappedCount = useMemo(
    () => programs.filter((p) => scrapMap[p.id]).length,
    [programs, scrapMap],
  );

  return (
    <div>
      {/* 카테고리 필터 칩 */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
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
        <FilterPill
          active={scrapedOnly}
          onClick={() => onCategoryChange(category, !scrapedOnly)}
          label="스크랩"
          glyph="🔖"
          count={scrappedCount}
        />
      </div>

      <StatSectionHeader title="모집 중" meta="소진공 · 기업마당 · K-Startup" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={scrapedOnly ? '스크랩한 지원사업이 없어요' : '모집 중인 지원사업이 없어요'}
          description={
            scrapedOnly ? '관심 있는 지원사업을 스크랩해보세요' : '새 공고가 올라오면 여기에 도착합니다'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((program) => (
            <GrantCard key={program.id} program={program} scraped={!!scrapMap[program.id]} />
          ))}
        </div>
      )}

      {!scrapedOnly && hasMore && filtered.length > 0 && (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
