'use client';

import { LabelSettingsManager, type LabelTabConfig } from '@/components/settings/label-settings-manager';
import {
  ExpenseCategory,
  ExpensePaymentMethod,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpensePaymentMethod,
  updateExpensePaymentMethod,
  deleteExpensePaymentMethod,
} from '@/lib/actions/expense-settings';

interface ExpenseSettingsModalProps {
  open: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  payments: ExpensePaymentMethod[];
  onRefresh: () => void;
}

export function ExpenseSettingsModal({
  open,
  onClose,
  categories,
  payments,
  onRefresh,
}: ExpenseSettingsModalProps) {
  const tabs: LabelTabConfig[] = [
    {
      key: 'category',
      tabLabel: '카테고리',
      addPlaceholder: '새 카테고리 이름',
      items: categories,
      onCreate: createExpenseCategory,
      onUpdate: updateExpenseCategory,
      onDelete: deleteExpenseCategory,
    },
    {
      key: 'payment',
      tabLabel: '결제방식',
      addPlaceholder: '새 결제방식 이름',
      items: payments,
      onCreate: createExpensePaymentMethod,
      onUpdate: updateExpensePaymentMethod,
      onDelete: deleteExpensePaymentMethod,
    },
  ];

  return (
    <LabelSettingsManager
      open={open}
      onClose={onClose}
      title="지출 설정"
      tabs={tabs}
      onRefresh={onRefresh}
    />
  );
}
