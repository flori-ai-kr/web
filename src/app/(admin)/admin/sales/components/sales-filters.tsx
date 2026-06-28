'use client';

import {ChevronDown, Search, RotateCcw, Check} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {PeriodNavBar} from '@/components/layout/period-nav-bar';
import type {SaleCategory, PaymentMethod, SaleChannel} from '@/lib/actions/sale-settings';

interface SalesFiltersProps {
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  dateRange: { startDate: string; endDate: string } | null;
  categoryFilter: string[];
  paymentFilter: string[];
  channelFilter: string[];
  searchQuery: string;
  categories: SaleCategory[];
  payments: PaymentMethod[];
  channels: SaleChannel[];
  onMonthNav: (direction: -1 | 1) => void;
  onMonthSelect: (year: number, month: number) => void;
  onTodayOnly: () => void;
  onDateRangeApply: (startDate: string, endDate: string) => void;
  onCategoryChange: (category: string[]) => void;
  onPaymentChange: (payment: string[]) => void;
  onChannelChange: (channel: string[]) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  children?: React.ReactNode;
}

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const displayLabel = selected.length === 0
    ? '전체'
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length}개 선택`;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-xs hover:bg-muted transition-colors"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-medium ${selected.length > 0 ? 'text-brand' : 'text-foreground'}`}>
            {displayLabel}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors"
        >
          <span className={`w-3.5 h-3.5 flex items-center justify-center ${selected.length === 0 ? 'text-brand' : 'text-transparent'}`}>
            <Check className="w-3 h-3" />
          </span>
          전체
        </button>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors"
          >
            <span className={`w-3.5 h-3.5 flex items-center justify-center ${selected.includes(opt.value) ? 'text-brand' : 'text-transparent'}`}>
              <Check className="w-3 h-3" />
            </span>
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function SalesFiltersUI({
  currentYear,
  currentMonth,
  dateRange,
  categoryFilter,
  paymentFilter,
  channelFilter,
  searchQuery,
  categories,
  payments,
  channels,
  onMonthNav,
  onMonthSelect,
  onDateRangeApply,
  onCategoryChange,
  onPaymentChange,
  onChannelChange,
  onSearchChange,
  onReset,
  children,
}: SalesFiltersProps) {
  const monthLabel = currentYear === 0
    ? '전체'
    : currentMonth === 0
      ? `${currentYear}년`
      : `${currentYear}년 ${currentMonth}월`;

  return (
    <div className="space-y-3">
      {/* 기간 네비 (월 네비 + 기간 셀렉터) — 공용 PeriodNavBar. 범위 초기화는 전체 필터 초기화로 동작(기존 동작 유지) */}
      <PeriodNavBar
        periodYear={currentYear}
        periodMonth={currentMonth}
        monthLabel={monthLabel}
        appliedRange={dateRange ? { start: dateRange.startDate, end: dateRange.endDate } : null}
        onMonthNav={onMonthNav}
        onMonthSelect={onMonthSelect}
        onRangeApply={onDateRangeApply}
        onRangeReset={onReset}
      />

      {children}

      {/* 필터 드롭다운 + 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.length > 0 && (
          <FilterDropdown
            label="카테고리"
            options={categories.map(c => ({ value: c.id, label: c.label }))}
            selected={categoryFilter}
            onChange={onCategoryChange}
          />
        )}
        {payments.length > 0 && (
          <FilterDropdown
            label="결제방식"
            options={payments.map(p => ({ value: p.id, label: p.label }))}
            selected={paymentFilter}
            onChange={onPaymentChange}
          />
        )}
        <FilterDropdown
          label="채널"
          options={channels.map(c => ({ value: c.id, label: c.label }))}
          selected={channelFilter}
          onChange={onChannelChange}
        />

        {/* 검색 — 모바일에서 풀 너비 */}
        <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="고객명, 메모 검색..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-8 text-sm bg-background rounded-full"
            aria-label="매출 검색"
          />
        </div>

        {(categoryFilter.length > 0 || paymentFilter.length > 0 || channelFilter.length > 0 || searchQuery) && (
          <button
            type="button"
            onClick={onReset}
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
