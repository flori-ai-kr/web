'use client';

import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

import {getCustomerById, getCustomerSales} from '@/lib/actions/customers';
import type {Customer, Sale} from '@/types/database';

/**
 * 고객 상세 다이얼로그 오픈 + 매출 이력 페이지네이션 + URL 딥링크(?customerId=) 자동 오픈. customers-client에서 이동.
 */
export function useCustomerDetail({ initialCustomers }: { initialCustomers: Customer[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingMoreSales, setIsLoadingMoreSales] = useState(false);
  const [hasMoreSales, setHasMoreSales] = useState(false);
  const [salesPage, setSalesPage] = useState(0);

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSales([]);
    setSalesPage(0);
    setHasMoreSales(false);
    setIsLoadingSales(true);
    try {
      const result = await getCustomerSales(customer.id, 0);
      setCustomerSales(result.sales);
      setHasMoreSales(result.hasMore);
    } catch (error) {
      console.error('Failed to load customer sales:', error);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleLoadMoreSales = async () => {
    if (!selectedCustomer || isLoadingMoreSales || !hasMoreSales) return;
    const nextPage = salesPage + 1;
    setIsLoadingMoreSales(true);
    try {
      const result = await getCustomerSales(selectedCustomer.id, nextPage);
      setCustomerSales((prev) => [...prev, ...result.sales]);
      setHasMoreSales(result.hasMore);
      setSalesPage(nextPage);
    } catch (error) {
      console.error('Failed to load more sales:', error);
    } finally {
      setIsLoadingMoreSales(false);
    }
  };

  // URL 파라미터로 고객 상세 자동 오픈 (매출·사진첩 페이지에서 연결)
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (!customerId) return;
    router.replace('/admin/customers', { scroll: false });

    const customer = initialCustomers.find(c => c.id === customerId);
    if (customer) {
      handleSelectCustomer(customer);
      return;
    }
    // 현재 로드된 목록에 없으면(다른 페이지 고객) 단건 조회로 상세를 연다.
    void getCustomerById(customerId)
      .then((fetched) => {
        if (fetched) handleSelectCustomer(fetched);
      })
      .catch((error) => {
        console.error('Failed to load customer for deep link:', error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    selectedCustomer,
    setSelectedCustomer,
    customerSales,
    isLoadingSales,
    isLoadingMoreSales,
    hasMoreSales,
    handleSelectCustomer,
    handleLoadMoreSales,
  };
}
