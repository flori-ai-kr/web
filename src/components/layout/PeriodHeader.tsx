'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { ko } from 'date-fns/locale';
import type { CustomRange } from '@/lib/period-range';

const PRESETS = [
  { label: '오늘', days: 0 },
  { label: '지난 7일', days: 7 },
  { label: '지난 30일', days: 30 },
  { label: '지난 90일', days: 90 },
];

function formatDate(date: Date): string {
  // 로컬(KST) 기준. toISOString()은 UTC라 새벽 시간대에 하루 밀리므로 사용 금지.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
            value ? 'border-brand/40 text-foreground' : 'border-border text-muted-foreground'
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

/**
 * 매출/고객 페이지와 동일한 월 네비 + 기간 셀렉터 헤더 (공용).
 */
export function PeriodHeader({
  periodYear,
  periodMonth,
  customRange,
  onMonthNav,
  onRangeApply,
  onRangeReset,
}: {
  periodYear: number;
  periodMonth: number;
  customRange: CustomRange | null;
  onMonthNav: (direction: -1 | 1) => void;
  onRangeApply: (range: CustomRange) => void;
  onRangeReset: () => void;
}) {
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const isRangeApplied = customRange !== null;

  const monthDisplay = `${periodYear}년 ${periodMonth}월`;

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date(to);
    if (days !== 0) from.setDate(from.getDate() - days + 1);
    const s = formatDate(from);
    const e = formatDate(to);
    setStartDate(s);
    setEndDate(e);
    onRangeApply({ start: s, end: e });
    setShowDateRange(false);
  };

  const handleApplyRange = () => {
    if (startDate && endDate) {
      onRangeApply({ start: startDate, end: endDate });
      setShowDateRange(false);
    }
  };

  const handleResetRange = () => {
    setStartDate('');
    setEndDate('');
    setShowDateRange(false);
    onRangeReset();
  };

  const handleMonthNav = (direction: -1 | 1) => {
    setStartDate('');
    setEndDate('');
    setShowDateRange(false);
    onMonthNav(direction);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:relative sm:flex-row items-center gap-2 sm:justify-center">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleMonthNav(-1)}
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
            onClick={() => handleMonthNav(1)}
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
          aria-expanded={showDateRange}
          aria-controls="period-date-range-panel"
        >
          <CalendarDays className="w-3.5 h-3.5 inline-block -mt-px" />
          <span className="ml-1">
            {isRangeApplied && customRange
              ? `${formatDisplayDate(customRange.start)} ~ ${formatDisplayDate(customRange.end)}`
              : '기간'}
          </span>
        </button>
      </div>

      {showDateRange && (
        <div id="period-date-range-panel" className="bg-card border border-border rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map((preset) => (
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
          <div className="flex items-center gap-2">
            <DatePickerButton value={startDate} onChange={setStartDate} placeholder="시작일" maxDate={endDate || undefined} />
            <span className="text-muted-foreground text-xs shrink-0">~</span>
            <DatePickerButton value={endDate} onChange={setEndDate} placeholder="종료일" minDate={startDate || undefined} />
          </div>
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
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                초기화
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
