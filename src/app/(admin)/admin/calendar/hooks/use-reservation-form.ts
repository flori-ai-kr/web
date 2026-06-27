'use client';

import type {FormEvent} from 'react';
import {useEffect, useMemo, useState} from 'react';
import {format} from 'date-fns';
import {toast} from 'sonner';

import {
    addPickupToSale,
    convertReservationToSale,
    createReservation,
    deleteReservation,
    getReservationSuggestions,
    updateReservation,
} from '@/lib/actions/reservations';
import {getSaleById, updateSale} from '@/lib/actions/sales';
import {checkPhoneDuplicate} from '@/lib/actions/customers';
import type {Reservation} from '@/types/database';
import type {CalendarReservation} from '../types';

export type PickupItem = { id?: string; date: string; time: string; amount: string; reminder_date: string; reminder_time: string };

/**
 * 예약 폼 상태(고객/제목/결제 + 픽업 목록) + 제출/수정 로직. calendar-client에서 이동.
 */
export function useReservationForm({
  selectedDate,
  siblingReservations,
  onSaved,
}: {
  selectedDate: Date;
  siblingReservations: Map<string, Reservation[]>;
  onSaved: () => void;
}) {
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

  // 폼이 열릴 때 자동완성 후보 로드
  useEffect(() => {
    if (showForm) {
      getReservationSuggestions().then(setSuggestions).catch(() => {});
    }
  }, [showForm]);

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

  // 폼만 닫기 (날짜 선택 등 — 필드 값은 다음 오픈 경로에서 항상 다시 채워진다)
  function closeReservationForm() {
    setShowForm(false);
    setEditingId(null);
  }

  // 새 예약 폼 오픈 (픽업/리마인더 일자 = dateStr, 결제일자 = 오늘)
  function openCreateReservation(dateStr: string) {
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
    setShowForm(true);
  }

  async function startEdit(reservation: CalendarReservation) {
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
        // 시간이 있으면 3시간 전 계산
        if (updated.time) {
          const [h, m] = updated.time.split(':').map(Number);
          const beforeH = h - 3;
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

      // 시간 변경 시 리마인더 시간 3시간 전으로 동기화
      if (field === 'time' && value && updated.date) {
        updated.reminder_date = updated.date;
        const [h, m] = value.split(':').map(Number);
        const beforeH = h - 3;
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

  async function handleSubmit(e: FormEvent) {
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
      const time = cleanTime(p.reminder_time) || '07:00';
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
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (editingId ? '수정 실패' : '등록 실패'));
    }
    setIsSaving(false);
  }

  return {
    showForm,
    editingId,
    editingSaleId,
    formData,
    setFormData,
    pickups,
    suggestions,
    isSaving,
    totalAmount,
    resetForm,
    closeReservationForm,
    openCreateReservation,
    startEdit,
    updatePickup,
    addPickup,
    removePickup,
    handleSubmit,
  };
}
