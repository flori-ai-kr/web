export type ExpenseCategory = 'flower_purchase' | 'delivery' | 'advertising' | 'rent' | 'utilities' | 'supplies' | 'other';

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  item_name: string;
  category_id: string | null;
  category_label: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  payment_method_id: string | null;
  payment_method_label: string | null;
  card_company?: string;
  vendor?: string;
  memo?: string;
  recurring_id?: string | null;
  is_recurring_modified?: boolean;
  created_at: string;
  updated_at: string;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';
export interface YearlyDate { m: number; d: number; }

export interface RecurringExpense {
  id: string;
  user_id: string;
  item_name: string;
  category_id: string | null;
  category_label: string | null;
  unit_price: number;
  quantity: number;
  payment_method_id: string | null;
  payment_method_label: string | null;
  vendor?: string | null;
  memo?: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  days_of_week: number[];       // weekly: 0(일)~6(토) 배열
  days_of_month: number[];      // monthly: 1~31 배열
  yearly_dates: YearlyDate[];   // yearly: [{m,d}] 배열
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
