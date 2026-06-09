'use client';

import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { resolveRange, type RangePreset } from '../lib/range';

interface DateRangeSelectorProps {
  preset: RangePreset;
  from: string;
  to: string;
  onChange: (next: { preset: RangePreset; from: string; to: string }) => void;
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'this-month', label: '이번 달' },
  { value: 'last-month', label: '지난달' },
  { value: 'last-3m', label: '최근 3개월' },
  { value: 'this-year', label: '올해' },
  { value: 'custom', label: '직접 선택' },
];

function displayRange(from: string, to: string): string {
  if (!from || !to) return '';
  const fmt = (s: string) => s.replace(/-/g, '.');
  return `${fmt(from)} – ${fmt(to)}`;
}

export function DateRangeSelector({ preset, from, to, onChange }: DateRangeSelectorProps) {
  function handlePreset(next: RangePreset) {
    if (next === 'custom') {
      // Keep current from/to when entering custom mode
      onChange({ preset: 'custom', from, to });
    } else {
      const resolved = resolveRange(next);
      onChange({ preset: next, from: resolved.from, to: resolved.to });
    }
  }

  function handleFrom(date: string) {
    onChange({ preset: 'custom', from: date, to });
  }

  function handleTo(date: string) {
    onChange({ preset: 'custom', from, to: date });
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Label */}
        <span className="text-[13px] font-bold text-muted-foreground shrink-0">빠른 선택</span>

        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="기간 빠른 선택">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePreset(p.value)}
              aria-pressed={preset === p.value}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold leading-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                preset === p.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date pickers */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2" aria-label="직접 날짜 선택">
            <DatePicker
              value={from}
              onChange={handleFrom}
              placeholder="시작일"
              maxDate={to || undefined}
              aria-label="시작일"
              className="w-36"
            />
            <span className="text-muted-foreground text-sm" aria-hidden>–</span>
            <DatePicker
              value={to}
              onChange={handleTo}
              placeholder="종료일"
              minDate={from || undefined}
              aria-label="종료일"
              className="w-36"
            />
          </div>
        )}

        {/* Resolved range label */}
        {preset !== 'custom' && from && to && (
          <span className="ml-auto font-mono text-[12px] text-muted-foreground tabular-nums">
            {displayRange(from, to)}
          </span>
        )}
      </div>
    </div>
  );
}
