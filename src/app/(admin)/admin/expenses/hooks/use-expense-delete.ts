'use client';

import type {Dispatch, SetStateAction} from 'react';
import {useOptimistic, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';

import {deleteExpense} from '@/lib/actions/expenses';
import {deleteExpenseInstanceOnly, deleteRecurringFromInstance} from '@/lib/actions/recurring-expenses';
import type {Expense} from '@/types/database';

/**
 * 지출 삭제 확인 + 낙관적 목록 제거(고정비 '이것만/이후 모두' 포함). expenses-client에서 이동.
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

  const confirmDelete = (scope?: 'instance' | 'future') => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    onCloseDetail();
    startDeleteTransition(async () => {
      removeOptimisticExpense(target.id);
      if (target.recurring_id && scope === 'future') {
        allExpenses
          .filter((e) => e.recurring_id === target.recurring_id && e.date > target.date)
          .forEach((e) => removeOptimisticExpense(e.id));
      }
      try {
        if (target.recurring_id && scope === 'instance') {
          await deleteExpenseInstanceOnly(target.id);
          toast.success('이 항목만 삭제되었습니다');
        } else if (target.recurring_id && scope === 'future') {
          await deleteRecurringFromInstance(target.id);
          toast.success('이후 모든 반복이 종료되었습니다');
        } else {
          await deleteExpense(target.id);
          toast.success('지출이 삭제되었습니다');
        }
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
