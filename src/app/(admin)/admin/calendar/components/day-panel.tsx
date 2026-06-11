'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {addDays, format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {ChevronLeft, ChevronRight, Plus} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import type {SaleCategory} from '@/lib/actions/sale-settings';
import type {Schedule} from '@/types/database';
import type {CalendarReservation} from '../types';
import {ScheduleCard} from './ScheduleCard';
import {ReservationCard} from './ReservationCard';

/**
 * 선택한 날짜 패널(헤더 + 예약/일정 탭 + 탭 콘텐츠). 폼 다이얼로그는 children으로 받는다.
 * 데이터/액션 상태는 부모(CalendarClient)가 보유하고 콜백으로 위임받는다.
 */
export function DayPanel({
  selectedDate,
  onSelectDate,
  onNewReservation,
  onNewSchedule,
  isLoading,
  selectedDateReservations,
  selectedDateSchedules,
  siblingReservations,
  saleIdsWithPhotos,
  saleCategories,
  onPhotoClick,
  onEditReservation,
  onDeleteReservation,
  onToggleCompletion,
  onTogglePickup,
  onEditSchedule,
  onDeleteSchedule,
  children,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onNewReservation: () => void;
  onNewSchedule: () => void;
  isLoading: boolean;
  selectedDateReservations: CalendarReservation[];
  selectedDateSchedules: Schedule[];
  siblingReservations: Map<string, CalendarReservation[]>;
  saleIdsWithPhotos: Set<string>;
  saleCategories: SaleCategory[];
  onPhotoClick: (saleId: string, defaultTitle: string) => void;
  onEditReservation: (r: CalendarReservation) => void;
  onDeleteReservation: (r: CalendarReservation) => void;
  onToggleCompletion: (r: CalendarReservation) => void;
  onTogglePickup: (r: CalendarReservation) => void;
  onEditSchedule: (s: Schedule) => void;
  onDeleteSchedule: (s: Schedule) => void;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [dayTab, setDayTab] = useState<'reservation' | 'schedule'>('reservation');

  return (
    <div className="space-y-3">
      {(
      <>
      {/* Selected date header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDate, -1))}
                aria-label="이전 날"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                {format(selectedDate, 'M/d (EEE)', { locale: ko })}
              </p>
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDate, 1))}
                aria-label="다음 날"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" onClick={onNewReservation}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                예약
              </Button>
              <Button size="sm" variant="outline" onClick={onNewSchedule}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                일정
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 예약/일정 탭 */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setDayTab('reservation')}
          className={cn(
            'flex-1 text-sm font-medium py-2 border-b-2 -mb-px transition-colors',
            dayTab === 'reservation' ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          예약{selectedDateReservations.length > 0 ? ` ${selectedDateReservations.length}` : ''}
        </button>
        <button
          type="button"
          onClick={() => setDayTab('schedule')}
          className={cn(
            'flex-1 text-sm font-medium py-2 border-b-2 -mb-px transition-colors',
            dayTab === 'schedule' ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          일정{selectedDateSchedules.length > 0 ? ` ${selectedDateSchedules.length}` : ''}
        </button>
      </div>
      </>
      )}

      {children}

      {/* 탭 콘텐츠 */}
      {dayTab === 'schedule' ? (
        selectedDateSchedules.length > 0 ? (
          <div className="space-y-1.5">
            {selectedDateSchedules.map((s) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                onEdit={onEditSchedule}
                onDelete={onDeleteSchedule}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">일정이 없습니다</div>
        )
      ) : (isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-10 rounded" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedDateReservations.length > 0 ? (
        <div className="space-y-2">
          {[...selectedDateReservations]
            .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0))
            .map((r, i, arr) => {
              const isFirstDone = r.status === 'completed' && (i === 0 || arr[i - 1].status !== 'completed');
              return (
            <div key={r.id} className="space-y-2">
            {isFirstDone && (
              <div className="flex items-center gap-2 pt-1 pb-0.5">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground shrink-0">픽업 완료</span>
                <div className="flex-1 border-t border-border" />
              </div>
            )}
            <ReservationCard
              r={r}
              siblingReservations={siblingReservations}
              saleIdsWithPhotos={saleIdsWithPhotos}
              saleCategories={saleCategories}
              onCustomerClick={(id) => router.push(`/admin/customers?customerId=${id}`)}
              onSaleClick={(id) => router.push(`/admin/sales?saleId=${id}`)}
              onPhotoClick={onPhotoClick}
              onEdit={onEditReservation}
              onDelete={onDeleteReservation}
              onToggleCompletion={onToggleCompletion}
              onTogglePickup={onTogglePickup}
            />

            </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          예약이 없습니다
        </div>
      ))}
    </div>
  );
}
