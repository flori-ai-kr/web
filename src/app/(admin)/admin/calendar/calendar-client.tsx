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
    BellRing,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Plus,
    Trash2,
    X
} from 'lucide-react';
import {toast} from 'sonner';

import {Button} from '@/components/ui/button';
// [AI 기능 비활성화] import {OcrReservationButton} from '@/components/ai/ocr-reservation-dialog';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Input} from '@/components/ui/input';
import {DatePicker} from '@/components/ui/date-picker';
import {Label} from '@/components/ui/label';
import {SuggestionInput} from '@/components/ui/suggestion-input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {cn, formatPhoneNumber} from '@/lib/utils';
import {CustomerAutocomplete} from '@/components/sales/CustomerAutocomplete';

import {
    addPickupToSale,
    convertReservationToSale,
    createReservation,
    deleteReservation,
    getReservations,
    getReservationSuggestions,
    updateReservation,
} from '@/lib/actions/reservations';
import {
    createSchedule,
    deleteSchedule,
    getSchedules,
    updateSchedule,
} from '@/lib/actions/schedules';
import {completeUnpaidSale, deleteSale, getSaleById, revertUnpaidSale, updateSale} from '@/lib/actions/sales';
import {checkPhoneDuplicate} from '@/lib/actions/customers';
import {SalePhotoModal} from '@/components/sales/SalePhotoModal';
import {getSaleIdsWithPhotos} from '@/lib/actions/photo-cards';
import type {PaymentMethod as PaymentMethodType, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';
import {getPaymentMethods, getSaleCategories, getSaleChannels} from '@/lib/actions/sale-settings';
import type {Schedule, Reservation, ReservationStatus} from '@/types/database';
import {SCHEDULE_COLORS} from '@/types/database';
import type {CalendarReservation} from './types';
import {ScheduleCard} from './components/ScheduleCard';
import {ReservationCard} from './components/ReservationCard';
import {
    DeleteScheduleDialog,
    DeleteReservationDialog,
    DeleteSaleDialog,
    UnpaidPaymentDialog,
} from './components/CalendarDialogs';

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

  // Form states
  type PickupItem = { id?: string; date: string; time: string; amount: string; reminder_date: string; reminder_time: string };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    title: '',
    memo: '',
    product_category: '',
    payment_method: '',
    reservation_channel: '',
    sale_date: '',
  });
  const [pickups, setPickups] = useState<PickupItem[]>([{ date: '', time: '', amount: '', reminder_date: '', reminder_time: '' }]);
  const [deletedPickupIds, setDeletedPickupIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<{ titles: string[]; memos: string[] }>({ titles: [], memos: [] });

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
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    color: '#f43f5e',
    memo: '',
  });
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<Schedule | null>(null);

  const monthStr = format(currentMonth, 'yyyy-MM');

  // selectedDate 변경 시 currentMonth 동기화 + URL 반영
  function selectDate(date: Date) {
    setSelectedDate(date);
    setShowForm(false);
    setEditingId(null);
    setShowScheduleForm(false);
    setEditingScheduleId(null);
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

  function resetForm() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setFormData({
      customer_name: '',
      customer_phone: '',
      title: '',
      memo: '',
      product_category: '',
      payment_method: '',
      reservation_channel: '',
      sale_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setPickups([{ date: dateStr, time: '', amount: '', reminder_date: dateStr, reminder_time: '' }]);
    setDeletedPickupIds([]);
    setEditingId(null);
    setEditingSaleId(null);
    setShowForm(false);
  }

  async function startEdit(reservation: Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number; sale_payment_method?: string; sale_reservation_channel?: string }) {
    const saleId = reservation.sale_id;
    setEditingId(reservation.id);
    setEditingSaleId(saleId || null);

    // 같은 매출의 모든 픽업을 로드 (각 픽업의 개별 금액 유지)
    const allPickups: PickupItem[] = [];
    if (saleId) {
      const siblings = siblingReservations.get(saleId) || [];
      for (const s of siblings) {
        allPickups.push({
          id: s.id,
          date: s.date,
          time: s.time?.slice(0, 5) || '',
          amount: s.amount ? String(s.amount) : '',
          reminder_date: s.reminder_at ? format(new Date(s.reminder_at), 'yyyy-MM-dd') : '',
          reminder_time: s.reminder_at ? format(new Date(s.reminder_at), 'HH:mm') : '',
        });
      }
    }
    if (allPickups.length === 0) {
      allPickups.push({
        id: reservation.id,
        date: reservation.date,
        time: reservation.time?.slice(0, 5) || '',
        amount: reservation.amount ? String(reservation.amount) : '',
        reminder_date: reservation.reminder_at ? format(new Date(reservation.reminder_at), 'yyyy-MM-dd') : '',
        reminder_time: reservation.reminder_at ? format(new Date(reservation.reminder_at), 'HH:mm') : '',
      });
    }

    // 매출 연결 시 매출 상세를 조회해서 카테고리/결제방식/채널/결제일자(id 기반)를 채운다
    let saleDate = reservation.sale_date || '';
    let categoryId = '';
    let paymentMethodId = '';
    let channelId = '';

    if (saleId) {
      try {
        const sale = await getSaleById(saleId);
        if (sale) {
          saleDate = sale.date || saleDate;
          categoryId = sale.category_id || categoryId;
          paymentMethodId = sale.payment_method_id || paymentMethodId;
          channelId = sale.channel_id || channelId;
        }
      } catch { /* 조회 실패 시 기존 값 유지 */ }
    }

    setFormData({
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone || '',
      title: reservation.title,
      memo: reservation.memo || '',
      product_category: categoryId,
      payment_method: paymentMethodId,
      reservation_channel: channelId,
      sale_date: saleDate,
    });
    setPickups(allPickups);
    setDeletedPickupIds([]);
    setShowForm(true);
  }

  // 금액 (픽업별 합산)
  const totalAmount = useMemo(() => {
    return pickups.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
  }, [pickups]);

  function updatePickup(index: number, field: keyof PickupItem, value: string) {
    setPickups(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [field]: value };

      // 미수 선택 시 첫 번째 픽업 날짜 변경하면 결제일자 동기화
      if (field === 'date' && index === 0 && value && formData.payment_method === '__unpaid__') {
        setFormData(prev => ({ ...prev, sale_date: value }));
      }

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
    setPickups(prev => [...prev, { date: dateStr, time: '', amount: '', reminder_date: dateStr, reminder_time: '' }]);
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
              amount: parseInt(p.amount) || 0,
              customer_name: formData.customer_name,
              customer_phone: formData.customer_phone || null,
              memo: formData.memo || null,
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
                amount: parseInt(p.amount) || 0,
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
            saleFormData.set('memo', formData.memo || '');
            if (formData.product_category) saleFormData.set('category_id', formData.product_category);
            if (formData.payment_method === '__unpaid__') { saleFormData.set('is_unpaid', 'true'); } else if (formData.payment_method) { saleFormData.set('payment_method_id', formData.payment_method); }
            if (formData.reservation_channel) saleFormData.set('channel_id', formData.reservation_channel);
            saleFormData.set('customer_name', formData.customer_name);
            if (formData.customer_phone) saleFormData.set('customer_phone', formData.customer_phone);
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
          memo: formData.memo || undefined,
          amount: parseInt(first.amount) || 0,
          customer_phone: formData.customer_phone || undefined,
          reminder_at: pickupReminderAt(first),
        });

        // 2. 매출 생성
        const saleFormData = new FormData();
        saleFormData.set('date', formData.sale_date || dateStr);
        saleFormData.set('category_id', formData.product_category);
        saleFormData.set('amount', String(totalAmount));
        if (formData.payment_method === '__unpaid__') { saleFormData.set('is_unpaid', 'true'); } else { saleFormData.set('payment_method_id', formData.payment_method); }
        saleFormData.set('channel_id', formData.reservation_channel);
        saleFormData.set('customer_name', formData.customer_name);
        saleFormData.set('customer_phone', formData.customer_phone);
        saleFormData.set('memo', formData.memo || '');

        const sale = await convertReservationToSale(reservation.id, saleFormData);

        // 3. 추가 픽업 생성
        for (let i = 1; i < pickups.length; i++) {
          const p = pickups[i];
          await addPickupToSale(sale.id, {
            date: p.date || dateStr,
            time: cleanTime(p.time) || undefined,
            title: formData.title,
            amount: parseInt(p.amount) || 0,
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
  function resetScheduleForm() {
    setScheduleForm({ title: '', start_date: '', end_date: '', color: '#f43f5e', memo: '' });
    setEditingScheduleId(null);
    setShowScheduleForm(false);
  }

  function startEditSchedule(s: Schedule) {
    setEditingScheduleId(s.id);
    setScheduleForm({
      title: s.title,
      start_date: s.start_date,
      end_date: s.end_date,
      color: s.color,
      memo: s.memo || '',
    });
    setShowScheduleForm(true);
    // 일정 폼 열 때 예약 폼은 닫기
    setShowForm(false);
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.title.trim()) { toast.error('제목을 입력해주세요'); return; }
    if (!scheduleForm.start_date || !scheduleForm.end_date) { toast.error('시작일과 종료일을 입력해주세요'); return; }
    if (scheduleForm.end_date < scheduleForm.start_date) { toast.error('종료일은 시작일보다 이전일 수 없습니다'); return; }

    setIsSaving(true);
    try {
      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, {
          title: scheduleForm.title,
          start_date: scheduleForm.start_date,
          end_date: scheduleForm.end_date,
          color: scheduleForm.color,
          memo: scheduleForm.memo || null,
        });
        toast.success('일정이 수정되었습니다');
      } else {
        await createSchedule({
          title: scheduleForm.title,
          start_date: scheduleForm.start_date,
          end_date: scheduleForm.end_date,
          color: scheduleForm.color,
          memo: scheduleForm.memo || undefined,
        });
        toast.success('일정이 등록되었습니다');
      }
      resetScheduleForm();
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (editingScheduleId ? '수정 실패' : '등록 실패'));
    }
    setIsSaving(false);
  }

  async function handleDeleteSchedule() {
    if (!deleteScheduleTarget) return;
    setIsDeleting(true);
    try {
      await deleteSchedule(deleteScheduleTarget.id);
      toast.success('일정이 삭제되었습니다');
      setDeleteScheduleTarget(null);
      resetScheduleForm();
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
    setIsDeleting(false);
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
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    setFormData({
                      customer_name: '',
                      customer_phone: '',
                      title: '',
                      memo: '',
                      product_category: '',
                      payment_method: '',
                      reservation_channel: '',
                      sale_date: format(new Date(), 'yyyy-MM-dd'),
                    });
                    setPickups([{ date: dateStr, time: '', amount: '', reminder_date: dateStr, reminder_time: '' }]);
                    setDeletedPickupIds([]);
                    setEditingId(null);
                    setEditingSaleId(null);
                    setShowScheduleForm(false);
                    setShowForm(true);
                  }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    예약
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    resetScheduleForm();
                    setScheduleForm(prev => ({
                      ...prev,
                      start_date: format(selectedDate, 'yyyy-MM-dd'),
                      end_date: format(selectedDate, 'yyyy-MM-dd'),
                    }));
                    setShowForm(false);
                    setShowScheduleForm(true);
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
          <Dialog open={showScheduleForm} onOpenChange={(open) => { if (!open) resetScheduleForm(); }}>
            <DialogContent
              className="sm:max-w-md max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>{editingScheduleId ? '일정 수정' : '새 일정'}</DialogTitle>
              </DialogHeader>
                <form onSubmit={handleScheduleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">제목 <span className="text-brand">*</span></Label>
                    <Input
                      value={scheduleForm.title}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                      placeholder="졸업 시즌"
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">시작일 <span className="text-brand">*</span></Label>
                      <DatePicker
                        value={scheduleForm.start_date}
                        onChange={(d) => setScheduleForm({ ...scheduleForm, start_date: d })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">종료일 <span className="text-brand">*</span></Label>
                      <DatePicker
                        value={scheduleForm.end_date}
                        onChange={(d) => setScheduleForm({ ...scheduleForm, end_date: d })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">색상</Label>
                    <div className="flex gap-2">
                      {SCHEDULE_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, color: c.value })}
                          className={cn(
                            'w-7 h-7 rounded-full border-2 transition-transform',
                            scheduleForm.color === c.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.label}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-muted-foreground">메모</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {scheduleForm.memo.length}/200
                      </span>
                    </div>
                    <textarea
                      value={scheduleForm.memo}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, memo: e.target.value })}
                      placeholder="메모를 입력하세요"
                      maxLength={200}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring field-sizing-content min-h-[60px] max-h-[160px]"
                      aria-label="일정 메모"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="flex-1 h-9" onClick={resetScheduleForm}>
                      취소
                    </Button>
                    <Button type="submit" size="sm" className="flex-1 h-9" disabled={isSaving}>
                      {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      {editingScheduleId ? '수정' : '등록'}
                    </Button>
                  </div>
                </form>
            </DialogContent>
          </Dialog>

          {/* Reservation Form (modal) */}
          <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
            <DialogContent
              className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>{editingId ? '예약 수정' : '새 예약'}</DialogTitle>
              </DialogHeader>
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
                          const cat = saleCategories.find(c => c.id === e.target.value);
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
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
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

                  {/* 예약 채널 | 결제방식 */}
                  {editingSaleId || !editingId ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">예약 채널</Label>
                        <select
                          value={formData.reservation_channel}
                          onChange={(e) => setFormData({ ...formData, reservation_channel: e.target.value })}
                          className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                          aria-label="예약 채널"
                        >
                          <option value="">선택</option>
                          {saleChannels.map((ch) => (
                            <option key={ch.id} value={ch.id}>{ch.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">결제방식 <span className="text-brand">*</span></Label>
                        <select
                          value={formData.payment_method}
                          onChange={(e) => {
                            const newMethod = e.target.value;
                            const updates: Partial<typeof formData> = { payment_method: newMethod };
                            // 미수 선택 시 결제일자를 첫 번째 픽업 일자로 동기화
                            if (newMethod === '__unpaid__' && pickups[0]?.date) {
                              updates.sale_date = pickups[0].date;
                            }
                            setFormData({ ...formData, ...updates });
                          }}
                          className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                          aria-label="결제방식"
                        >
                          <option value="">선택</option>
                          {salePaymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>{pm.label}</option>
                          ))}
                          <option value="__unpaid__">미수(외상)</option>
                        </select>
                      </div>
                    </div>
                  ) : null}

                  {/* 결제일자 | 금액 */}
                  <div className="grid grid-cols-[3fr_2fr] gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">결제일자</Label>
                      <DatePicker
                        value={formData.sale_date}
                        onChange={(d) => setFormData({ ...formData, sale_date: d })}
                        aria-label="결제일자"
                      />
                    </div>
                    {pickups.length === 1 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">금액 <span className="text-brand">*</span></Label>
                        <Input
                          type="number"
                          step={10000}
                          value={pickups[0].amount}
                          onChange={(e) => updatePickup(0, 'amount', e.target.value)}
                          placeholder="0"
                          className="h-8"
                          aria-label="금액"
                        />
                      </div>
                    )}
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
                              className="text-[10px] text-muted-foreground hover:text-danger transition-colors"
                              aria-label={`픽업 ${idx + 1} 삭제`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="grid grid-cols-[3fr_2fr] gap-2">
                            <Label className="text-[10px] text-muted-foreground">{pickups.length === 1 ? '픽업 일자' : '날짜'} <span className="text-brand">*</span></Label>
                            <Label className="text-[10px] text-muted-foreground">{pickups.length === 1 ? '픽업 시간' : '시간'}</Label>
                          </div>
                          <div className="grid grid-cols-[3fr_2fr] gap-2">
                            <DatePicker
                              value={pickup.date}
                              onChange={(d) => updatePickup(idx, 'date', d)}
                              aria-label={`픽업 ${idx + 1} 날짜`}
                            />
                            <TimeSelect
                              value={pickup.time}
                              onChange={(val) => updatePickup(idx, 'time', val)}
                            />
                          </div>
                        </div>
                        {pickups.length > 1 && (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">금액 <span className="text-brand">*</span></Label>
                            <Input
                              type="number"
                              step={10000}
                              value={pickup.amount}
                              onChange={(e) => updatePickup(idx, 'amount', e.target.value)}
                              placeholder="0"
                              className="h-8 w-full"
                              aria-label={`픽업 ${idx + 1} 금액`}
                            />
                          </div>
                        )}
                        {/* 리마인더 */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            <BellRing className="w-3 h-3 inline mr-0.5" />
                            리마인더
                          </Label>
                          <div className="grid grid-cols-[3fr_2fr] gap-2">
                            <DatePicker
                              value={pickup.reminder_date}
                              onChange={(d) => updatePickup(idx, 'reminder_date', d)}
                              placeholder="없음"
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
                    {pickups.length > 1 && (
                      <div className="flex items-center justify-between px-1 pt-1">
                        <span className="text-xs text-muted-foreground">합산 금액</span>
                        <span className={cn('text-sm font-semibold', totalAmount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                          {totalAmount > 0 ? formatCurrency(totalAmount) : '0원'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 메모 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-muted-foreground">메모</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {formData.memo.length}/200
                      </span>
                    </div>
                    <SuggestionInput
                      value={formData.memo}
                      onChange={(val) => setFormData({ ...formData, memo: val })}
                      suggestions={suggestions.memos}
                      placeholder="메모를 입력하세요"
                      maxLength={200}
                      multiline
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
            </DialogContent>
          </Dialog>

          {/* 탭 콘텐츠 */}
          {dayTab === 'schedule' ? (
            selectedDateSchedules.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDateSchedules.map((s) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    onEdit={startEditSchedule}
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
        isDeleting={isDeleting}
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
