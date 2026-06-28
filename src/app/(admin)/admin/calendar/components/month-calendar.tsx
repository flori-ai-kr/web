'use client';

import {useMemo} from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {ChevronLeft, ChevronRight} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import type {Schedule} from '@/types/database';
import type {CalendarReservation} from '../types';

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 월간 캘린더 카드(네비게이션 + 요일 헤더 + 날짜 그리드). 상태는 부모(CalendarClient)가 보유.
 */
export function MonthCalendar({
  currentMonth,
  selectedDate,
  reservationsByDate,
  schedulesByDate,
  scheduleLaneMap,
  onMonthChange,
  onSelectDate,
}: {
  currentMonth: Date;
  selectedDate: Date;
  reservationsByDate: Map<string, CalendarReservation[]>;
  schedulesByDate: Map<string, Schedule[]>;
  scheduleLaneMap: Map<string, number>;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: Date) => void;
}) {
  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  return (
    <Card className="-mx-8 sm:mx-0 rounded-none sm:rounded-lg border-x-0 sm:border-x lg:sticky lg:top-4">
      <CardContent className="p-2 sm:p-4">
        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-sans text-base min-[450px]:text-lg font-semibold text-foreground whitespace-nowrap">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <div className="flex items-center gap-1 min-[450px]:gap-2">
            {/* Navigation */}
            <div className="flex items-center gap-0.5 min-[450px]:gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2"
                onClick={() => {
                  onMonthChange(new Date());
                  onSelectDate(new Date());
                }}
              >
                오늘
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {(
          <>
            {/* Week day headers */}
            <div className="grid grid-cols-7">
              {weekDays.map((day, i) => (
                <div key={day} className={cn(
                  'text-center text-xs font-medium py-1.5',
                  i === 0 ? 'text-danger' : i === 6 ? 'text-info' : 'text-muted-foreground'
                )}>
                  {day}
                </div>
              ))}
            </div>

            {/* Month calendar grid */}
            <div className="grid grid-cols-7 border-t border-border">
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayReservations = reservationsByDate.get(dateKey) || [];
                const daySchedules = schedulesByDate.get(dateKey) || [];
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const dayOfWeek = day.getDay();

                return (
                  <button
                    key={dateKey}
                    onClick={() => onSelectDate(day)}
                    aria-label={`${format(day, 'M월 d일', { locale: ko })}${dayReservations.length > 0 ? ` 예약 ${dayReservations.length}건` : ''}${daySchedules.length > 0 ? ` 일정 ${daySchedules.length}건` : ''}`}
                    className={cn(
                      'relative min-h-[88px] sm:min-h-[130px] p-1 border-b border-r border-border text-left transition-colors hover:bg-muted/50 [&:nth-child(7n)]:border-r-0 flex flex-col overflow-visible',
                      !isCurrentMonth && 'opacity-30',
                      isSelected && 'bg-brand-muted/50 hover:bg-brand-muted/50',
                    )}
                  >
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 shrink-0',
                      isTodayDate && 'bg-brand text-brand-foreground font-semibold',
                      !isTodayDate && dayOfWeek === 0 && 'text-danger',
                      !isTodayDate && dayOfWeek === 6 && 'text-info',
                      !isTodayDate && isSelected && 'font-semibold text-foreground',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {/* 일정 막대 — lane 기반 스패닝(다일 일정은 1줄로 죽 이어지고, 겹치면 아래 lane으로).
                        제목은 시작일에만(truncate — 옆 칸으로 삐져나가지 않음), 이어지는 날은 nbsp로 막대만 유지.
                        ※ #25 원형 복원 + overflow-visible(삐져나옴) 제거 */}
                    {daySchedules.length > 0 && (() => {
                      const maxLane = Math.max(...daySchedules.map(e => scheduleLaneMap.get(e.id) ?? 0));
                      const lanes: (Schedule | null)[] = Array(maxLane + 1).fill(null);
                      for (const s of daySchedules) {
                        const lane = scheduleLaneMap.get(s.id) ?? 0;
                        lanes[lane] = s;
                      }
                      return (
                        <div className="flex flex-col gap-px mb-0.5">
                          {lanes.map((s, lane) => {
                            if (!s) {
                              return <div key={`spacer-${lane}`} className="text-[10px] leading-tight py-px -mx-1 invisible" aria-hidden="true">{' '}</div>;
                            }
                            const isStart = s.start_date === dateKey;
                            const isEnd = s.end_date === dateKey;
                            const isSingle = isStart && isEnd;
                            return (
                              <div
                                key={s.id}
                                className="text-[10px] leading-tight px-1 py-px font-medium -mx-1 truncate"
                                style={{
                                  backgroundColor: `${s.color}30`,
                                  color: s.color,
                                  borderRadius: isSingle ? '3px' : isStart ? '3px 0 0 3px' : isEnd ? '0 3px 3px 0' : '0',
                                }}
                              >
                                {isStart ? s.title : ' '}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {/* 예약 건수 (바 대신 숫자) */}
                    {dayReservations.length > 0 && (
                      <span className="mt-auto text-[10px] sm:text-xs font-medium text-brand leading-tight px-0.5 pb-0.5">
                        예약 {dayReservations.length}건
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
