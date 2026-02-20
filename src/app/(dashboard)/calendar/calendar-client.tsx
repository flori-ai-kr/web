'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2, Loader2, ExternalLink, BellRing, Check, CalendarDays, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SuggestionInput } from '@/components/ui/suggestion-input';
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
  addPickupToSale,
  getReservationSuggestions,
} from '@/lib/actions/reservations';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/actions/calendar-events';
import { checkPhoneDuplicate, updateSale, deleteSale } from '@/lib/actions';
import { getSaleCategories, getPaymentMethods } from '@/lib/actions/sale-settings';
import type { SaleCategory, PaymentMethod as PaymentMethodType } from '@/lib/actions/sale-settings';
import type { Reservation, ReservationStatus, CalendarEvent } from '@/types/database';
import { CALENDAR_EVENT_COLORS } from '@/types/database';
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
        className="flex-1 h-8 appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_0.25rem_center] bg-no-repeat pl-2 pr-6 text-base md:text-[12px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
        aria-label="시"
      >
        <option value="">시</option>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span className="text-muted-foreground text-[12px]">:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h || '00'}:${e.target.value}`)}
        disabled={disabled}
        className="flex-1 h-8 appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_0.25rem_center] bg-no-repeat pl-2 pr-6 text-base md:text-[12px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
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
  const searchParams = useSearchParams();
  const initialDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [searchParams]);
  const [viewMode, setViewMode] = useState<'month' | '5day'>('month');
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [reservations, setReservations] = useState<(Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  type PickupItem = { id?: string; date: string; time: string; reminder_date: string; reminder_time: string };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    title: '',
    amount: '',
    description: '',
    product_category: '',
    payment_method: '',
    reservation_channel: 'other',
    sale_date: '',
  });
  const [pickups, setPickups] = useState<PickupItem[]>([{ date: '', time: '', reminder_date: '', reminder_time: '' }]);
  const [deletedPickupIds, setDeletedPickupIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<{ titles: string[]; descriptions: string[] }>({ titles: [], descriptions: [] });

  // Sale settings
  const [saleCategories, setSaleCategories] = useState<SaleCategory[]>([]);
  const [salePaymentMethods, setSalePaymentMethods] = useState<PaymentMethodType[]>([]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<(Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number }) | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saleDeleteInfo, setSaleDeleteInfo] = useState<{ saleId: string; saleDate?: string } | null>(null);

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    color: '#f43f5e',
    description: '',
  });
  const [deleteEventTarget, setDeleteEventTarget] = useState<CalendarEvent | null>(null);

  const monthStr = format(currentMonth, 'yyyy-MM');

  // 5일 뷰 days
  const fiveDayDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(subDays(selectedDate, 2), i));
  }, [selectedDate]);

  // selectedDate 변경 시 5일 뷰에서 currentMonth 동기화
  function selectDate(date: Date) {
    setSelectedDate(date);
    setShowForm(false);
    setEditingId(null);
    setShowEventForm(false);
    setEditingEventId(null);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reservationsData, eventsData] = await Promise.all([
        getReservations(monthStr),
        getCalendarEvents(monthStr),
      ]);
      setReservations(reservationsData);
      setCalendarEvents(eventsData);
    } catch {
      toast.error('데이터를 불러오지 못했습니다');
    }
    setIsLoading(false);
  }, [monthStr]);

  // 로딩 표시 없이 데이터만 조용히 갱신 (토글 등 간단한 변경용)
  const refreshData = useCallback(async () => {
    try {
      const [reservationsData, eventsData] = await Promise.all([
        getReservations(monthStr),
        getCalendarEvents(monthStr),
      ]);
      setReservations(reservationsData);
      setCalendarEvents(eventsData);
    } catch {
      // 조용히 실패
    }
  }, [monthStr]);

  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, [fetchData]);

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

  // 폼이 열릴 때 자동완성 후보 로드
  useEffect(() => {
    if (showForm) {
      getReservationSuggestions().then(setSuggestions).catch(() => {});
    }
  }, [showForm]);

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
  async function togglePickup(reservation: Reservation) {
    if (reservation.status === 'pending') return; // 제작 전에는 픽업 불가
    const isCompleting = reservation.status === 'confirmed';
    try {
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
    const map = new Map<string, (Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number })[]>();
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
  const { eventsByDate, eventLaneMap } = useMemo(() => {
    // 1. 레인 할당: 시작일 빠른 순 → 기간 긴 순 → id 순
    const sorted = [...calendarEvents].sort((a, b) => {
      const startCmp = a.start_date.localeCompare(b.start_date);
      if (startCmp !== 0) return startCmp;
      const endCmp = b.end_date.localeCompare(a.end_date);
      if (endCmp !== 0) return endCmp;
      return a.id.localeCompare(b.id);
    });

    const laneMap = new Map<string, number>();
    const occupied: { start: string; end: string; lane: number }[] = [];

    for (const event of sorted) {
      let lane = 0;
      while (occupied.some(o => o.lane === lane && o.start <= event.end_date && o.end >= event.start_date)) {
        lane++;
      }
      laneMap.set(event.id, lane);
      occupied.push({ start: event.start_date, end: event.end_date, lane });
    }

    // 2. 날짜별 이벤트 맵 (멀티데이 이벤트 펼치기)
    const map = new Map<string, CalendarEvent[]>();
    for (const event of calendarEvents) {
      let current = new Date(event.start_date);
      const end = new Date(event.end_date);
      while (current <= end) {
        const key = format(current, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(event);
        current = addDays(current, 1);
      }
    }
    // 레인 순서로 정렬
    for (const events of map.values()) {
      events.sort((a, b) => (laneMap.get(a.id) ?? 0) - (laneMap.get(b.id) ?? 0));
    }

    return { eventsByDate: map, eventLaneMap: laneMap };
  }, [calendarEvents]);

  // Events overlapping selected date
  const selectedDateEvents = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

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

  // Count reservations for current month
  const currentMonthReservationCount = useMemo(() => {
    return reservations.length;
  }, [reservations]);

  // 제작 필요 수 (status !== 'completed')
  const pendingCount = useMemo(() => {
    return reservations.filter(r => r.status !== 'completed').length;
  }, [reservations]);

  function resetForm() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setFormData({
      customer_name: '',
      customer_phone: '',
      title: '',
      amount: '',
      description: '',
      product_category: '',
      payment_method: '',
      reservation_channel: 'other',
      sale_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setPickups([{ date: dateStr, time: '', reminder_date: dateStr, reminder_time: '' }]);
    setDeletedPickupIds([]);
    setEditingId(null);
    setEditingSaleId(null);
    setShowForm(false);
  }

  function startEdit(reservation: Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number }) {
    const saleId = reservation.sale_id;
    setEditingId(reservation.id);
    setEditingSaleId(saleId || null);

    // 같은 매출의 모든 픽업을 로드
    const allPickups: PickupItem[] = [];
    let totalAmount = 0;
    if (saleId) {
      const siblings = siblingReservations.get(saleId) || [];
      for (const s of siblings) {
        allPickups.push({
          id: s.id,
          date: s.date,
          time: s.time?.slice(0, 5) || '',
          reminder_date: s.reminder_at ? format(new Date(s.reminder_at), 'yyyy-MM-dd') : '',
          reminder_time: s.reminder_at ? format(new Date(s.reminder_at), 'HH:mm') : '',
        });
        totalAmount += s.amount || 0;
      }
    }
    if (allPickups.length === 0) {
      allPickups.push({
        id: reservation.id,
        date: reservation.date,
        time: reservation.time?.slice(0, 5) || '',
        reminder_date: reservation.reminder_at ? format(new Date(reservation.reminder_at), 'yyyy-MM-dd') : '',
        reminder_time: reservation.reminder_at ? format(new Date(reservation.reminder_at), 'HH:mm') : '',
      });
      totalAmount = reservation.amount || 0;
    }

    setFormData({
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone || '',
      title: reservation.title,
      amount: totalAmount ? String(totalAmount) : '',
      description: reservation.description || '',
      product_category: reservation.product_category || '',
      payment_method: '',
      reservation_channel: 'other',
      sale_date: reservation.sale_date || '',
    });
    setPickups(allPickups);
    setDeletedPickupIds([]);
    setShowForm(true);
  }

  // 금액 (공유 필드)
  const totalAmount = useMemo(() => {
    return parseInt(formData.amount) || 0;
  }, [formData.amount]);

  function updatePickup(index: number, field: keyof PickupItem, value: string) {
    setPickups(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [field]: value };

      // 날짜 변경 시 리마인더 날짜 동기화
      if (field === 'date' && value) {
        updated.reminder_date = value;
        // 시간이 있으면 2시간 전 계산
        if (updated.time) {
          const [h, m] = updated.time.split(':').map(Number);
          const beforeH = h - 2;
          if (beforeH >= 0) {
            updated.reminder_time = `${String(beforeH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          } else {
            // 자정 넘어가면 전날 + 보정된 시간
            const prevDate = new Date(value);
            prevDate.setDate(prevDate.getDate() - 1);
            updated.reminder_date = format(prevDate, 'yyyy-MM-dd');
            updated.reminder_time = `${String(24 + beforeH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }
        }
      }

      // 시간 변경 시 리마인더 시간 2시간 전으로 동기화
      if (field === 'time' && value && updated.date) {
        updated.reminder_date = updated.date;
        const [h, m] = value.split(':').map(Number);
        const beforeH = h - 2;
        if (beforeH >= 0) {
          updated.reminder_time = `${String(beforeH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        } else {
          const prevDate = new Date(updated.date);
          prevDate.setDate(prevDate.getDate() - 1);
          updated.reminder_date = format(prevDate, 'yyyy-MM-dd');
          updated.reminder_time = `${String(24 + beforeH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      }

      return updated;
    }));
  }

  function addPickup() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setPickups(prev => [...prev, { date: dateStr, time: '', reminder_date: dateStr, reminder_time: '' }]);
  }

  function removePickup(index: number) {
    const pickup = pickups[index];
    if (pickup.id) {
      setDeletedPickupIds(prev => [...prev, pickup.id!]);
    }
    setPickups(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 검증
    if (!formData.customer_name.trim()) {
      toast.error('고객명을 입력해주세요');
      return;
    }
    if (!formData.customer_phone.trim()) {
      toast.error('전화번호를 입력해주세요');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (!p.date) { toast.error(`픽업 ${i + 1}의 날짜를 입력해주세요`); return; }
      // 불완전한 시간 검증 (시만 or 분만 선택한 경우)
      if (p.time && !/^\d{2}:\d{2}$/.test(p.time)) {
        toast.error(`픽업 ${i + 1}의 시간을 정확히 선택해주세요`);
        return;
      }
      if (p.reminder_time && !/^\d{2}:\d{2}$/.test(p.reminder_time)) {
        toast.error(`픽업 ${i + 1}의 리마인더 시간을 정확히 선택해주세요`);
        return;
      }
    }
    if (totalAmount <= 0) {
      toast.error('금액을 입력해주세요');
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

    // 전화번호 중복 체크
    try {
      const existing = await checkPhoneDuplicate(formData.customer_phone);
      if (existing && existing.name !== formData.customer_name.trim()) {
        toast.error(`이 전화번호는 "${existing.name}" 고객에게 등록되어 있습니다`);
        setIsSaving(false);
        return;
      }
    } catch { /* 계속 진행 */ }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    function cleanTime(t: string): string | null {
      if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
      return t;
    }

    function pickupReminderAt(p: PickupItem): string | null {
      if (!p.reminder_date) return null;
      const time = cleanTime(p.reminder_time) || '08:00';
      return `${p.reminder_date}T${time}:00+09:00`;
    }

    try {
      if (editingId) {
        // === 수정 모드 ===
        // 1. 기존 픽업 업데이트
        for (const p of pickups) {
          if (p.id) {
            await updateReservation(p.id, {
              date: p.date,
              time: cleanTime(p.time),
              title: formData.title,
              amount: totalAmount,
              customer_name: formData.customer_name,
              customer_phone: formData.customer_phone || null,
              description: formData.description || null,
              reminder_at: pickupReminderAt(p),
            });
          }
        }

        // 2. 새 픽업 추가
        if (editingSaleId) {
          for (const p of pickups) {
            if (!p.id) {
              await addPickupToSale(editingSaleId, {
                date: p.date,
                time: cleanTime(p.time) || undefined,
                title: formData.title,
                amount: 0,
                reminder_at: pickupReminderAt(p),
              });
            }
          }
        }

        // 3. 삭제된 픽업 제거
        for (const id of deletedPickupIds) {
          await deleteReservation(id);
        }

        // 4. 매출 동기화
        if (editingSaleId) {
          try {
            const saleFormData = new FormData();
            if (formData.sale_date) saleFormData.set('date', formData.sale_date);
            saleFormData.set('amount', String(totalAmount));
            saleFormData.set('note', formData.description || '');
            if (formData.product_category) saleFormData.set('product_category', formData.product_category);
            await updateSale(editingSaleId, saleFormData);
          } catch {
            toast.error('매출 동기화에 실패했습니다');
          }
        }

        toast.success('예약이 수정되었습니다');
      } else {
        // === 생성 모드 ===
        const first = pickups[0];

        // 1. 첫 번째 픽업으로 예약 생성
        const reservation = await createReservation({
          date: first.date || dateStr,
          time: cleanTime(first.time) || undefined,
          customer_name: formData.customer_name,
          title: formData.title,
          description: formData.description || undefined,
          amount: totalAmount,
          customer_phone: formData.customer_phone || undefined,
          reminder_at: pickupReminderAt(first),
        });

        // 2. 매출 생성
        const saleFormData = new FormData();
        saleFormData.set('date', formData.sale_date || dateStr);
        saleFormData.set('product_category', formData.product_category);
        saleFormData.set('amount', String(totalAmount));
        saleFormData.set('payment_method', formData.payment_method);
        saleFormData.set('reservation_channel', formData.reservation_channel);
        saleFormData.set('customer_name', formData.customer_name);
        saleFormData.set('customer_phone', formData.customer_phone);
        saleFormData.set('note', formData.description || '');

        const sale = await convertReservationToSale(reservation.id, saleFormData);

        // 3. 추가 픽업 생성
        for (let i = 1; i < pickups.length; i++) {
          const p = pickups[i];
          await addPickupToSale(sale.id, {
            date: p.date || dateStr,
            time: cleanTime(p.time) || undefined,
            title: formData.title,
            amount: 0,
            reminder_at: pickupReminderAt(p),
          });
        }

        toast.success('예약과 매출이 등록되었습니다');
      }
      resetForm();
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (editingId ? '수정 실패' : '등록 실패'));
    }
    setIsSaving(false);
  }

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

  // === Calendar Event handlers ===
  function resetEventForm() {
    setEventFormData({ title: '', start_date: '', end_date: '', color: '#f43f5e', description: '' });
    setEditingEventId(null);
    setShowEventForm(false);
  }

  function startEditEvent(event: CalendarEvent) {
    setEditingEventId(event.id);
    setEventFormData({
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      color: event.color,
      description: event.description || '',
    });
    setShowEventForm(true);
    // 이벤트 폼 열 때 예약 폼은 닫기
    setShowForm(false);
  }

  async function handleEventSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventFormData.title.trim()) { toast.error('제목을 입력해주세요'); return; }
    if (!eventFormData.start_date || !eventFormData.end_date) { toast.error('시작일과 종료일을 입력해주세요'); return; }
    if (eventFormData.end_date < eventFormData.start_date) { toast.error('종료일은 시작일보다 이전일 수 없습니다'); return; }

    setIsSaving(true);
    try {
      if (editingEventId) {
        await updateCalendarEvent(editingEventId, {
          title: eventFormData.title,
          start_date: eventFormData.start_date,
          end_date: eventFormData.end_date,
          color: eventFormData.color,
          description: eventFormData.description || null,
        });
        toast.success('이벤트가 수정되었습니다');
      } else {
        await createCalendarEvent({
          title: eventFormData.title,
          start_date: eventFormData.start_date,
          end_date: eventFormData.end_date,
          color: eventFormData.color,
          description: eventFormData.description || undefined,
        });
        toast.success('이벤트가 등록되었습니다');
      }
      resetEventForm();
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (editingEventId ? '수정 실패' : '등록 실패'));
    }
    setIsSaving(false);
  }

  async function handleDeleteEvent() {
    if (!deleteEventTarget) return;
    setIsDeleting(true);
    try {
      await deleteCalendarEvent(deleteEventTarget.id);
      toast.success('이벤트가 삭제되었습니다');
      setDeleteEventTarget(null);
      resetEventForm();
      fetchData();
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-sm min-[450px]:text-base font-semibold text-foreground whitespace-nowrap">
                {viewMode === 'month'
                  ? format(currentMonth, 'yyyy년 M월', { locale: ko })
                  : `${format(fiveDayDays[0], 'M.d', { locale: ko })} - ${format(fiveDayDays[4], 'M.d', { locale: ko })}`
                }
              </h2>
              <div className="flex items-center gap-1 min-[450px]:gap-2">
                {/* View toggle */}
                <div className="flex bg-muted rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('month')}
                    className={cn(
                      'px-2 min-[450px]:px-2.5 py-1 text-xs rounded-md transition-colors',
                      viewMode === 'month' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    월간
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('5day');
                      if (!isSameMonth(selectedDate, currentMonth)) {
                        setCurrentMonth(selectedDate);
                      }
                    }}
                    className={cn(
                      'px-2 min-[450px]:px-2.5 py-1 text-xs rounded-md transition-colors',
                      viewMode === '5day' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    5일
                  </button>
                </div>
                {/* Navigation */}
                <div className="flex items-center gap-0.5 min-[450px]:gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (viewMode === 'month') {
                        setCurrentMonth(subMonths(currentMonth, 1));
                      } else {
                        selectDate(subDays(selectedDate, 1));
                      }
                    }}
                    aria-label={viewMode === 'month' ? '이전 달' : '이전 날'}
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
                    onClick={() => {
                      if (viewMode === 'month') {
                        setCurrentMonth(addMonths(currentMonth, 1));
                      } else {
                        selectDate(addDays(selectedDate, 1));
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
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const dayOfWeek = day.getDay();

                    return (
                      <button
                        key={dateKey}
                        onClick={() => selectDate(day)}
                        aria-label={`${format(day, 'M월 d일', { locale: ko })}${dayReservations.length > 0 ? ` 예약 ${dayReservations.length}건` : ''}${dayEvents.length > 0 ? ` 이벤트 ${dayEvents.length}건` : ''}`}
                        className={cn(
                          'relative min-h-[120px] sm:min-h-[130px] p-1 border-b border-r border-border text-left transition-colors hover:bg-muted/50 [&:nth-child(7n)]:border-r-0 flex flex-col overflow-visible',
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
                        {/* Event bars (lane-based positioning) */}
                        {dayEvents.length > 0 && (() => {
                          const maxLane = Math.max(...dayEvents.map(e => eventLaneMap.get(e.id) ?? 0));
                          const lanes: (CalendarEvent | null)[] = Array(maxLane + 1).fill(null);
                          for (const event of dayEvents) {
                            const lane = eventLaneMap.get(event.id) ?? 0;
                            lanes[lane] = event;
                          }
                          return (
                            <div className="flex flex-col gap-px mb-0.5">
                              {lanes.map((event, lane) => {
                                if (!event) {
                                  return <div key={`spacer-${lane}`} className="text-[10px] leading-tight py-px -mx-1 invisible" aria-hidden="true">{'\u00A0'}</div>;
                                }
                                const isStart = event.start_date === dateKey;
                                const isEnd = event.end_date === dateKey;
                                const isSingle = isStart && isEnd;
                                return (
                                  <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); startEditEvent(event); }}
                                    className={cn(
                                      'text-[10px] leading-tight px-1 py-px font-medium cursor-pointer hover:opacity-80 transition-opacity -mx-1',
                                      isStart && !isSingle ? 'whitespace-nowrap overflow-visible relative z-10' : 'truncate',
                                    )}
                                    style={{
                                      backgroundColor: `${event.color}30`,
                                      color: event.color,
                                      borderRadius: isSingle ? '3px' : isStart ? '3px 0 0 3px' : isEnd ? '0 3px 3px 0' : '0',
                                    }}
                                  >
                                    {isStart ? event.title : '\u00A0'}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* Reservations */}
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
                                    ? 'bg-sage-muted text-sage'
                                    : r.status === 'confirmed'
                                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-brand/15 text-brand'
                                )}
                              >
                                {r.status === 'completed' && <span className="hidden min-[450px]:inline">📦 </span>}
                                <span className={r.status === 'completed' ? 'line-through' : undefined}>
                                  {r.time ? r.time.slice(0, 5) : ''}
                                  <span className="hidden min-[450px]:inline">
                                    {r.time && r.customer_name ? ' ' : ''}{r.customer_name || r.title}
                                  </span>
                                </span>
                              </div>
                            ))}
                            {dayReservations.length > 5 && (
                              <span className="text-[10px] text-muted-foreground leading-none px-1">+{dayReservations.length - 5}건</span>
                            )}
                            {dayPendingCount > 0 && (
                              <span className="text-[10px] font-medium text-brand mt-auto px-1 hidden min-[450px]:block">{dayPendingCount}개 제작</span>
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
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const dayOfWeek = day.getDay();
                    const dayPendingCount = dayReservations.filter(r => r.status !== 'completed').length;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => selectDate(day)}
                        aria-label={`${format(day, 'M월 d일', { locale: ko })}${dayReservations.length > 0 ? ` 예약 ${dayReservations.length}건` : ''}${dayEvents.length > 0 ? ` 이벤트 ${dayEvents.length}건` : ''}`}
                        className={cn(
                          'relative min-h-[100px] min-[450px]:min-h-[200px] p-1.5 min-[450px]:p-2 border-b border-r border-border text-left transition-colors hover:bg-muted/50 [&:nth-child(5n)]:border-r-0 flex flex-col',
                          isSelected && 'bg-brand-muted/50 hover:bg-brand-muted/50',
                        )}
                      >
                        <span className={cn(
                          'inline-flex items-center justify-center w-6 h-6 min-[450px]:w-7 min-[450px]:h-7 text-xs min-[450px]:text-sm rounded-full mb-0.5 min-[450px]:mb-1 shrink-0',
                          isTodayDate && 'bg-brand text-brand-foreground font-semibold',
                          !isTodayDate && dayOfWeek === 0 && 'text-red-400',
                          !isTodayDate && dayOfWeek === 6 && 'text-blue-400',
                          !isTodayDate && isSelected && 'font-semibold text-foreground',
                        )}>
                          {format(day, 'd')}
                        </span>
                        {/* Event bars (lane-based positioning) */}
                        {dayEvents.length > 0 && (() => {
                          const maxLane = Math.max(...dayEvents.map(e => eventLaneMap.get(e.id) ?? 0));
                          const lanes: (CalendarEvent | null)[] = Array(maxLane + 1).fill(null);
                          for (const event of dayEvents) {
                            const lane = eventLaneMap.get(event.id) ?? 0;
                            lanes[lane] = event;
                          }
                          return (
                            <div className="flex flex-col gap-px mb-0.5">
                              {lanes.map((event, lane) => {
                                if (!event) {
                                  return <div key={`spacer-${lane}`} className="text-[10px] min-[450px]:text-xs leading-tight py-px min-[450px]:py-0.5 -mx-1.5 min-[450px]:-mx-2 invisible" aria-hidden="true">{'\u00A0'}</div>;
                                }
                                const isStart = event.start_date === dateKey;
                                const isEnd = event.end_date === dateKey;
                                const isSingle = isStart && isEnd;
                                return (
                                  <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); startEditEvent(event); }}
                                    className="text-[10px] min-[450px]:text-xs leading-tight px-1 min-[450px]:px-1.5 py-px min-[450px]:py-0.5 truncate font-medium cursor-pointer hover:opacity-80 transition-opacity -mx-1.5 min-[450px]:-mx-2"
                                    style={{
                                      backgroundColor: `${event.color}30`,
                                      color: event.color,
                                      borderRadius: isSingle ? '3px' : isStart ? '3px 0 0 3px' : isEnd ? '0 3px 3px 0' : '0',
                                    }}
                                  >
                                    {isStart ? event.title : '\u00A0'}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* Reservations */}
                        {dayReservations.length > 0 ? (
                          <div className="flex flex-col gap-0.5 min-[450px]:gap-1 overflow-hidden flex-1">
                            {dayReservations.map((r) => (
                              <div
                                key={r.id}
                                className={cn(
                                  'text-[10px] min-[450px]:text-xs leading-snug px-1 min-[450px]:px-1.5 py-0.5 min-[450px]:py-1 rounded',
                                  r.status === 'completed'
                                    ? 'bg-sage-muted text-sage'
                                    : r.status === 'confirmed'
                                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-brand/15 text-brand'
                                )}
                              >
                                <div className="font-medium truncate">
                                  {r.status === 'completed' && <span className="hidden min-[450px]:inline">📦 </span>}
                                  <span className={r.status === 'completed' ? 'line-through' : undefined}>
                                    {r.time ? r.time.slice(0, 5) : ''}<span className="hidden min-[450px]:inline">{r.time && r.customer_name ? ' ' : ''}{r.customer_name || r.title}</span>
                                  </span>
                                </div>
                                <div className={cn('hidden min-[450px]:block', r.status === 'completed' && 'line-through')}>
                                  {r.title && r.customer_name && (
                                    <div className="truncate opacity-80">{r.title}</div>
                                  )}
                                  {r.amount > 0 && (
                                    <div className="opacity-70">{formatCurrency(r.amount)}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {dayPendingCount > 0 && (
                              <span className="text-[10px] min-[450px]:text-xs font-medium text-brand mt-auto px-1">{dayPendingCount}개 제작</span>
                            )}
                          </div>
                        ) : dayEvents.length === 0 ? (
                          <span className="text-[10px] min-[450px]:text-xs text-muted-foreground/50 mt-2">예약 없음</span>
                        ) : null}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectDate(subDays(selectedDate, 1))}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shrink-0"
                    aria-label="이전 날"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedDateReservations.length > 0
                        ? `${selectedDateReservations.length}건의 예약`
                        : '예약 없음'}
                    </p>
                  </div>
                  <button
                    onClick={() => selectDate(addDays(selectedDate, 1))}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shrink-0"
                    aria-label="다음 날"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">이벤트</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  resetEventForm();
                  setEventFormData(prev => ({
                    ...prev,
                    start_date: format(selectedDate, 'yyyy-MM-dd'),
                    end_date: format(selectedDate, 'yyyy-MM-dd'),
                  }));
                  setShowEventForm(true);
                  setShowForm(false);
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
              {/* Selected date events list */}
              {selectedDateEvents.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {selectedDateEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => startEditEvent(event)}
                      className="w-full text-left p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.start_date === event.end_date
                              ? format(new Date(event.start_date), 'M월 d일', { locale: ko })
                              : `${format(new Date(event.start_date), 'M.d', { locale: ko })} - ${format(new Date(event.end_date), 'M.d', { locale: ko })}`
                            }
                          </p>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 pl-[18px]">{event.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Form */}
          {showEventForm && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">{editingEventId ? '이벤트 수정' : '새 이벤트'}</p>
                  <Button variant="ghost" size="icon-sm" onClick={resetEventForm} aria-label="이벤트 폼 닫기">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <form onSubmit={handleEventSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">제목 <span className="text-brand">*</span></Label>
                    <Input
                      value={eventFormData.title}
                      onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                      placeholder="졸업 시즌"
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">시작일 <span className="text-brand">*</span></Label>
                      <Input
                        type="date"
                        value={eventFormData.start_date}
                        onChange={(e) => setEventFormData({ ...eventFormData, start_date: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">종료일 <span className="text-brand">*</span></Label>
                      <Input
                        type="date"
                        value={eventFormData.end_date}
                        onChange={(e) => setEventFormData({ ...eventFormData, end_date: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">색상</Label>
                    <div className="flex gap-2">
                      {CALENDAR_EVENT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEventFormData({ ...eventFormData, color: c.value })}
                          className={cn(
                            'w-7 h-7 rounded-full border-2 transition-transform',
                            eventFormData.color === c.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.label}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">메모</Label>
                    <textarea
                      value={eventFormData.description}
                      onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                      placeholder="메모를 입력하세요"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
                      aria-label="이벤트 메모"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="flex-1 h-9" onClick={resetEventForm}>
                      취소
                    </Button>
                    <Button type="submit" size="sm" className="flex-1 h-9" disabled={isSaving}>
                      {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      {editingEventId ? '수정' : '등록'}
                    </Button>
                    {editingEventId && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-9 px-3"
                        onClick={() => setDeleteEventTarget(calendarEvents.find(e => e.id === editingEventId) || null)}
                        aria-label="이벤트 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Reservation Form */}
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
                  {/* 고객명 | 전화번호 */}
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
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">전화번호 <span className="text-brand">*</span></Label>
                      <Input
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: formatPhoneNumber(e.target.value) })}
                        placeholder="010-0000-0000"
                        className="h-8"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* 카테고리 | 제목 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">카테고리 {!editingId && <span className="text-brand">*</span>}</Label>
                      <select
                        value={formData.product_category}
                        onChange={(e) => {
                          const cat = saleCategories.find(c => c.value === e.target.value);
                          setFormData({
                            ...formData,
                            product_category: e.target.value,
                            title: cat ? cat.label : formData.title,
                          });
                        }}
                        className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                        aria-label="상품 카테고리"
                      >
                        <option value="">선택</option>
                        {saleCategories.map((cat) => (
                          <option key={cat.id} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">제목 <span className="text-brand">*</span></Label>
                      <SuggestionInput
                        value={formData.title}
                        onChange={(val) => setFormData({ ...formData, title: val })}
                        suggestions={suggestions.titles}
                        placeholder="프로포즈 꽃다발"
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* 예약 채널 | 결제방식 (생성 모드만) */}
                  {!editingId && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">예약 채널</Label>
                        <select
                          value={formData.reservation_channel}
                          onChange={(e) => setFormData({ ...formData, reservation_channel: e.target.value })}
                          className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                          aria-label="예약 채널"
                        >
                          {Object.entries(CHANNEL_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">결제방식 <span className="text-brand">*</span></Label>
                        <select
                          value={formData.payment_method}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                          className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                          aria-label="결제방식"
                        >
                          <option value="">선택</option>
                          {salePaymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.value}>{pm.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 결제일자 | 금액 */}
                  <div className="grid grid-cols-[3fr_2fr] gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">결제일자</Label>
                      <Input
                        type="date"
                        value={formData.sale_date}
                        onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                        className="h-8"
                        aria-label="결제일자"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">금액 <span className="text-brand">*</span></Label>
                      <Input
                        type="number"
                        step={10000}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0"
                        className="h-8"
                        aria-label="금액"
                      />
                    </div>
                  </div>

                  {/* 픽업 섹션 */}
                  <div className="space-y-2">
                    {pickups.map((pickup, idx) => (
                      <div key={idx} className={cn('space-y-2', pickups.length > 1 && 'p-2.5 rounded-md border border-dashed border-input')}>
                        {pickups.length > 1 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">픽업 {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removePickup(idx)}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`픽업 ${idx + 1} 삭제`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-[3fr_2fr] gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{pickups.length === 1 ? '픽업 일자' : '날짜'} <span className="text-brand">*</span></Label>
                            <Input
                              type="date"
                              value={pickup.date}
                              onChange={(e) => updatePickup(idx, 'date', e.target.value)}
                              className="h-8"
                              aria-label={`픽업 ${idx + 1} 날짜`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{pickups.length === 1 ? '픽업 시간' : '시간'}</Label>
                            <TimeSelect
                              value={pickup.time}
                              onChange={(val) => updatePickup(idx, 'time', val)}
                            />
                          </div>
                        </div>
                        {/* 리마인더 */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            <BellRing className="w-3 h-3 inline mr-0.5" />
                            리마인더
                          </Label>
                          <div className="grid grid-cols-[3fr_2fr] gap-2">
                            <Input
                              type="date"
                              value={pickup.reminder_date}
                              onChange={(e) => updatePickup(idx, 'reminder_date', e.target.value)}
                              className="h-8"
                              aria-label={`픽업 ${idx + 1} 리마인더 날짜`}
                            />
                            <TimeSelect
                              value={pickup.reminder_time}
                              onChange={(val) => updatePickup(idx, 'reminder_time', val)}
                              disabled={!pickup.reminder_date}
                            />
                          </div>
                          {pickup.reminder_date && (
                            <p className="text-[10px] text-muted-foreground">
                              {pickup.reminder_date} {pickup.reminder_time || '08:00'}에 알림
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPickup}
                      className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-input rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      픽업 추가
                    </button>
                  </div>

                  {/* 메모 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">메모</Label>
                    <SuggestionInput
                      value={formData.description}
                      onChange={(val) => setFormData({ ...formData, description: val })}
                      suggestions={suggestions.descriptions}
                      placeholder="메모를 입력하세요"
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
                <div key={r.id} className="space-y-2">
                <Card className="group">
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {r.customer_id ? (
                              <button
                                type="button"
                                className="text-xs text-brand hover:text-brand/80 flex items-center gap-0.5 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/customers?customerId=${r.customer_id}`);
                                }}
                                aria-label={`${r.customer_name} 고객 상세 보기`}
                              >
                                {r.customer_name}
                                {r.customer_phone && ` · ${r.customer_phone}`}
                                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {r.customer_name}
                                {r.customer_phone && ` · ${r.customer_phone}`}
                              </span>
                            )}
                            {r.purchase_count != null && r.purchase_count > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                                {r.purchase_count}번 방문
                              </span>
                            )}
                          </div>
                        )}
                        {r.amount > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(r.amount)}</p>
                        )}
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                        )}
                        {r.reminder_at && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <BellRing className="w-3 h-3" />
                            {format(new Date(r.reminder_at), 'yyyy-MM-dd HH:mm')} 알림
                          </p>
                        )}

                        {/* 매출 확인 링크 */}
                        {r.sale_id && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="text-xs text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/sales?saleId=${r.sale_id}`);
                              }}
                              aria-label="연결된 매출 확인"
                            >
                              매출 확인 <ExternalLink className="w-3 h-3" />
                            </button>
                            {r.sale_date && (
                              <span className="text-[10px] text-muted-foreground">
                                결제 {format(new Date(r.sale_date), 'yy.MM.dd')}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 같은 매출의 다른 픽업 날짜 */}
                        {r.sale_id && (siblingReservations.get(r.sale_id) || []).length > 1 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium">다른 픽업:</span>
                            {(siblingReservations.get(r.sale_id) || [])
                              .filter(s => s.id !== r.id)
                              .map(s => (
                                <span
                                  key={s.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                >
                                  {s.date} {s.time?.slice(0, 5) || ''}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* 상태 토글 */}
                        <div className="flex gap-1.5 mt-2 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompletion(r);
                            }}
                            disabled={r.status === 'completed'}
                            className={cn(
                              'text-xs py-1 px-2 rounded transition-colors inline-flex items-center gap-1 shrink-0',
                              r.status === 'confirmed' || r.status === 'completed'
                                ? 'bg-brand text-brand-foreground'
                                : 'border border-input text-muted-foreground hover:bg-muted',
                              r.status === 'completed' && 'opacity-60 cursor-not-allowed'
                            )}
                            aria-label={r.status !== 'pending' ? '제작 완료 취소' : '제작 완료로 변경'}
                          >
                            {(r.status === 'confirmed' || r.status === 'completed') && <Check className="w-3 h-3" />}
                            제작 완료
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePickup(r);
                            }}
                            disabled={r.status === 'pending'}
                            className={cn(
                              'text-xs py-1 px-2 rounded transition-colors inline-flex items-center gap-1 shrink-0',
                              r.status === 'completed'
                                ? 'bg-blue-500 text-white'
                                : r.status === 'pending'
                                  ? 'border border-input text-muted-foreground opacity-40 cursor-not-allowed'
                                  : 'border border-input text-muted-foreground hover:bg-muted'
                            )}
                            aria-label={r.status === 'completed' ? '픽업 완료 취소' : '픽업 완료로 변경'}
                          >
                            {r.status === 'completed' && <PackageCheck className="w-3 h-3" />}
                            픽업 완료
                          </button>
                        </div>
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

                </div>
              ))}
            </div>
          ) : !showForm && selectedDateEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              이 날짜에 일정이 없습니다
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete reservation confirmation */}
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

      {/* Sale delete confirmation (after reservation deleted) */}
      <Dialog open={!!saleDeleteInfo} onOpenChange={(open) => {
        if (!open) {
          toast.success('예약이 삭제되었습니다');
          setSaleDeleteInfo(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>매출도 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              {saleDeleteInfo?.saleDate
                ? `${format(new Date(saleDeleteInfo.saleDate), 'yyyy년 M월 d일', { locale: ko })}의 매출도 함께 삭제하시겠습니까?`
                : '연결된 매출도 함께 삭제하시겠습니까?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              toast.success('예약이 삭제되었습니다');
              setSaleDeleteInfo(null);
            }}>
              아니요
            </Button>
            <Button variant="destructive" onClick={handleSaleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              매출도 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete event confirmation */}
      <Dialog open={!!deleteEventTarget} onOpenChange={() => setDeleteEventTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이벤트 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deleteEventTarget?.title}&quot; 이벤트를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEventTarget(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
