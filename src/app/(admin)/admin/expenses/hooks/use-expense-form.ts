'use client';

import type {FormEvent} from 'react';
import {useEffect, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';

import {createExpense, getExpenseSuggestions, updateExpense} from '@/lib/actions/expenses';
import {updateExpenseInstanceOnly, updateRecurringFromInstance} from '@/lib/actions/recurring-expenses';
import type {ExpensePaymentMethod} from '@/lib/actions/expense-settings';
import type {Expense} from '@/types/database';

/**
 * 지출 등록/수정 폼 상태 + 제출 로직 + 고정비 '이것만/이후 모두' 분기. expenses-client에서 이동.
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

  // 자동생성된(고정비) 지출 수정 시 "이것만 / 이후 모두" 분기
  const [pendingScopeEdit, setPendingScopeEdit] = useState<null | { expenseId: string; fields: Parameters<typeof updateExpenseInstanceOnly>[1] }>(null);
  const [scopeBusy, startScopeTransition] = useTransition();
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
    const isRecurringInstance = !!editingExpense.recurring_id;

    if (isRecurringInstance) {
      const unitPrice = parseInt(formData.get('unit_price') as string) || 0;
      const quantity = parseInt(formData.get('quantity') as string) || 1;
      const fields = {
        date: String(formData.get('date') ?? editingExpense.date),
        item_name: String(formData.get('item_name') ?? ''),
        category_id: String(formData.get('category_id') ?? ''),
        unit_price: unitPrice,
        quantity,
        payment_method_id: String(formData.get('payment_method_id') ?? ''),
        vendor: (formData.get('vendor') as string) || null,
        note: (formData.get('memo') as string) || null,
      };
      setPendingScopeEdit({ expenseId: editingExpense.id, fields });
      return;
    }

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

  const handleScopeEditConfirm = (scope: 'instance' | 'future') => {
    if (!pendingScopeEdit) return;
    const pending = pendingScopeEdit;
    startScopeTransition(async () => {
      try {
        if (scope === 'instance') {
          await updateExpenseInstanceOnly(pending.expenseId, pending.fields);
          toast.success('이 항목만 수정되었습니다');
        } else {
          await updateRecurringFromInstance(pending.expenseId, pending.fields);
          toast.success('이후 모든 항목에 반영되었습니다');
        }
        setPendingScopeEdit(null);
        setEditingExpense(null);
        onCloseDetail();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '수정에 실패했습니다');
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
    pendingScopeEdit,
    setPendingScopeEdit,
    scopeBusy,
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
    handleScopeEditConfirm,
    handleEdit,
  };
}
