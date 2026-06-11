import type {Expense, RecurringExpense, RecurringFrequency, YearlyDate} from '@/types/expenses';

// Kotlin ExpenseResponse (camelCase). 서버 계약과 1:1.
export interface KotlinExpense {
  id: string;
  date: string;
  itemName: string;
  categoryId: number | string | null;
  categoryLabel: string | null;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  paymentMethodId: number | string | null;
  paymentMethodLabel: string | null;
  cardCompany: string | null;
  vendor: string | null;
  memo: string | null;
  recurringId: string | null;
  isRecurringModified: boolean;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 Expense 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
export function mapKotlinExpense(e: KotlinExpense): Expense {
  return {
    id: e.id,
    user_id: '',
    date: e.date,
    item_name: e.itemName,
    category_id: e.categoryId != null ? String(e.categoryId) : null,
    category_label: e.categoryLabel,
    unit_price: e.unitPrice,
    quantity: e.quantity,
    total_amount: e.totalAmount,
    payment_method_id: e.paymentMethodId != null ? String(e.paymentMethodId) : null,
    payment_method_label: e.paymentMethodLabel,
    card_company: e.cardCompany ?? undefined,
    vendor: e.vendor ?? undefined,
    memo: e.memo ?? undefined,
    recurring_id: e.recurringId,
    is_recurring_modified: e.isRecurringModified,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

// Kotlin RecurringExpenseResponse (camelCase). 서버 계약과 1:1.
export interface KotlinRecurringExpense {
  id: string;
  itemName: string;
  categoryId: number | string | null;
  categoryLabel: string | null;
  unitPrice: number;
  quantity: number;
  paymentMethodId: number | string | null;
  paymentMethodLabel: string | null;
  vendor: string | null;
  memo: string | null;
  frequency: string;
  intervalCount: number;
  daysOfWeek: number[];
  daysOfMonth: number[];
  yearlyDates: YearlyDate[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapKotlinRecurring(r: KotlinRecurringExpense): RecurringExpense {
  return {
    id: r.id,
    user_id: '',
    item_name: r.itemName,
    category_id: r.categoryId != null ? String(r.categoryId) : null,
    category_label: r.categoryLabel,
    unit_price: r.unitPrice,
    quantity: r.quantity,
    payment_method_id: r.paymentMethodId != null ? String(r.paymentMethodId) : null,
    payment_method_label: r.paymentMethodLabel,
    vendor: r.vendor,
    memo: r.memo,
    frequency: r.frequency as RecurringFrequency,
    interval_count: r.intervalCount,
    days_of_week: r.daysOfWeek,
    days_of_month: r.daysOfMonth,
    yearly_dates: r.yearlyDates,
    start_date: r.startDate,
    end_date: r.endDate,
    is_active: r.isActive,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}
