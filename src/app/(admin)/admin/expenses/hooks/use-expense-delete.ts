'use client';

import type {Dispatch, SetStateAction} from 'react';
import {useOptimistic, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';

import {deleteExpense} from '@/lib/actions/expenses';
import {deleteExpenseInstanceOnly} from '@/lib/actions/recurring-expenses';
import type {Expense} from '@/types/database';

/**
 * 지출 삭제 확인 + 낙관적 목록 제거.
 * 고정비 자동생성 건도 일반 지출과 동일하게 그 건만 삭제(skip 마커로 재생성 방지). 템플릿 종료는 고정비 관리 모달에서.
 */
export function useExpenseDelete({
  allExpenses,
  setAllExpenses,
  onCloseDetail,
}: {
  allExpenses: Expense[];
  setAllExpenses: Dispatch<SetStateAction<Expense[]>>;
  onCloseDetail: () => void;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticExpenses, removeOptimisticExpense] = useOptimistic(
    allExpenses,
    (list, deletedId: string) => list.filter((e) => e.id !== deletedId),
  );

  const handleDelete = (expense: Expense) => {
    setDeleteTarget(expense);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    onCloseDetail();
    startDeleteTransition(async () => {
      removeOptimisticExpense(target.id);
      try {
        // 고정비 자동생성 건은 그 건만 삭제(scope=this — skip 마커로 재생성 방지). 그 외 일반 삭제.
        if (target.recurring_id) {
          await deleteExpenseInstanceOnly(target.id);
        } else {
          await deleteExpense(target.id);
        }
        toast.success('지출이 삭제되었습니다');
        setAllExpenses((prev) => prev.filter((e) => e.id !== target.id));
        router.refresh();
      } catch (error) {
        console.error('Failed to delete expense:', error);
        toast.error('지출 삭제에 실패했습니다');
      }
    });
  };

  return {
    optimisticExpenses,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    confirmDelete,
  };
}
