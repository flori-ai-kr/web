'use client';

import {useState} from 'react';
import {CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Search, RotateCcw, Check} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {CHANNEL_LABELS} from '@/lib/constants';
import type {SaleCategory, PaymentMethod} from '@/lib/actions/sale-settings';
import {ko} from 'date-fns/locale';

interface SalesFiltersProps {
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  categoryFilter: string[];
  paymentFilter: string[];
  channelFilter: string[];
  searchQuery: string;
  categories: SaleCategory[];
  payments: PaymentMethod[];
  onMonthNav: (direction: -1 | 1) => void;
  onTodayOnly: () => void;
  onDateRangeApply: (startDate: string, endDate: string) => void;
  onCategoryChange: (category: string[]) => void;
  onPaymentChange: (payment: string[]) => void;
  onChannelChange: (channel: string[]) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  children?: React.ReactNode;
}

const PRESETS = [
  { label: '오늘', days: 0 },
  { label: '지난 7일', days: 7 },
  { label: '지난 30일', days: 30 },
  { label: '지난 90일', days: 90 },
];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
}

function DatePickerButton({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
}: {
  value: string;
  onChange: (date: string) => void;
  placeholder: string;
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : undefined;
  const disabled = [];
  if (minDate) disabled.push({ before: new Date(minDate + 'T00:00:00') });
  if (maxDate) disabled.push({ after: new Date(maxDate + 'T00:00:00') });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex-1 h-8 px-3 rounded-md border text-xs text-left transition-colors ${
            value
              ? 'border-brand/40 text-foreground'
              : 'border-border text-muted-foreground'
          } bg-background hover:border-brand/60`}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ko}
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2030, 11)}
          disabled={disabled}
          onSelect={(date) => {
            if (date) {
              onChange(formatDate(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
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
  currentDay,
  categoryFilter,
  paymentFilter,
  channelFilter,
  searchQuery,
  categories,
  payments,
  onMonthNav,
  onTodayOnly,
  onDateRangeApply,
  onCategoryChange,
  onPaymentChange,
  onChannelChange,
  onSearchChange,
  onReset,
  children,
}: SalesFiltersProps) {
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRangeApplied, setIsRangeApplied] = useState(false);

  const monthDisplay = currentYear === 0
    ? '전체'
    : currentMonth === 0
      ? `${currentYear}년`
      : `${currentYear}년 ${currentMonth}월`;

  const handlePreset = (days: number) => {
    const today = new Date();
    let from: Date;
    const to: Date = today;

    if (days === 0) {
      from = today;
    } else {
      from = new Date(today);
      from.setDate(from.getDate() - days + 1);
    }

    const s = formatDate(from);
    const e = formatDate(to);
    setStartDate(s);
    setEndDate(e);
    onDateRangeApply(s, e);
    setShowDateRange(false);
    setIsRangeApplied(true);
  };

  const handleApplyRange = () => {
    if (startDate && endDate) {
      onDateRangeApply(startDate, endDate);
      setShowDateRange(false);
      setIsRangeApplied(true);
    }
  };

  const handleResetRange = () => {
    setStartDate('');
    setEndDate('');
    setShowDateRange(false);
    setIsRangeApplied(false);
    onReset();
  };

  return (
    <div className="space-y-3">
      {/* Row 1: 월 네비 (중앙) + 기간 버튼 (우측) */}
      <div className="flex flex-col sm:relative sm:flex-row items-center gap-2 sm:justify-center">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setStartDate(''); setEndDate(''); setIsRangeApplied(false); setShowDateRange(false); onMonthNav(-1); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[100px] text-center">
            {monthDisplay}
          </span>
          <button
            type="button"
            onClick={() => { setStartDate(''); setEndDate(''); setIsRangeApplied(false); setShowDateRange(false); onMonthNav(1); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
            aria-label="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowDateRange(!showDateRange)}
          className={`sm:absolute sm:right-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showDateRange
              ? 'bg-foreground text-background'
              : isRangeApplied
                ? 'bg-brand/10 text-brand border border-brand/30'
                : 'bg-background border border-border text-muted-foreground hover:border-foreground/30'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 inline-block -mt-px" />
          <span className="ml-1">
            {isRangeApplied && startDate && endDate
              ? `${formatDisplayDate(startDate)} ~ ${formatDisplayDate(endDate)}`
              : '기간'}
          </span>
        </button>
      </div>

      {/* 기간 셀렉터 — date input + 프리셋 */}
      {showDateRange && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-3">
          {/* 프리셋 퀵 버튼 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset.days)}
                className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* 날짜 선택 */}
          <div className="flex items-center gap-2">
            <DatePickerButton
              value={startDate}
              onChange={setStartDate}
              placeholder="시작일"
              maxDate={endDate || undefined}
            />
            <span className="text-muted-foreground text-xs shrink-0">~</span>
            <DatePickerButton
              value={endDate}
              onChange={setEndDate}
              placeholder="종료일"
              minDate={startDate || undefined}
            />
          </div>
          {/* 적용/초기화 — 모바일에서 아래줄 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyRange}
              disabled={!startDate || !endDate}
              className="h-8 px-4 rounded-md bg-brand text-white text-xs font-medium whitespace-nowrap disabled:opacity-50"
            >
              적용
            </button>
            {isRangeApplied && (
              <button
                type="button"
                onClick={handleResetRange}
                className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}

      {children}

      {/* 필터 드롭다운 + 검색 */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.length > 0 && (
          <FilterDropdown
            label="카테고리"
            options={categories.map(c => ({ value: c.value, label: c.label }))}
            selected={categoryFilter}
            onChange={onCategoryChange}
          />
        )}
        {payments.length > 0 && (
          <FilterDropdown
            label="결제방식"
            options={payments.map(p => ({ value: p.value, label: p.label }))}
            selected={paymentFilter}
            onChange={onPaymentChange}
          />
        )}
        <FilterDropdown
          label="채널"
          options={Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }))}
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
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
