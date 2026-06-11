'use client';

import {useState} from 'react';
import {toast} from 'sonner';

import {deleteReservation, updateReservation} from '@/lib/actions/reservations';
import {completeUnpaidSale, deleteSale, revertUnpaidSale, updateSale} from '@/lib/actions/sales';
import type {Reservation, ReservationStatus} from '@/types/database';
import type {CalendarReservation} from '../types';

/**
 * 예약 카드 액션(제작/픽업 토글 + 미수 결제 완료 + 예약/매출 삭제) 상태/로직. calendar-client에서 이동.
 */
export function useReservationActions({
  siblingReservations,
  fetchData,
  refreshData,
}: {
  siblingReservations: Map<string, Reservation[]>;
  fetchData: () => void;
  refreshData: () => void;
}) {
  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CalendarReservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saleDeleteInfo, setSaleDeleteInfo] = useState<{ saleId: string; saleDate?: string } | null>(null);

  // 미수 결제 완료 dialog
  const [unpaidTarget, setUnpaidTarget] = useState<(Reservation & { sale_id: string }) | null>(null);
  const [unpaidPaymentMethod, setUnpaidPaymentMethod] = useState('');
  const [isCompletingUnpaid, setIsCompletingUnpaid] = useState(false);

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

  return {
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    saleDeleteInfo,
    setSaleDeleteInfo,
    unpaidTarget,
    setUnpaidTarget,
    unpaidPaymentMethod,
    setUnpaidPaymentMethod,
    isCompletingUnpaid,
    toggleCompletion,
    togglePickup,
    handleUnpaidComplete,
    handleDelete,
    handleSaleDelete,
  };
}
