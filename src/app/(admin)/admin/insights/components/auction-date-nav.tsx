'use client';

import {useState} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';

interface AuctionDateNavProps {
  /** 현재 선택 날짜 (yyyy-MM-dd). null이면 데이터 없음. */
  date: string | null;
  /** 시세 보유 일자(내림차순). 빈 날을 건너뛰는 prev/next 기준. */
  availableDates: string[];
  onChange: (date: string) => void;
  /** 우측 메타(예: 'aT 양재 · 12개 품목'). */
  meta?: string;
}

function dayLabel(iso: string): string {
  try {
    return format(new Date(iso + 'T00:00:00'), 'yyyy-MM-dd (EEEEE)', {locale: ko});
  } catch {
    return iso;
  }
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 날짜 직접 선택 네비. ‹ (달력아이콘) YYYY-MM-DD(요일) › + 캘린더 팝오버.
 * prev/next 는 시세 보유 일자(availableDates)를 따라 이동해 빈 날을 건너뛴다.
 * (목록은 내림차순이므로 '이전(과거)' = index 증가, '다음(미래)' = index 감소.)
 */
export function AuctionDateNav({date, availableDates, onChange, meta}: AuctionDateNavProps) {
  const [open, setOpen] = useState(false);

  // availableDates 안에서의 현재 위치. 미포함이면 -1.
  const idx = date ? availableDates.indexOf(date) : -1;
  const hasOlder = idx >= 0 && idx < availableDates.length - 1;
  const hasNewer = idx > 0;

  const goOlder = () => {
    if (hasOlder) onChange(availableDates[idx + 1]);
  };
  const goNewer = () => {
    if (hasNewer) onChange(availableDates[idx - 1]);
  };

  const selected = date ? new Date(date + 'T00:00:00') : undefined;
  // 시세 보유 일자만 선택 가능하도록, 보유 목록에 없는 날을 비활성화.
  const dateSet = new Set(availableDates);
  const disableUnlisted =
    availableDates.length > 0 ? (d: Date) => !dateSet.has(toIso(d)) : undefined;

  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goOlder}
          disabled={!hasOlder}
          aria-label="이전 시세일"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        {date ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="시세 날짜 선택"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground tabular-nums transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <span>{dayLabel(date)}</span>
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
                disabled={disableUnlisted}
                onSelect={(d) => {
                  if (d) {
                    onChange(toIso(d));
                    setOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <span className="px-3 text-sm font-semibold text-muted-foreground">날짜 없음</span>
        )}

        <button
          type="button"
          onClick={goNewer}
          disabled={!hasNewer}
          aria-label="다음 시세일"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {meta && <span className="text-[12px] text-muted-foreground">{meta}</span>}
    </div>
  );
}

export {dayLabel};
