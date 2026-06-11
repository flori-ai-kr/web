'use client';

import {useOptimistic, useState, useTransition, type Dispatch, type SetStateAction} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';

import {deleteSale} from '@/lib/actions/sales';
import type {Sale} from '@/types/database';

/**
 * 매출 삭제 확인 + 낙관적 목록 제거(서버 실패 시 자동 롤백). sales-client에서 이동.
 */
export function useSaleDelete({
  sales,
  setSales,
  onCloseDetail,
}: {
  sales: Sale[];
  setSales: Dispatch<SetStateAction<Sale[]>>;
  onCloseDetail: () => void;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticSales, removeOptimisticSale] = useOptimistic(
    sales,
    (list, deletedId: string) => list.filter((s) => s.id !== deletedId),
  );

  const handleDelete = (sale: Sale) => {
    setDeleteTarget(sale);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    onCloseDetail();
    startDeleteTransition(async () => {
      removeOptimisticSale(target.id);
      try {
        await deleteSale(target.id);
        // 로컬 목록에서도 제거해 새로고침 전까지 깜빡임 없이 유지(요약은 refresh로 갱신).
        setSales((prev) => prev.filter((s) => s.id !== target.id));
        router.refresh();
        toast.success('매출이 삭제되었습니다');
      } catch (error) {
        console.error('Failed to delete sale:', error);
        toast.error('매출 삭제에 실패했습니다');
      }
    });
  };

  return {
    optimisticSales,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    confirmDelete,
  };
}
