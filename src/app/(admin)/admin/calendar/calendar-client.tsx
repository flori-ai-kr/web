'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
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
import {
    ChevronLeft,
    ChevronRight,
    Plus,
} from 'lucide-react';
import {toast} from 'sonner';

import {Button} from '@/components/ui/button';
// [AI 기능 비활성화] import {OcrReservationButton} from '@/components/ai/ocr-reservation-dialog';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

import {
    deleteReservation,
    getReservations,
    updateReservation,
} from '@/lib/actions/reservations';
import {getSchedules} from '@/lib/actions/schedules';
import {completeUnpaidSale, deleteSale, revertUnpaidSale, updateSale} from '@/lib/actions/sales';
import {SalePhotoModal} from '@/components/sales/SalePhotoModal';
import {getSaleIdsWithPhotos} from '@/lib/actions/photo-cards';
import type {PaymentMethod as PaymentMethodType, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';
import {getPaymentMethods, getSaleCategories, getSaleChannels} from '@/lib/actions/sale-settings';
import type {Schedule, Reservation, ReservationStatus} from '@/types/database';
import {useQuickCreate} from '@/hooks/use-quick-create';
import type {CalendarReservation} from './types';
import {ScheduleCard} from './components/ScheduleCard';
import {ReservationCard} from './components/ReservationCard';
import {ScheduleFormDialog} from './components/schedule-form-dialog';
import {ReservationFormDialog} from './components/reservation-form-dialog';
import {useScheduleForm} from './hooks/use-schedule-form';
import {useReservationForm} from './hooks/use-reservation-form';
import {
    DeleteScheduleDialog,
    DeleteReservationDialog,
    DeleteSaleDialog,
    UnpaidPaymentDialog,
} from './components/CalendarDialogs';

export function CalendarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  // viewMode 제거 — 캘린더 항상 표시

  const [dayTab, setDayTab] = useState<'reservation' | 'schedule'>('reservation');
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [saleIdsWithPhotos, setSaleIdsWithPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Sale settings
  const [saleCategories, setSaleCategories] = useState<SaleCategory[]>([]);
  const [saleChannels, setSaleChannels] = useState<SaleChannel[]>([]);
  const [salePaymentMethods, setSalePaymentMethods] = useState<PaymentMethodType[]>([]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CalendarReservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saleDeleteInfo, setSaleDeleteInfo] = useState<{ saleId: string; saleDate?: string } | null>(null);

  // 미수 결제 완료 dialog
  const [unpaidTarget, setUnpaidTarget] = useState<(Reservation & { sale_id: string }) | null>(null);
  const [unpaidPaymentMethod, setUnpaidPaymentMethod] = useState('');
  const [isCompletingUnpaid, setIsCompletingUnpaid] = useState(false);

  // Photo modal
  const [photoModal, setPhotoModal] = useState<{ saleId: string; defaultTitle: string } | null>(null);

  // Calendar events
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const monthStr = format(currentMonth, 'yyyy-MM');

  // selectedDate 변경 시 currentMonth 동기화 + URL 반영
  function selectDate(date: Date) {
    setSelectedDate(date);
    closeReservationForm();
    closeScheduleForm();
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
    // URL에 날짜 반영 (router.back() 시 복원용, replace로 히스토리 오염 방지)
    router.replace(`/admin/calendar?date=${format(date, 'yyyy-MM-dd')}`, { scroll: false });
  }

  const fetchPhotoStatus = useCallback(async (reservationsData: typeof reservations) => {
    const saleIds = reservationsData.map(r => r.sale_id).filter(Boolean) as string[];
    if (saleIds.length === 0) { setSaleIdsWithPhotos(new Set()); return; }
    try {
      const ids = await getSaleIdsWithPhotos([...new Set(saleIds)]);
      setSaleIdsWithPhotos(new Set(ids));
    } catch {
      // 사진 상태 조회 실패는 무시
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reservationsData, schedulesData] = await Promise.all([
        getReservations(monthStr),
        getSchedules(monthStr),
      ]);
      setReservations(reservationsData);
      setSchedules(schedulesData);
      fetchPhotoStatus(reservationsData);
    } catch {
      toast.error('데이터를 불러오지 못했습니다');
    }
    setIsLoading(false);
  }, [monthStr, fetchPhotoStatus]);

  // 로딩 표시 없이 데이터만 조용히 갱신 (토글 등 간단한 변경용)
  const refreshData = useCallback(async () => {
    try {
      const [reservationsData, schedulesData] = await Promise.all([
        getReservations(monthStr),
        getSchedules(monthStr),
      ]);
      setReservations(reservationsData);
      setSchedules(schedulesData);
      fetchPhotoStatus(reservationsData);
    } catch {
      // 조용히 실패
    }
  }, [monthStr, fetchPhotoStatus]);

  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, [fetchData]);

  // 일정(캘린더 이벤트) 폼 — 상태/제출/삭제 로직은 훅이 보유
  const scheduleFormController = useScheduleForm({ onSaved: fetchData });
  const {
    closeScheduleForm,
    openCreateSchedule,
    startEditSchedule,
    setDeleteScheduleTarget,
    deleteScheduleTarget,
    handleDeleteSchedule,
  } = scheduleFormController;

  // 카테고리/결제방식 1회 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [cats, payments, chs] = await Promise.all([getSaleCategories(), getPaymentMethods(), getSaleChannels()]);
        setSaleCategories(cats);
        setSalePaymentMethods(payments);
        setSaleChannels(chs);
      } catch { /* ignore */ }
    };
    loadSettings();
  }, []);

  // 제작 완료 토글: pending ↔ confirmed
  async function toggleCompletion(reservation: Reservation) {
    const newStatus: ReservationStatus = reservation.status === 'pending' ? 'confirmed' : 'pending';
    try {
      await updateReservation(reservation.id, {
        status: newStatus,
        // 제작 취소 시 픽업도 초기화
        ...(newStatus === 'pending' && { pickup_completed: false }),
      });
      toast.success(newStatus === 'confirmed' ? '제작이 완료되었습니다' : '제작 완료가 취소되었습니다');
      refreshData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다');
    }
  }

  // 픽업 완료 토글: confirmed ↔ completed
  async function togglePickup(reservation: Reservation & { sale_is_unpaid?: boolean; sale_payment_method?: string }) {
    if (reservation.status === 'pending') return; // 제작 전에는 픽업 불가
    const isCompleting = reservation.status === 'confirmed';

    // 미수건 픽업 완료 시 → 결제방식 선택 팝업
    if (isCompleting && reservation.sale_id && reservation.sale_is_unpaid) {
      setUnpaidTarget(reservation as Reservation & { sale_id: string });
      setUnpaidPaymentMethod('');
      return;
    }

    try {
      // 미수건 픽업 취소 시 → payment_method를 unpaid로 되돌림
      if (!isCompleting && reservation.sale_id && reservation.sale_is_unpaid) {
        await revertUnpaidSale(reservation.sale_id);
      }

      await updateReservation(reservation.id, {
        status: isCompleting ? 'completed' : 'confirmed',
        pickup_completed: isCompleting,
      });
      toast.success(isCompleting ? '픽업 완료 처리되었습니다' : '픽업 완료가 취소되었습니다');
      refreshData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다');
    }
  }

  // 미수 결제 완료 처리
  async function handleUnpaidComplete() {
    if (!unpaidTarget || !unpaidPaymentMethod) return;
    setIsCompletingUnpaid(true);
    try {
      await completeUnpaidSale(unpaidTarget.sale_id, unpaidPaymentMethod);
      await updateReservation(unpaidTarget.id, {
        status: 'completed',
        pickup_completed: true,
      });
      toast.success('픽업 완료 및 결제가 처리되었습니다');
      setUnpaidTarget(null);
      refreshData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '결제 처리에 실패했습니다');
    }
    setIsCompletingUnpaid(false);
  }

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

  // Group reservations by date
  const reservationsByDate = useMemo(() => {
    const map = new Map<string, (Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number; sale_is_unpaid?: boolean; sale_payment_method?: string; sale_reservation_channel?: string })[]>();
    for (const r of reservations) {
      const key = r.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [reservations]);

  // Reservations for selected date
  const selectedDateReservations = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return reservationsByDate.get(key) || [];
  }, [selectedDate, reservationsByDate]);

  // Compute event lanes for consistent vertical positioning across days
  const { schedulesByDate, scheduleLaneMap } = useMemo(() => {
    // 1. 레인 할당: 시작일 빠른 순 → 기간 긴 순 → id 순
    const sorted = [...schedules].sort((a, b) => {
      const startCmp = a.start_date.localeCompare(b.start_date);
      if (startCmp !== 0) return startCmp;
      const endCmp = b.end_date.localeCompare(a.end_date);
      if (endCmp !== 0) return endCmp;
      return String(a.id).localeCompare(String(b.id));
    });

    const laneMap = new Map<string, number>();
    const occupied: { start: string; end: string; lane: number }[] = [];

    for (const schedule of sorted) {
      let lane = 0;
      while (occupied.some(o => o.lane === lane && o.start <= schedule.end_date && o.end >= schedule.start_date)) {
        lane++;
      }
      laneMap.set(schedule.id, lane);
      occupied.push({ start: schedule.start_date, end: schedule.end_date, lane });
    }

    // 2. 날짜별 일정 맵 (멀티데이 일정 펼치기)
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      let current = new Date(schedule.start_date);
      const end = new Date(schedule.end_date);
      while (current <= end) {
        const key = format(current, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(schedule);
        current = addDays(current, 1);
      }
    }
    // 레인 순서로 정렬
    for (const events of map.values()) {
      events.sort((a, b) => (laneMap.get(a.id) ?? 0) - (laneMap.get(b.id) ?? 0));
    }

    return { schedulesByDate: map, scheduleLaneMap: laneMap };
  }, [schedules]);

  // Events overlapping selected date
  const selectedDateSchedules = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return schedulesByDate.get(key) || [];
  }, [selectedDate, schedulesByDate]);

  // sale_id로 같은 매출의 모든 예약 찾기 (다른 날짜 포함)
  const siblingReservations = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (r.sale_id) {
        if (!map.has(r.sale_id)) map.set(r.sale_id, []);
        map.get(r.sale_id)!.push(r);
      }
    }
    return map;
  }, [reservations]);

  // 예약 폼 — 상태/제출/수정 로직은 훅이 보유
  const reservationFormController = useReservationForm({
    selectedDate,
    siblingReservations,
    onSaved: fetchData,
  });
  const {
    closeReservationForm,
    openCreateReservation,
    startEdit,
  } = reservationFormController;

  // ?new=1 — 빠른 등록(대시보드)에서 진입 시 예약 등록 폼을 즉시 오픈 (오늘 날짜 프리필).
  // selectedDate 초기값이 이미 new Date() 이므로 오늘 날짜는 자동으로 채워진다.
  useQuickCreate(() => {
    openCreateReservation(format(new Date(), 'yyyy-MM-dd'));
    closeScheduleForm();
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const saleId = deleteTarget.sale_id;
      const saleDate = deleteTarget.sale_date;
      await deleteReservation(deleteTarget.id);

      // 매출 연동 처리
      if (saleId) {
        const siblings = (siblingReservations.get(saleId) || []).filter(r => r.id !== deleteTarget.id);
        if (siblings.length === 0) {
          // 마지막 픽업 → 매출 삭제 확인
          setSaleDeleteInfo({ saleId, saleDate });
          setDeleteTarget(null);
          fetchData();
          setIsDeleting(false);
          return;
        } else {
          // 남은 픽업이 있으면 매출 금액 차감
          const newTotal = siblings.reduce((sum, r) => sum + (r.amount || 0), 0);
          const saleFormData = new FormData();
          saleFormData.set('amount', String(newTotal));
          await updateSale(saleId, saleFormData);
        }
      }

      toast.success('예약이 삭제되었습니다');
      setDeleteTarget(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
    setIsDeleting(false);
  }

  async function handleSaleDelete() {
    if (!saleDeleteInfo) return;
    setIsDeleting(true);
    try {
      await deleteSale(saleDeleteInfo.saleId);
      toast.success('예약과 매출이 삭제되었습니다');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '매출 삭제 실패');
    }
    setSaleDeleteInfo(null);
    setIsDeleting(false);
    fetchData();
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          {/* [AI 기능 비활성화] OCR→예약 (이미지에서 예약 초안 추출 → 확인 후 생성)
          <div className="mt-2.5">
            <OcrReservationButton onCreated={() => router.refresh()} />
          </div> */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        {/* 캘린더(월간) — 모바일은 토글, lg+는 항상 좌측 */}
        <div className="min-w-0">
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
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    aria-label="이전 달"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      selectDate(new Date());
                    }}
                  >
                    오늘
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
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
                        onClick={() => selectDate(day)}
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
                        {/* Event bars (lane-based positioning) — 그대로 유지 */}
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
                                    className={cn(
                                      'text-[10px] leading-tight px-1 py-px font-medium -mx-1',
                                      isStart && !isSingle ? 'whitespace-nowrap overflow-visible relative z-10' : 'truncate',
                                    )}
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
        </div>

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
                    onClick={() => selectDate(addDays(selectedDate, -1))}
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
                    onClick={() => selectDate(addDays(selectedDate, 1))}
                    aria-label="다음 날"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" onClick={() => {
                    openCreateReservation(format(selectedDate, 'yyyy-MM-dd'));
                    closeScheduleForm();
                  }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    예약
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    openCreateSchedule(format(selectedDate, 'yyyy-MM-dd'));
                    closeReservationForm();
                  }}>
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

          {/* 일정 Form (modal) */}
          <ScheduleFormDialog form={scheduleFormController} />

          {/* Reservation Form (modal) */}
          <ReservationFormDialog
            form={reservationFormController}
            saleCategories={saleCategories}
            saleChannels={saleChannels}
            salePaymentMethods={salePaymentMethods}
          />

          {/* 탭 콘텐츠 */}
          {dayTab === 'schedule' ? (
            selectedDateSchedules.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDateSchedules.map((s) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    onEdit={(sched) => {
                      startEditSchedule(sched);
                      // 일정 폼 열 때 예약 폼은 닫기
                      closeReservationForm();
                    }}
                    onDelete={setDeleteScheduleTarget}
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
                  onPhotoClick={(saleId, defaultTitle) => setPhotoModal({ saleId, defaultTitle })}
                  onEdit={startEdit}
                  onDelete={setDeleteTarget}
                  onToggleCompletion={toggleCompletion}
                  onTogglePickup={togglePickup}
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
      </div>

      {/* Photo modal */}
      {photoModal && (
        <SalePhotoModal
          open={!!photoModal}
          onClose={() => setPhotoModal(null)}
          saleId={photoModal.saleId}
          defaultTitle={photoModal.defaultTitle}
          onSuccess={() => { refreshData(); }}
        />
      )}

      {/* Delete reservation confirmation */}
      <DeleteReservationDialog
        open={!!deleteTarget}
        reservationTitle={deleteTarget?.title}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Sale delete confirmation (after reservation deleted) */}
      <DeleteSaleDialog
        open={!!saleDeleteInfo}
        saleDate={saleDeleteInfo?.saleDate}
        isDeleting={isDeleting}
        onConfirm={handleSaleDelete}
        onDismiss={() => {
          toast.success('예약이 삭제되었습니다');
          setSaleDeleteInfo(null);
        }}
      />

      {/* Delete schedule confirmation */}
      <DeleteScheduleDialog
        open={!!deleteScheduleTarget}
        scheduleTitle={deleteScheduleTarget?.title}
        isDeleting={scheduleFormController.isDeleting}
        onConfirm={handleDeleteSchedule}
        onClose={() => setDeleteScheduleTarget(null)}
      />

      {/* 미수 결제 완료 dialog */}
      <UnpaidPaymentDialog
        open={!!unpaidTarget}
        paymentMethods={salePaymentMethods}
        selectedMethod={unpaidPaymentMethod}
        onSelectMethod={setUnpaidPaymentMethod}
        isCompleting={isCompletingUnpaid}
        onConfirm={handleUnpaidComplete}
        onClose={() => setUnpaidTarget(null)}
      />
    </div>
  );
}
