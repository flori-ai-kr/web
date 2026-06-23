'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import type {Expense} from '@/types/database';
import {expenseSchema} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';
import {mapKotlinExpense, type KotlinExpense} from '@/lib/api/mappers/expenses';

const EXPENSES_PAGE_SIZE = 100;

export interface ExpenseFilters {
  category?: string[];
  payment?: string[];
  search?: string;
}

export interface ExpenseCategorySlice {
  category_id: string | null;
  category_label: string;
  amount: number;
}

interface KotlinExpensePage {
  expenses: KotlinExpense[];
  hasMore: boolean;
}

async function _getExpenses(
  month?: string,
  offset: number = 0,
  limit: number = EXPENSES_PAGE_SIZE,
  filters?: ExpenseFilters,
  dateRange?: { startDate: string; endDate: string },
) {
  await requireAuth();

  const params = new URLSearchParams();
  params.set('offset', String(offset));
  params.set('limit', String(limit));
  if (dateRange) {
    params.set('startDate', dateRange.startDate);
    params.set('endDate', dateRange.endDate);
  } else if (month) {
    params.set('month', month);
  }
  for (const c of filters?.category ?? []) params.append('category', c);
  for (const p of filters?.payment ?? []) params.append('payment', p);
  if (filters?.search) params.set('search', filters.search.slice(0, 100));

  const page = await apiFetch<KotlinExpensePage>(`/expenses?${params.toString()}`);
  return {
    expenses: page.expenses.map(mapKotlinExpense),
    hasMore: page.hasMore,
  };
}

export const getExpenses = withErrorLogging('getExpenses', _getExpenses);

// 인증은 위임된 _getExpenses 내부 requireAuth()로 보장된다(중복 /me 방지). 분리 리팩터 시 여기 가드 추가 필요.
async function _loadMoreExpenses(
  month: string | null,
  offset: number,
  filters?: ExpenseFilters,
  dateRange?: { startDate: string; endDate: string },
) {
  return _getExpenses(month ?? undefined, offset, EXPENSES_PAGE_SIZE, filters, dateRange);
}

export const loadMoreExpenses = withErrorLogging('loadMoreExpenses', _loadMoreExpenses);

interface KotlinExpensesSummary {
  total: number;
  count: number;
  byCategory: { categoryId: number | string | null; categoryLabel: string; amount: number }[];
}

async function _getExpensesSummary(
  month?: string,
  filters?: ExpenseFilters,
  dateRange?: { startDate: string; endDate: string },
) {
  await requireAuth();

  const params = new URLSearchParams();
  if (dateRange) {
    params.set('startDate', dateRange.startDate);
    params.set('endDate', dateRange.endDate);
  } else if (month) {
    params.set('month', month);
  }
  for (const c of filters?.category ?? []) params.append('category', c);
  for (const p of filters?.payment ?? []) params.append('payment', p);
  if (filters?.search) params.set('search', filters.search.slice(0, 100));

  const data = await apiFetch<KotlinExpensesSummary>(`/expenses/summary?${params.toString()}`);

  return {
    total: data?.total ?? 0,
    count: data?.count ?? 0,
    byCategory: (data?.byCategory ?? []).map((s): ExpenseCategorySlice => ({
      category_id: s.categoryId != null ? String(s.categoryId) : null,
      category_label: s.categoryLabel,
      amount: s.amount,
    })),
  };
}

export const getExpensesSummary = withErrorLogging('getExpensesSummary', _getExpensesSummary);

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
    category_id: formData.get('category_id'),
    unit_price: unitPrice,
    quantity: quantity,
    payment_method_id: formData.get('payment_method_id'),
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
      categoryId: Number(parsed.data.category_id),
      unitPrice: parsed.data.unit_price,
      quantity: parsed.data.quantity,
      paymentMethodId: Number(parsed.data.payment_method_id),
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
    category_id: formData.get('category_id'),
    unit_price: unitPrice,
    quantity: quantity,
    payment_method_id: formData.get('payment_method_id'),
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
      categoryId: Number(parsed.data.category_id),
      unitPrice: parsed.data.unit_price,
      quantity: parsed.data.quantity,
      paymentMethodId: Number(parsed.data.payment_method_id),
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
