'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {addDays, format} from 'date-fns';
import {toast} from 'sonner';

import {getReservations} from '@/lib/actions/reservations';
import {getSchedules} from '@/lib/actions/schedules';
import {getSaleIdsWithPhotos} from '@/lib/actions/photo-cards';
import type {Schedule, Reservation} from '@/types/database';
import type {CalendarReservation} from '../types';

/**
 * 월 단위 예약/일정/사진여부 로딩 + 날짜별 파생 맵 계산. calendar-client에서 이동.
 */
export function useCalendarData(currentMonth: Date, selectedDate: Date) {
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [saleIdsWithPhotos, setSaleIdsWithPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Calendar events
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const monthStr = format(currentMonth, 'yyyy-MM');

  const fetchPhotoStatus = useCallback(async (reservationsData: CalendarReservation[]) => {
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

  return {
    reservations,
    schedules,
    saleIdsWithPhotos,
    isLoading,
    fetchData,
    refreshData,
    reservationsByDate,
    selectedDateReservations,
    schedulesByDate,
    scheduleLaneMap,
    selectedDateSchedules,
    siblingReservations,
  };
}
