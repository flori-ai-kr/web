'use client';

import {useOptimistic, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';

import {deleteCustomer} from '@/lib/actions/customers';
import type {Customer} from '@/types/database';

/**
 * 고객 삭제 확인 + 낙관적 목록 제거(서버 실패 시 자동 롤백). customers-client에서 이동.
 */
export function useCustomerDelete({
  initialCustomers,
  onCloseDetail,
}: {
  initialCustomers: Customer[];
  onCloseDetail: () => void;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 낙관적 삭제: 즉시 카드를 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticCustomers, removeOptimisticCustomer] = useOptimistic(
    initialCustomers,
    (list, deletedId: string) => list.filter((c) => c.id !== deletedId),
  );

  const handleDelete = (customer: Customer) => {
    setDeleteTarget(customer);
    onCloseDetail();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    onCloseDetail();
    startDeleteTransition(async () => {
      removeOptimisticCustomer(target.id);
      try {
        await deleteCustomer(target.id);
        router.refresh();
        toast.success('고객이 삭제되었습니다');
      } catch (error) {
        console.error('Failed to delete customer:', error);
        toast.error('고객 삭제에 실패했습니다');
      }
    });
  };

  return {
    optimisticCustomers,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    confirmDelete,
  };
}
