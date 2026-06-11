export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'naverpay' | 'unpaid';

export const PAYMENT_METHODS = [
  { value: 'card', label: '카드' },
  { value: 'naverpay', label: '네이버페이' },
  { value: 'transfer', label: '계좌이체' },
  { value: 'cash', label: '현금' },
] as const;

export interface Sale {
  id: string;
  user_id: string;
  date: string;
  category_id: string | null;
  category_label: string | null;
  amount: number;
  payment_method_id: string | null;
  payment_method_label: string | null;
  channel_id: string | null;
  channel_label: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  memo?: string;
  is_unpaid: boolean;
  has_review: boolean;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export interface SaleCategory {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface SalePaymentMethod {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}
