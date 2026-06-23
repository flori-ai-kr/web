'use client';

import type {FormEvent} from 'react';
import {useEffect, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';

import {createExpense, getExpenseSuggestions, updateExpense} from '@/lib/actions/expenses';
import type {ExpensePaymentMethod} from '@/lib/actions/expense-settings';
import type {Expense} from '@/types/database';

/**
 * 지출 등록/수정 폼 상태 + 제출 로직.
 * 고정비 자동생성 건도 일반 지출과 동일하게 수정한다(이것만/이후 모두 분기 없음 — 템플릿 변경은 고정비 관리 모달에서).
 */
export function useExpenseForm({
  payments,
  onCloseDetail,
}: {
  payments: ExpensePaymentMethod[];
  onCloseDetail: () => void;
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [noteValue, setNoteValue] = useState('');
  const [editNoteValue, setEditNoteValue] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(payments[0]?.id ?? '');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');

  const [expenseSuggestions, setExpenseSuggestions] = useState<{ itemNames: string[]; vendors: string[]; memos: string[] }>({ itemNames: [], vendors: [], memos: [] });
  const [createItemName, setCreateItemName] = useState('');
  const [createVendor, setCreateVendor] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editVendor, setEditVendor] = useState('');

  // 폼/수정 다이얼로그 열릴 때 자동완성 데이터 로드
  useEffect(() => {
    if (isFormOpen || editingExpense) {
      getExpenseSuggestions().then(setExpenseSuggestions).catch(() => {});
    }
  }, [isFormOpen, editingExpense]);

  // 등록 폼 닫힐 때 controlled 값 초기화
  useEffect(() => {
    if (!isFormOpen) {
      setCreateItemName('');
      setCreateVendor('');
      setNoteValue('');
    }
  }, [isFormOpen]);

  // 수정 폼 열릴 때 controlled 값 초기화
  useEffect(() => {
    if (editingExpense) {
      setEditItemName(editingExpense.item_name);
      setEditVendor(editingExpense.vendor || '');
      setEditNoteValue(editingExpense.memo || '');
    }
  }, [editingExpense]);

  const handleOpenForm = () => {
    setIsFormOpen(true);
    setNoteValue('');
    setSelectedPaymentMethod(payments[0]?.id ?? '');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmitTransition(async () => {
      try {
        await createExpense(formData);
        setIsFormOpen(false);
        router.refresh();
        toast.success('지출이 등록되었습니다');
      } catch (error) {
        console.error('Failed to create expense:', error);
        toast.error('지출 등록에 실패했습니다');
      }
    });
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;

    const formData = new FormData(e.currentTarget);
    // 고정비 자동생성 건도 일반 지출과 동일하게 그 건만 수정.
    const target = editingExpense;
    startSubmitTransition(async () => {
      try {
        await updateExpense(target.id, formData);
        setEditingExpense(null);
        onCloseDetail();
        router.refresh();
        toast.success('지출이 수정되었습니다');
      } catch (error) {
        console.error('Failed to update expense:', error);
        toast.error('지출 수정에 실패했습니다');
      }
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditNoteValue(expense.memo || '');
    setEditPaymentMethod(expense.payment_method_id ?? '');
    onCloseDetail();
  };

  return {
    isFormOpen,
    setIsFormOpen,
    editingExpense,
    setEditingExpense,
    isSubmitting,
    noteValue,
    setNoteValue,
    editNoteValue,
    setEditNoteValue,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    editPaymentMethod,
    setEditPaymentMethod,
    expenseSuggestions,
    createItemName,
    setCreateItemName,
    createVendor,
    setCreateVendor,
    editItemName,
    setEditItemName,
    editVendor,
    setEditVendor,
    handleOpenForm,
    handleSubmit,
    handleUpdate,
    handleEdit,
  };
}
