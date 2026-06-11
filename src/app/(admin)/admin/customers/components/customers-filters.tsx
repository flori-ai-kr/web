'use client';

import {Input} from '@/components/ui/input';
import {RotateCcw, Search} from 'lucide-react';
import type {CustomerGradeConfig} from '@/types/database';
import {FilterSelect} from './filter-select';
import type {CustomerFiltersController, GenderFilter, SortBy} from '../hooks/use-customer-filters';

/**
 * 고객 목록 필터 바 — 등급/성별/정렬 드롭다운 + 검색 + 초기화. customers-client에서 이동.
 */
export function CustomersFilters({
  filters,
  grades,
}: {
  filters: CustomerFiltersController;
  grades: CustomerGradeConfig[];
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {/* 드롭다운 — 한 줄(넘치면 가로 스크롤) */}
      <div className="flex items-center gap-2 overflow-x-auto shrink-0">
        <FilterSelect
          label="등급"
          value={filters.gradeFilter}
          defaultValue="all"
          options={[
            { value: 'all', label: '전체' },
            ...grades.map((g) => ({ value: g.id, label: g.name })),
          ]}
          onChange={filters.setGradeFilter}
        />
        <FilterSelect
          label="성별"
          value={filters.genderFilter}
          defaultValue="all"
          options={[
            { value: 'all', label: '전체' },
            { value: 'male', label: '남성' },
            { value: 'female', label: '여성' },
          ]}
          onChange={(v) => filters.setGenderFilter(v as GenderFilter)}
        />
        <FilterSelect
          label="정렬"
          value={filters.sortBy}
          defaultValue="recent"
          options={[
            { value: 'recent', label: '최근 구매순' },
            { value: 'newest', label: '최신 등록순' },
            { value: 'oldest', label: '오래된순' },
            { value: 'name', label: '가나다순' },
            { value: 'purchase_count', label: '구매횟수순' },
            { value: 'purchase_amount', label: '구매금액순' },
          ]}
          onChange={(v) => filters.setSortBy(v as SortBy)}
        />
      </div>
      {/* 검색 + 초기화 — 데탑에선 검색바 폭 제한(매출과 동일 220px) */}
      <div className="flex items-center gap-2 sm:flex-1 min-w-0">
        <div className="relative flex-1 sm:max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="이름, 연락처, 메모 검색..."
            value={filters.searchQuery}
            onChange={(e) => filters.setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-background rounded-full"
            aria-label="고객 검색"
          />
        </div>
        {filters.hasActiveFilters && (
          <button
            type="button"
            onClick={filters.resetFilters}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-card text-foreground text-xs font-medium shrink-0 hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
