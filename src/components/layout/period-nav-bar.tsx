'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { ko } from 'date-fns/locale';

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

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * 기간 네비게이션 바 (공용) — 월 네비 `< N월 >`(라벨 클릭 시 년·월 점프 피커) + "기간" 팝오버(오늘/지난 N일 프리셋 + 시작~종료 + 적용).
 * 매출·지출·고객·사진첩이 공유한다. 적용된 범위(appliedRange)는 상위가 소유하고, 입력 필드는 내부 임시 상태.
 * - periodYear/periodMonth: 현재 월(점프 피커 하이라이트·년 기본값). 0이면 '전체' 모드(매출/지출) — 하이라이트 없음
 * - monthLabel: 월 표시 문자열(상위가 'all'/'N년' 등 모드까지 계산해 전달)
 * - onMonthSelect: 특정 년·월로 점프(미래 월 포함)
 * - appliedRange: 현재 적용된 기간(없으면 월 모드) — "기간" 버튼 라벨/하이라이트 근거
 */
export function PeriodNavBar({
  periodYear,
  periodMonth,
  monthLabel,
  appliedRange,
  onMonthNav,
  onMonthSelect,
  onRangeApply,
  onRangeReset,
}: {
  periodYear: number;
  periodMonth: number;
  monthLabel: string;
  appliedRange: { start: string; end: string } | null;
  onMonthNav: (direction: -1 | 1) => void;
  onMonthSelect: (year: number, month: number) => void;
  onRangeApply: (startDate: string, endDate: string) => void;
  onRangeReset: () => void;
}) {
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(periodYear || 0);
  // 미래 월 흐리게 표시용 — 피커 열 때 클라이언트에서 계산(SSR 하이드레이션·purity 회피)
  const [nowYM, setNowYM] = useState({ y: 0, m: 0 });
  const isRangeApplied = appliedRange !== null;

  const openMonthPicker = (open: boolean) => {
    if (open) {
      const now = new Date();
      setNowYM({ y: now.getFullYear(), m: now.getMonth() + 1 });
      setPickerYear(periodYear || now.getFullYear());
    }
    setMonthPickerOpen(open);
  };

  const handleMonthSelect = (year: number, month: number) => {
    setStartDate('');
    setEndDate('');
    setShowDateRange(false);
    setMonthPickerOpen(false);
    onMonthSelect(year, month);
  };

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date(to);
    if (days !== 0) from.setDate(from.getDate() - days + 1);
    const s = formatDate(from);
    const e = formatDate(to);
    setStartDate(s);
    setEndDate(e);
    onRangeApply(s, e);
    setShowDateRange(false);
  };

  const handleApplyRange = () => {
    if (startDate && endDate) {
      onRangeApply(startDate, endDate);
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
          <Popover open={monthPickerOpen} onOpenChange={openMonthPicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-foreground min-w-[110px] text-center px-2 h-7 rounded-lg hover:bg-muted transition-colors"
                aria-label="년·월 선택"
              >
                {monthLabel}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-[260px] p-3">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
                  aria-label="이전 해"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-foreground tabular-nums">{pickerYear}년</span>
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
                  aria-label="다음 해"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((m) => {
                  const isCurrent = pickerYear === periodYear && m === periodMonth;
                  const isFuture =
                    pickerYear > nowYM.y || (pickerYear === nowYM.y && m > nowYM.m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMonthSelect(pickerYear, m)}
                      className={`h-8 rounded-lg text-xs font-medium border transition-colors ${
                        isCurrent
                          ? 'bg-brand text-white border-brand'
                          : `border-border bg-background hover:border-brand/60 hover:text-brand ${isFuture ? 'opacity-40' : 'text-foreground'}`
                      }`}
                    >
                      {m}월
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
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
            {isRangeApplied && appliedRange
              ? `${formatDisplayDate(appliedRange.start)} ~ ${formatDisplayDate(appliedRange.end)}`
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
