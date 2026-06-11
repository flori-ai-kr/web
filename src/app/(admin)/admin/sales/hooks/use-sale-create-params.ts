'use client';

import {useEffect} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

export interface SaleInitialCustomer {
  name: string;
  id: string | null;
  phone: string | null;
}

/**
 * URL `?action=create` — 고객 페이지에서 연결 진입 시 매출 등록 모달을 자동 오픈하고
 * URL 파라미터를 정리한다(년/월/일 컨텍스트는 유지). sales-client에서 이동.
 */
export function useSaleCreateParams({
  currentYear,
  currentMonth,
  currentDay,
  onOpenCreate,
}: {
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  /** customer는 customer_name 파라미터가 있을 때만 전달된다. */
  onOpenCreate: (customer?: SaleInitialCustomer) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      const paramCustomerName = searchParams.get('customer_name');
      const paramCustomerPhone = searchParams.get('customer_phone');
      const paramCustomerId = searchParams.get('customer_id');

      onOpenCreate(
        paramCustomerName
          ? { name: paramCustomerName, id: paramCustomerId, phone: paramCustomerPhone }
          : undefined,
      );

      // URL 파라미터 정리
      const cleanParams = new URLSearchParams();
      cleanParams.set('year', currentYear === 0 ? 'all' : currentYear.toString());
      cleanParams.set('month', currentMonth === 0 ? 'all' : currentMonth.toString());
      if (currentDay !== 0) cleanParams.set('day', currentDay.toString());
      router.replace(`/admin/sales?${cleanParams.toString()}`, { scroll: false });
    }
  }, [searchParams, router, currentYear, currentMonth, currentDay, onOpenCreate]);
}
