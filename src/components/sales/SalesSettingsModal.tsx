'use client';

import { LabelSettingsManager, type LabelTabConfig } from '@/components/settings/label-settings-manager';
import {
  SaleCategory,
  PaymentMethod,
  SaleChannel,
  createSaleCategory,
  updateSaleCategory,
  deleteSaleCategory,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  createSaleChannel,
  updateSaleChannel,
  deleteSaleChannel,
} from '@/lib/actions/sale-settings';

interface SalesSettingsModalProps {
  open: boolean;
  onClose: () => void;
  categories: SaleCategory[];
  payments: PaymentMethod[];
  channels: SaleChannel[];
  onRefresh: () => void;
}

export function SalesSettingsModal({
  open,
  onClose,
  categories,
  payments,
  channels,
  onRefresh,
}: SalesSettingsModalProps) {
  const tabs: LabelTabConfig[] = [
    {
      key: 'category',
      tabLabel: '카테고리',
      addPlaceholder: '새 카테고리 이름',
      items: categories,
      onCreate: createSaleCategory,
      onUpdate: updateSaleCategory,
      onDelete: deleteSaleCategory,
    },
    {
      key: 'payment',
      tabLabel: '결제방식',
      addPlaceholder: '새 결제방식 이름',
      items: payments,
      onCreate: (label) => createPaymentMethod(label),
      onUpdate: updatePaymentMethod,
      onDelete: deletePaymentMethod,
    },
    {
      key: 'channel',
      tabLabel: '채널',
      addPlaceholder: '새 채널 이름',
      items: channels,
      onCreate: createSaleChannel,
      onUpdate: updateSaleChannel,
      onDelete: deleteSaleChannel,
    },
  ];

  return (
    <LabelSettingsManager
      open={open}
      onClose={onClose}
      title="매출 설정"
      tabs={tabs}
      onRefresh={onRefresh}
    />
  );
}
