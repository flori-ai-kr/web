'use client';

import {useCallback, useMemo, useState} from 'react';

import type {CustomRange} from '@/lib/period-range';
import type {Customer, CustomerGradeConfig} from '@/types/database';

export type SortBy = 'recent' | 'newest' | 'oldest' | 'name' | 'purchase_count' | 'purchase_amount';
export type GenderFilter = 'all' | 'male' | 'female';

export type CustomerFiltersController = ReturnType<typeof useCustomerFilters>;

/**
 * 고객 목록 필터(등급·성별·검색)·정렬·기간(월/커스텀 범위) 상태와 파생 목록(그룹핑·헤더 지표). customers-client에서 이동.
 */
export function useCustomerFilters({
  customers,
  grades,
}: {
  customers: Customer[];
  grades: CustomerGradeConfig[];
}) {
  const [gradeFilter, setGradeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  // 기간 헤더(최근 방문 시기 기준). 기본 = 이번 달.
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);

  // Sort function
  const sortCustomers = useCallback((list: Customer[]) => {
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'recent': {
          // 최근 구매순 (nulls last)
          const aTime = a.last_purchase_date ? new Date(a.last_purchase_date).getTime() : -Infinity;
          const bTime = b.last_purchase_date ? new Date(b.last_purchase_date).getTime() : -Infinity;
          return bTime - aTime;
        }
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name, 'ko');
        case 'purchase_count':
          return b.total_purchase_count - a.total_purchase_count;
        case 'purchase_amount':
          return b.total_purchase_amount - a.total_purchase_amount;
        default:
          return 0;
      }
    });
  }, [sortBy]);

  // 기간 매칭 — 최근 방문일(last_purchase_date) 기준. 단, 방문 기록이 없는 고객은
  // 등록일(created_at)로 대체해 '이 기간에 새로 등록한 고객'이 목록에서 사라지지 않게 한다.
  const matchesPeriod = useCallback((c: Customer) => {
    const ref = c.last_purchase_date ?? c.created_at;
    if (!ref) return false;
    const date = ref.slice(0, 10); // 'YYYY-MM-DD'
    if (customRange) {
      return customRange.start <= date && date <= customRange.end;
    }
    // 월 뷰: 연·월 비교
    const ym = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;
    return date.slice(0, 7) === ym;
  }, [customRange, periodYear, periodMonth]);

  const filteredCustomers = useMemo(() => {
    const searching = searchQuery.trim() !== '';
    const filtered = customers
      .filter(c => gradeFilter === 'all' || c.grade_id === gradeFilter)
      .filter(c => genderFilter === 'all' || c.gender === genderFilter)
      // 검색어가 있으면 기간 필터를 무시하고 전체 고객에서 찾는다(이름/연락처로 항상 검색 가능).
      .filter(c => searching || matchesPeriod(c))
      .filter(c => {
        if (!searching) return true;
        const q = searchQuery.toLowerCase();
        const qDigits = q.replace(/-/g, '');
        return c.name.toLowerCase().includes(q)
          || c.phone.includes(q)
          || c.phone.replace(/-/g, '').includes(qDigits)
          || (c.memo?.toLowerCase().includes(q) ?? false);
      });
    return sortCustomers(filtered);
  }, [customers, gradeFilter, genderFilter, searchQuery, matchesPeriod, sortCustomers]);

  // 등급 표시 순서: 구매횟수 임계값 높은 등급 먼저(많이 온 순). 임계값 없는(수동전용) 등급은 맨 뒤.
  const gradeOrder = useMemo(() => {
    return [...grades].sort((a, b) => {
      if (a.threshold == null && b.threshold == null) return a.sort_order - b.sort_order;
      if (a.threshold == null) return 1;
      if (b.threshold == null) return -1;
      return b.threshold - a.threshold;
    });
  }, [grades]);

  // 전체 등급 보기일 때만 등급별 그룹핑(구분선). 특정 등급 필터 시엔 평면 그리드(null).
  const groupedCustomers = useMemo(() => {
    if (gradeFilter !== 'all') return null;
    const byGrade = new Map<string, typeof filteredCustomers>();
    for (const c of filteredCustomers) {
      const key = c.grade_id ?? '__none__';
      (byGrade.get(key) ?? byGrade.set(key, []).get(key)!).push(c);
    }
    const groups = gradeOrder
      .filter(g => byGrade.has(g.id))
      .map(g => ({ id: g.id, name: g.name, customers: byGrade.get(g.id)! }));
    if (byGrade.has('__none__')) {
      groups.push({ id: '__none__', name: '미지정', customers: byGrade.get('__none__')! });
    }
    return groups;
  }, [filteredCustomers, gradeFilter, gradeOrder]);

  // 헤더 보조 지표용 — 날짜 문자열이 활성 기간에 포함되는지(first_purchase_date 등에 사용).
  const inActivePeriod = useCallback((dateStr?: string | null) => {
    if (!dateStr) return false;
    const date = dateStr.slice(0, 10);
    if (customRange) return customRange.start <= date && date <= customRange.end;
    const ym = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;
    return date.slice(0, 7) === ym;
  }, [customRange, periodYear, periodMonth]);

  const isSearching = searchQuery.trim() !== '';

  // 헤더: 큰 숫자 + 보조(신규/재방문/평균구매액). 기간 뷰 기준.
  const headerStats = useMemo(() => {
    const total = filteredCustomers.length;
    // 신규 = 이 기간에 '등록'한 고객(검색 모드에선 기간 개념이 없어 0).
    const newCount = isSearching
      ? 0
      : filteredCustomers.filter(c => inActivePeriod(c.created_at)).length;
    const revisit = total - newCount;
    const sum = filteredCustomers.reduce((s, c) => s + (c.total_purchase_amount || 0), 0);
    const avgManwon = total > 0 ? Math.round(sum / total / 10000) : 0;
    return { total, newCount, revisit, avgManwon };
  }, [filteredCustomers, isSearching, inActivePeriod]);

  const isDefaultPeriod = customRange === null
    && periodYear === now.getFullYear()
    && periodMonth === now.getMonth() + 1;
  const hasActiveFilters = gradeFilter !== 'all' || genderFilter !== 'all' || searchQuery !== '' || sortBy !== 'recent' || !isDefaultPeriod;

  const handleMonthNav = (direction: -1 | 1) => {
    setCustomRange(null);
    let y = periodYear;
    let m = periodMonth + direction;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setPeriodYear(y);
    setPeriodMonth(m);
  };

  const resetFilters = () => {
    setGradeFilter('all');
    setGenderFilter('all');
    setSearchQuery('');
    setSortBy('recent');
    setCustomRange(null);
    setPeriodYear(now.getFullYear());
    setPeriodMonth(now.getMonth() + 1);
  };

  return {
    gradeFilter,
    setGradeFilter,
    genderFilter,
    setGenderFilter,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    periodYear,
    periodMonth,
    customRange,
    setCustomRange,
    filteredCustomers,
    groupedCustomers,
    isSearching,
    headerStats,
    hasActiveFilters,
    handleMonthNav,
    resetFilters,
  };
}
