'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2, Loader2, ExternalLink, BellRing, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { CustomerAutocomplete } from '@/components/sales/CustomerAutocomplete';

import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  convertReservationToSale,
} from '@/lib/actions/reservations';
import { checkPhoneDuplicate } from '@/lib/actions';
import { getSaleCategories, getPaymentMethods } from '@/lib/actions/sale-settings';
import type { SaleCategory, PaymentMethod as PaymentMethodType } from '@/lib/actions/sale-settings';
import type { Reservation, ReservationStatus } from '@/types/database';
import { CHANNEL_LABELS } from '@/lib/constants';

function formatCurrency(amount: number): string {
  if (!amount) return '';
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function TimeSelect({ value, onChange, className, disabled }: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [h, m] = value ? value.split(':') : ['', ''];
  return (
    <div className={cn('flex gap-1 items-center', className)}>
      <select
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m || '00'}`)}
        disabled={disabled}
        className="flex-1 h-8 appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_0.25rem_center] bg-no-repeat pl-2 pr-6 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
        aria-label="시"
      >
        <option value="">시</option>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span className="text-muted-foreground text-sm">:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h || '00'}:${e.target.value}`)}
        disabled={disabled}
        className="flex-1 h-8 appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_0.25rem_center] bg-no-repeat pl-2 pr-6 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
        aria-label="분"
      >
        <option value="">분</option>
        {MINUTES_5.map((min) => (
          <option key={min} value={min}>{min}</option>
        ))}
      </select>
    </div>
  );
}

export function CalendarClient() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'month' | '5day'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    customer_name: '',
    customer_phone: '',
    time: '',
    description: '',
    estimated_amount: '',
    product_category: '',
    payment_method: '',
    reservation_channel: 'other',
    reminder_date: '',
    reminder_time: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sale settings
  const [saleCategories, setSaleCategories] = useState<SaleCategory[]>([]);
  const [salePaymentMethods, setSalePaymentMethods] = useState<PaymentMethodType[]>([]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const monthStr = format(currentMonth, 'yyyy-MM');

  // 5일 뷰 days
  const fiveDayDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(subDays(selectedDate, 2), i));
  }, [selectedDate]);

  // 5일 뷰에서 selectedDate 변경 시 currentMonth 동기화
  useEffect(() => {
    if (viewMode === '5day' && !isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(selectedDate);
    }
  }, [viewMode, selectedDate, currentMonth]);

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReservations(monthStr);
      setReservations(data);
    } catch {
      toast.error('예약 목록을 불러오지 못했습니다');
    }
    setIsLoading(false);
  }, [monthStr]);

  useEffect(() => {
    const load = async () => { await fetchReservations(); };
    load();
  }, [fetchReservations]);

  // 카테고리/결제방식 1회 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [cats, payments] = await Promise.all([getSaleCategories(), getPaymentMethods()]);
        setSaleCategories(cats);
        setSalePaymentMethods(payments);
      } catch { /* ignore */ }
    };
    loadSettings();
  }, []);

  // 제작 완료 토글
  async function toggleCompletion(reservation: Reservation) {
    const newStatus: ReservationStatus = reservation.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateReservation(reservation.id, {
        date: reservation.date,
        time: reservation.time || '',
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone || '',
        title: reservation.title,
        description: reservation.description || '',
        estimated_amount: reservation.estimated_amount,
        status: newStatus,
        reminder_at: reservation.reminder_at,
      });
      toast.success(newStatus === 'completed' ? '제작이 완료되었습니다' : '제작 완료가 취소되었습니다');
      fetchReservations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다');
    }
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
    const map = new Map<string, Reservation[]>();
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

  // Count reservations for current month
  const currentMonthReservationCount = useMemo(() => {
    return reservations.length;
  }, [reservations]);

  // 제작 필요 수 (status !== 'completed')
  const pendingCount = useMemo(() => {
    return reservations.filter(r => r.status !== 'completed').length;
  }, [reservations]);

  function resetForm() {
    setFormData({
      title: '',
      customer_name: '',
      customer_phone: '',
      time: '',
      description: '',
      estimated_amount: '',
      product_category: '',
      payment_method: '',
      reservation_channel: 'other',
      reminder_date: '',
      reminder_time: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(reservation: Reservation) {
    setEditingId(reservation.id);
    setFormData({
      title: reservation.title,
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone || '',
      time: reservation.time?.slice(0, 5) || '',
      description: reservation.description || '',
      estimated_amount: reservation.estimated_amount ? String(reservation.estimated_amount) : '',
      product_category: '',
      payment_method: '',
      reservation_channel: 'other',
      reminder_date: reservation.reminder_at ? reservation.reminder_at.slice(0, 10) : '',
      reminder_time: reservation.reminder_at ? reservation.reminder_at.slice(11, 16) : '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    if (!formData.customer_name.trim()) {
      toast.error('고객명을 입력해주세요');
      return;
    }
    if (!formData.time) {
      toast.error('시간을 입력해주세요');
      return;
    }
    if (!formData.customer_phone.trim()) {
      toast.error('전화번호를 입력해주세요');
      return;
    }
    if (!formData.estimated_amount || parseInt(formData.estimated_amount) <= 0) {
      toast.error('예상 금액을 입력해주세요');
      return;
    }
    if (!editingId && !formData.product_category) {
      toast.error('상품 카테고리를 선택해주세요');
      return;
    }
    if (!editingId && !formData.payment_method) {
      toast.error('결제방식을 선택해주세요');
      return;
    }

    setIsSaving(true);

    // 전화번호 중복 체크 (다른 고객의 번호인지 확인)
    try {
      const existing = await checkPhoneDuplicate(formData.customer_phone);
      if (existing && existing.name !== formData.customer_name.trim()) {
        toast.error(`이 전화번호는 "${existing.name}" 고객에게 등록되어 있습니다`);
        setIsSaving(false);
        return;
      }
    } catch {
      // 중복 체크 실패 시 계속 진행
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // 리마인더 날짜+시간 → ISO 8601 (KST +09:00)
    let reminderAt: string | null = null;
    if (formData.reminder_date) {
      const time = formData.reminder_time || '08:00';
      reminderAt = `${formData.reminder_date}T${time}:00+09:00`;
    }

    try {
      if (editingId) {
        await updateReservation(editingId, {
          date: dateStr,
          time: formData.time || null,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          title: formData.title,
          description: formData.description || null,
          estimated_amount: formData.estimated_amount ? parseInt(formData.estimated_amount) : 0,
          status: 'pending',
          reminder_at: reminderAt,
        });
        toast.success('예약이 수정되었습니다');
      } else {
        // 1. 예약 생성
        const reservation = await createReservation({
          date: dateStr,
          time: formData.time || undefined,
          customer_name: formData.customer_name,
          title: formData.title,
          description: formData.description || undefined,
          estimated_amount: formData.estimated_amount ? parseInt(formData.estimated_amount) : undefined,
          customer_phone: formData.customer_phone || undefined,
          reminder_at: reminderAt,
        });

        // 2. 매출 자동 생성
        const saleFormData = new FormData();
        saleFormData.set('date', dateStr);
        saleFormData.set('product_category', formData.product_category);
        saleFormData.set('amount', formData.estimated_amount);
        saleFormData.set('payment_method', formData.payment_method);
        saleFormData.set('reservation_channel', formData.reservation_channel);
        saleFormData.set('customer_name', formData.customer_name);
        saleFormData.set('customer_phone', formData.customer_phone);
        saleFormData.set('note', formData.description || '');

        await convertReservationToSale(reservation.id, saleFormData);
        toast.success('예약과 매출이 등록되었습니다');
      }
      resetForm();
      fetchReservations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (editingId ? '수정 실패' : '등록 실패'));
    }
    setIsSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteReservation(deleteTarget.id);
      toast.success('예약이 삭제되었습니다');
      setDeleteTarget(null);
      fetchReservations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
    setIsDeleting(false);
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">캘린더</h1>
          <p className="text-sm text-muted-foreground mt-1">날짜를 눌러서 예약을 추가하고, 상태를 관리할 수 있어요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Calendar */}
        <Card className="lg:sticky lg:top-4">
          <CardContent className="p-4">
            {/* Navigation + View toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {viewMode === 'month'
                  ? format(currentMonth, 'yyyy년 M월', { locale: ko })
                  : `${format(fiveDayDays[0], 'M월 d일', { locale: ko })} - ${format(fiveDayDays[4], 'd일', { locale: ko })}`
                }
              </h2>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex bg-muted rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('month')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-md transition-colors',
                      viewMode === 'month' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    월간
                  </button>
                  <button
                    onClick={() => setViewMode('5day')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-md transition-colors',
                      viewMode === '5day' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    5일
                  </button>
                </div>
                {/* Navigation */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (viewMode === 'month') {
                        setCurrentMonth(subMonths(currentMonth, 1));
                      } else {
                        setSelectedDate(subDays(selectedDate, 1));
                      }
                    }}
                    aria-label={viewMode === 'month' ? '이전 달' : '이전 날'}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(new Date());
                    }}
                  >
                    오늘
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (viewMode === 'month') {
                        setCurrentMonth(addMonths(currentMonth, 1));
                      } else {
                        setSelectedDate(addDays(selectedDate, 1));
                      }
                    }}
                    aria-label={viewMode === 'month' ? '다음 달' : '다음 날'}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {viewMode === 'month' ? (
              <>
                {/* Week day headers */}
                <div className="grid grid-cols-7">
                  {weekDays.map((day, i) => (
                    <div key={day} className={cn(
                      'text-center text-xs font-medium py-1.5',
                      i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-muted-foreground'
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
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const dayOfWeek = day.getDay();

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(day)}
                        aria-label={`${format(day, 'M월 d일', { locale: ko })}${dayReservations.length > 0 ? ` 예약 ${dayReservations.length}건` : ''}`}
                        className={cn(
                          'relative min-h-[120px] sm:min-h-[130px] p-1 border-b border-r border-border text-left transition-colors hover:bg-muted/50 [&:nth-child(7n)]:border-r-0 flex flex-col',
                          !isCurrentMonth && 'opacity-30',
                          isSelected && 'bg-brand-muted/50 hover:bg-brand-muted/50',
                        )}
                      >
                        <span className={cn(
                          'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 shrink-0',
                          isTodayDate && 'bg-brand text-brand-foreground font-semibold',
                          !isTodayDate && dayOfWeek === 0 && 'text-red-400',
                          !isTodayDate && dayOfWeek === 6 && 'text-blue-400',
                          !isTodayDate && isSelected && 'font-semibold text-foreground',
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayReservations.length > 0 && (() => {
                          const dayPendingCount = dayReservations.filter(r => r.status !== 'completed').length;
                          return (
                          <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                            {dayReservations.slice(0, 5).map((r) => (
                              <div
                                key={r.id}
                                className={cn(
                                  'text-[10px] leading-tight px-1 py-0.5 rounded truncate',
                                  r.status === 'completed'
                                    ? 'bg-sage-muted text-sage line-through'
                                    : 'bg-brand/15 text-brand'
                                )}
                              >
                                {r.time ? r.time.slice(0, 5) : ''}{r.time && r.customer_name ? ' ' : ''}{r.customer_name || r.title}
                              </div>
                            ))}
                            {dayReservations.length > 5 && (
                              <span className="text-[10px] text-muted-foreground leading-none px-1">+{dayReservations.length - 5}건</span>
                            )}
                            {dayPendingCount > 0 && (
                              <span className="text-[10px] font-medium text-brand mt-auto px-1">{dayPendingCount}개 제작</span>
                            )}
                          </div>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* 5-day view headers */}
                <div className="grid grid-cols-5">
                  {fiveDayDays.map((day) => {
                    const dayOfWeek = day.getDay();
                    return (
                      <div key={format(day, 'yyyy-MM-dd')} className={cn(
                        'text-center text-xs font-medium py-1.5',
                        dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-muted-foreground'
                      )}>
                        {weekDays[dayOfWeek]}
                      </div>
                    );
                  })}
                </div>

                {/* 5-day grid */}
                <div className="grid grid-cols-5 border-t border-border">
                  {fiveDayDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayReservations = reservationsByDate.get(dateKey) || [];
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const dayOfWeek = day.getDay();
                    const dayPendingCount = dayReservations.filter(r => r.status !== 'completed').length;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(day)}
                        aria-label={`${format(day, 'M월 d일', { locale: ko })}${dayReservations.length > 0 ? ` 예약 ${dayReservations.length}건` : ''}`}
                        className={cn(
                          'relative min-h-[200px] p-2 border-b border-r border-border text-left transition-colors hover:bg-muted/50 [&:nth-child(5n)]:border-r-0 flex flex-col',
                          isSelected && 'bg-brand-muted/50 hover:bg-brand-muted/50',
                        )}
                      >
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1 shrink-0',
                          isTodayDate && 'bg-brand text-brand-foreground font-semibold',
                          !isTodayDate && dayOfWeek === 0 && 'text-red-400',
                          !isTodayDate && dayOfWeek === 6 && 'text-blue-400',
                          !isTodayDate && isSelected && 'font-semibold text-foreground',
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayReservations.length > 0 ? (
                          <div className="flex flex-col gap-1 overflow-hidden flex-1">
                            {dayReservations.map((r) => (
                              <div
                                key={r.id}
                                className={cn(
                                  'text-xs leading-snug px-1.5 py-1 rounded',
                                  r.status === 'completed'
                                    ? 'bg-sage-muted text-sage line-through'
                                    : 'bg-brand/15 text-brand'
                                )}
                              >
                                <div className="font-medium truncate">
                                  {r.time ? r.time.slice(0, 5) : ''}{r.time && r.customer_name ? ' ' : ''}{r.customer_name || r.title}
                                </div>
                                {r.title && r.customer_name && (
                                  <div className="truncate opacity-80">{r.title}</div>
                                )}
                                {r.estimated_amount > 0 && (
                                  <div className="opacity-70">{formatCurrency(r.estimated_amount)}</div>
                                )}
                              </div>
                            ))}
                            {dayPendingCount > 0 && (
                              <span className="text-xs font-medium text-brand mt-auto px-1">{dayPendingCount}개 제작</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 mt-2">예약 없음</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* Reservation count + pending */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground">
                이번 달 예약 {currentMonthReservationCount}건
              </p>
              {pendingCount > 0 && (
                <span className="text-sm font-medium text-brand">
                  {pendingCount}개 제작 필요
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {/* Selected date header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedDateReservations.length > 0
                      ? `${selectedDateReservations.length}건의 예약`
                      : '예약 없음'}
                  </p>
                </div>
                <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          {showForm && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">{editingId ? '예약 수정' : '새 예약'}</p>
                  <Button variant="ghost" size="icon-sm" onClick={resetForm} aria-label="폼 닫기">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">제목 <span className="text-brand">*</span></Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="프로포즈 꽃다발"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">고객명 <span className="text-brand">*</span></Label>
                      <CustomerAutocomplete
                        value={formData.customer_name}
                        onChange={(name, _customerId, phone) => {
                          setFormData({
                            ...formData,
                            customer_name: name,
                            customer_phone: phone || formData.customer_phone,
                          });
                        }}
                        placeholder="홍길동"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">시간 <span className="text-brand">*</span></Label>
                      <TimeSelect
                        value={formData.time}
                        onChange={(val) => setFormData({ ...formData, time: val })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">전화번호 <span className="text-brand">*</span></Label>
                      <Input
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: formatPhoneNumber(e.target.value) })}
                        placeholder="010-0000-0000"
                        className="h-8 text-sm"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">예상 금액 <span className="text-brand">*</span></Label>
                      <Input
                        type="number"
                        step={10000}
                        value={formData.estimated_amount}
                        onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                        placeholder="50000"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  {!editingId && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">상품 카테고리 <span className="text-brand">*</span></Label>
                          <select
                            value={formData.product_category}
                            onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                            className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                            aria-label="상품 카테고리"
                          >
                            <option value="">선택</option>
                            {saleCategories.map((cat) => (
                              <option key={cat.id} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">결제방식 <span className="text-brand">*</span></Label>
                          <select
                            value={formData.payment_method}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                            aria-label="결제방식"
                          >
                            <option value="">선택</option>
                            {salePaymentMethods.map((pm) => (
                              <option key={pm.id} value={pm.value}>{pm.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">예약 채널</Label>
                        <select
                          value={formData.reservation_channel}
                          onChange={(e) => setFormData({ ...formData, reservation_channel: e.target.value })}
                          className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                          aria-label="예약 채널"
                        >
                          {Object.entries(CHANNEL_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      <BellRing className="w-3 h-3 inline mr-1" />
                      리마인더 알림
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={formData.reminder_date}
                        onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                        className="h-8 text-sm"
                        aria-label="리마인더 알림 날짜"
                      />
                      <TimeSelect
                        value={formData.reminder_time}
                        onChange={(val) => setFormData({ ...formData, reminder_time: val })}
                        disabled={!formData.reminder_date}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formData.reminder_date
                        ? `${formData.reminder_date} ${formData.reminder_time || '08:00'}에 푸시 알림`
                        : '날짜를 선택하면 해당 시간에 푸시 알림을 받아요 (기본 오전 8시)'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">메모</Label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="메모를 입력하세요"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
                      aria-label="메모"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="flex-1 h-9" onClick={resetForm}>
                      취소
                    </Button>
                    <Button type="submit" size="sm" className="flex-1 h-9" disabled={isSaving}>
                      {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      {editingId ? '수정' : '등록'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Reservation list */}
          {isLoading ? (
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
              {selectedDateReservations.map((r) => (
                <Card key={r.id} className="group">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {r.time && (
                            <span className="text-xs text-muted-foreground">{r.time.slice(0, 5)}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-1 truncate">{r.title}</p>
                        {r.customer_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.customer_name}
                            {r.customer_phone && ` · ${r.customer_phone}`}
                          </p>
                        )}
                        {r.estimated_amount > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(r.estimated_amount)}</p>
                        )}
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                        )}
                        {r.reminder_at && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <BellRing className="w-3 h-3" />
                            {r.reminder_at.slice(0, 10)} {r.reminder_at.slice(11, 16)} 알림
                          </p>
                        )}

                        {/* 매출 확인 링크 */}
                        {r.sale_id && (
                          <button
                            className="mt-2 text-xs text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/sales?saleId=${r.sale_id}`);
                            }}
                            aria-label="연결된 매출 확인"
                          >
                            매출 확인 <ExternalLink className="w-3 h-3" />
                          </button>
                        )}

                        {/* 제작 완료 토글 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompletion(r);
                          }}
                          className={cn(
                            'mt-2 text-xs py-1 px-2 rounded transition-colors inline-flex items-center gap-1',
                            r.status === 'completed'
                              ? 'bg-brand text-brand-foreground'
                              : 'border border-input text-muted-foreground hover:bg-muted'
                          )}
                          aria-label={r.status === 'completed' ? '제작 완료 취소' : '제작 완료로 변경'}
                        >
                          {r.status === 'completed' && <Check className="w-3 h-3" />}
                          제작 완료
                        </button>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => startEdit(r)} aria-label="수정">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(r)} aria-label="삭제">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !showForm ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              이 날짜에 예약이 없습니다
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.title}&quot; 예약을 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
