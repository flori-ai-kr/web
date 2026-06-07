'use client';

import * as React from 'react';
import {CalendarDays} from 'lucide-react';
import {ko} from 'date-fns/locale';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {cn} from '@/lib/utils';

interface DatePickerProps {
  /** FormData 제출용 name (있으면 hidden input 렌더). */
  name?: string;
  /** controlled 값 (yyyy-MM-dd). */
  value?: string;
  /** uncontrolled 초기값 (yyyy-MM-dd). */
  defaultValue?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

function display(value: string): string {
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${y}.${m}.${d}`;
}

/**
 * 폼/모달 공용 날짜 선택기 — 기간 셀렉터와 동일한 shadcn Calendar 팝오버.
 * name을 주면 hidden input으로 FormData 제출도 지원(네이티브 <input type="date"> 대체).
 */
export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  placeholder = '날짜 선택',
  minDate,
  maxDate,
  required,
  disabled,
  className,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue ?? '');
  const current = value !== undefined ? value : internal;

  const selected = current ? new Date(current + 'T00:00:00') : undefined;
  const disabledDays = [];
  if (minDate) disabledDays.push({ before: new Date(minDate + 'T00:00:00') });
  if (maxDate) disabledDays.push({ after: new Date(maxDate + 'T00:00:00') });

  const set = (d: string) => {
    if (value === undefined) setInternal(d);
    onChange?.(d);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              'flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
              current ? 'text-foreground' : 'text-muted-foreground',
              className,
            )}
          >
            <span className="truncate">{current ? display(current) : placeholder}</span>
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
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
            disabled={disabledDays}
            onSelect={(date) => {
              if (date) {
                const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                set(d);
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={current} required={required} />}
    </>
  );
}
