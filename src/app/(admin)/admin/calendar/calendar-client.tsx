'use client';

import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {format, isSameMonth} from 'date-fns';
import {toast} from 'sonner';

// [AI 기능 비활성화] import {OcrReservationButton} from '@/components/ai/ocr-reservation-dialog';
import {SalePhotoModal} from '@/components/sales/sale-photo-modal';
import type {PaymentMethod as PaymentMethodType, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';
import {getPaymentMethods, getSaleCategories, getSaleChannels} from '@/lib/actions/sale-settings';
import {useQuickCreate} from '@/hooks/use-quick-create';
import {MonthCalendar} from './components/month-calendar';
import {DayPanel} from './components/day-panel';
import {ScheduleFormDialog} from './components/schedule-form-dialog';
import {ReservationFormDialog} from './components/reservation-form-dialog';
import {useCalendarData} from './hooks/use-calendar-data';
import {useScheduleForm} from './hooks/use-schedule-form';
import {useReservationForm} from './hooks/use-reservation-form';
import {useReservationActions} from './hooks/use-reservation-actions';
import {
    DeleteScheduleDialog,
    DeleteReservationDialog,
    DeleteSaleDialog,
    UnpaidPaymentDialog,
} from './components/calendar-dialogs';

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

  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  // Sale settings
  const [saleCategories, setSaleCategories] = useState<SaleCategory[]>([]);
  const [saleChannels, setSaleChannels] = useState<SaleChannel[]>([]);
  const [salePaymentMethods, setSalePaymentMethods] = useState<PaymentMethodType[]>([]);

  // Photo modal
  const [photoModal, setPhotoModal] = useState<{ saleId: string; defaultTitle: string } | null>(null);

  // 월 데이터 로딩 + 날짜별 파생 맵
  const {
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
  } = useCalendarData(currentMonth, selectedDate);

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

  // 예약 카드 액션(제작/픽업 토글 + 미수 결제 + 삭제)
  const {
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
  } = useReservationActions({ siblingReservations, fetchData, refreshData });

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
          <MonthCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            reservationsByDate={reservationsByDate}
            schedulesByDate={schedulesByDate}
            scheduleLaneMap={scheduleLaneMap}
            onMonthChange={setCurrentMonth}
            onSelectDate={selectDate}
          />
        </div>

        <DayPanel
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          onNewReservation={() => {
            openCreateReservation(format(selectedDate, 'yyyy-MM-dd'));
            closeScheduleForm();
          }}
          onNewSchedule={() => {
            openCreateSchedule(format(selectedDate, 'yyyy-MM-dd'));
            closeReservationForm();
          }}
          isLoading={isLoading}
          selectedDateReservations={selectedDateReservations}
          selectedDateSchedules={selectedDateSchedules}
          siblingReservations={siblingReservations}
          saleIdsWithPhotos={saleIdsWithPhotos}
          saleCategories={saleCategories}
          onPhotoClick={(saleId, defaultTitle) => setPhotoModal({ saleId, defaultTitle })}
          onEditReservation={startEdit}
          onDeleteReservation={setDeleteTarget}
          onToggleCompletion={toggleCompletion}
          onTogglePickup={togglePickup}
          onEditSchedule={(sched) => {
            startEditSchedule(sched);
            // 일정 폼 열 때 예약 폼은 닫기
            closeReservationForm();
          }}
          onDeleteSchedule={setDeleteScheduleTarget}
        >
          {/* 일정 Form (modal) */}
          <ScheduleFormDialog form={scheduleFormController} />

          {/* Reservation Form (modal) */}
          <ReservationFormDialog
            form={reservationFormController}
            saleCategories={saleCategories}
            saleChannels={saleChannels}
            salePaymentMethods={salePaymentMethods}
          />
        </DayPanel>
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
