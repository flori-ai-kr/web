'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import type {Expense, ExpenseCategory, PaymentMethod} from '@/types/database';
import {expenseSchema} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// Kotlin /expenses 응답의 단일 지출 (camelCase). 서버 계약(ExpenseResponse)과 1:1.
interface KotlinExpense {
  id: string;
  date: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
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
function mapKotlinExpense(e: KotlinExpense): Expense {
  return {
    id: e.id,
    user_id: '',
    date: e.date,
    item_name: e.itemName,
    category: e.category as ExpenseCategory,
    unit_price: e.unitPrice,
    quantity: e.quantity,
    total_amount: e.totalAmount,
    payment_method: e.paymentMethod as PaymentMethod,
    card_company: e.cardCompany ?? undefined,
    vendor: e.vendor ?? undefined,
    memo: e.memo ?? undefined,
    recurring_id: e.recurringId,
    is_recurring_modified: e.isRecurringModified,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

async function _getExpenses(month?: string): Promise<Expense[]> {
  await requireAuth();

  // Kotlin monthRange가 "YYYY" / "YYYY-MM-DD" / "YYYY-MM" 세 형식을 모두 해석한다.
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  const qs = params.toString();

  const rows = await apiFetch<KotlinExpense[]>(`/expenses${qs ? `?${qs}` : ''}`);
  return rows.map(mapKotlinExpense);
}

export const getExpenses = withErrorLogging('getExpenses', _getExpenses);

async function _getExpenseById(id: string): Promise<Expense | null> {
  await requireAuth();
  try {
    const row = await apiFetch<KotlinExpense>(`/expenses/${id}`);
    return mapKotlinExpense(row);
  } catch (err) {
    // 존재하지 않으면 null
    if (err instanceof AppError && err.code === ErrorCode.NOT_FOUND) return null;
    throw err;
  }
}

export const getExpenseById = withErrorLogging('getExpenseById', _getExpenseById);

async function _createExpense(formData: FormData) {
  await requireAuth();

  const unitPrice = parseInt(formData.get('unit_price') as string) || 0;
  const quantity = parseInt(formData.get('quantity') as string) || 1;

  const parsed = expenseSchema.safeParse({
    date: formData.get('date'),
    item_name: formData.get('item_name'),
    category: formData.get('category'),
    unit_price: unitPrice,
    quantity: quantity,
    payment_method: formData.get('payment_method'),
    card_company: formData.get('card_company') || null,
    vendor: formData.get('vendor') || null,
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // total_amount는 서버(SSOT)가 unit_price*quantity로 계산한다.
  const row = await apiFetch<KotlinExpense>('/expenses', {
    method: 'POST',
    body: JSON.stringify({
      date: parsed.data.date,
      itemName: parsed.data.item_name,
      category: parsed.data.category,
      unitPrice: parsed.data.unit_price,
      quantity: parsed.data.quantity,
      paymentMethod: parsed.data.payment_method,
      cardCompany: parsed.data.card_company || null,
      vendor: parsed.data.vendor || null,
      memo: parsed.data.memo || null,
    }),
  });

  revalidatePath('/admin/expenses');
  return mapKotlinExpense(row);
}

export const createExpense = withErrorLogging('createExpense', _createExpense);

async function _updateExpense(id: string, formData: FormData) {
  await requireAuth();

  const unitPrice = parseInt(formData.get('unit_price') as string) || 0;
  const quantity = parseInt(formData.get('quantity') as string) || 1;

  const parsed = expenseSchema.safeParse({
    date: formData.get('date'),
    item_name: formData.get('item_name'),
    category: formData.get('category'),
    unit_price: unitPrice,
    quantity: quantity,
    payment_method: formData.get('payment_method'),
    card_company: formData.get('card_company') || null,
    vendor: formData.get('vendor') || null,
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // total_amount는 서버(SSOT)가 재계산한다.
  await apiFetch<KotlinExpense>(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      date: parsed.data.date,
      itemName: parsed.data.item_name,
      category: parsed.data.category,
      unitPrice: parsed.data.unit_price,
      quantity: parsed.data.quantity,
      paymentMethod: parsed.data.payment_method,
      cardCompany: parsed.data.card_company || null,
      vendor: parsed.data.vendor || null,
      memo: parsed.data.memo || null,
    }),
  });

  revalidatePath('/admin/expenses');
}

export const updateExpense = withErrorLogging('updateExpense', _updateExpense);

async function _deleteExpense(id: string) {
  await requireAuth();
  await apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });

  revalidatePath('/admin/expenses');
}

export const deleteExpense = withErrorLogging('deleteExpense', _deleteExpense);

/**
 * 지출 물품명/거래처/메모 자동완성용 과거 값 조회.
 */
async function _getExpenseSuggestions(): Promise<{ itemNames: string[]; vendors: string[]; memos: string[] }> {
  await requireAuth();
  return apiFetch<{ itemNames: string[]; vendors: string[]; memos: string[] }>('/expenses/suggestions');
}

export const getExpenseSuggestions = withErrorLogging('getExpenseSuggestions', _getExpenseSuggestions);
