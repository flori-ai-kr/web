'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {idSchema, recurringExpenseSchema} from '@/lib/validations';
import type {RecurringExpense, RecurringFrequency, YearlyDate} from '@/types/database';
import {apiFetch} from '@/lib/api/client';
import {mapKotlinRecurring, type KotlinRecurringExpense} from '@/lib/api/mappers/expenses';

type RuleShape = Pick<
  RecurringExpense,
  'frequency' | 'interval_count' | 'days_of_week' | 'days_of_month' | 'yearly_dates' | 'start_date' | 'end_date'
>;

function nextOccurrenceSync(rule: RuleShape, from: Date): Date | null {
  const start = new Date(rule.start_date + 'T00:00:00');
  const end = rule.end_date ? new Date(rule.end_date + 'T00:00:00') : null;
  const search = from < start ? new Date(start) : new Date(from);
  search.setHours(0, 0, 0, 0);

  const inRange = (d: Date) => (!end || d <= end);

  if (rule.frequency === 'weekly') {
    const dows = (rule.days_of_week ?? []).slice().sort((a, b) => a - b);
    if (dows.length === 0) return null;
    const interval = rule.interval_count || 1;
    // 최대 7*interval일 내에 반드시 매칭
    for (let i = 0; i < 7 * interval + 7; i++) {
      const cur = new Date(search);
      cur.setDate(cur.getDate() + i);
      if (!dows.includes(cur.getDay())) continue;
      const weeksFromStart = Math.floor((cur.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (((weeksFromStart % interval) + interval) % interval !== 0) continue;
      if (inRange(cur)) return cur;
    }
    return null;
  }

  if (rule.frequency === 'monthly') {
    const doms = (rule.days_of_month ?? []).slice().sort((a, b) => a - b);
    if (doms.length === 0) return null;
    const interval = rule.interval_count || 1;
    let year = search.getFullYear();
    let month = search.getMonth();
    for (let i = 0; i < 240; i++) {
      const monthsFromStart = (year - start.getFullYear()) * 12 + (month - start.getMonth());
      if (monthsFromStart >= 0 && monthsFromStart % interval === 0) {
        const lastDay = new Date(year, month + 1, 0).getDate();
        for (const dom of doms) {
          const actualDay = Math.min(dom, lastDay);
          const candidate = new Date(year, month, actualDay);
          if (candidate >= search && inRange(candidate)) return candidate;
        }
      }
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      if (end && new Date(year, month, 1) > end) return null;
    }
    return null;
  }

  if (rule.frequency === 'yearly') {
    const dates = rule.yearly_dates ?? [];
    if (dates.length === 0) return null;
    const interval = rule.interval_count || 1;
    const sorted = dates.slice().sort((a, b) => (a.m - b.m) || (a.d - b.d));
    let year = search.getFullYear();
    for (let i = 0; i < 50; i++) {
      const yearsFromStart = year - start.getFullYear();
      if (yearsFromStart >= 0 && yearsFromStart % interval === 0) {
        for (const yd of sorted) {
          const mo = yd.m - 1;
          const lastDay = new Date(year, mo + 1, 0).getDate();
          const actualDay = Math.min(yd.d, lastDay);
          const candidate = new Date(year, mo, actualDay);
          if (candidate >= search && inRange(candidate)) return candidate;
        }
      }
      year += 1;
      if (end && new Date(year, 0, 1) > end) return null;
    }
    return null;
  }

  return null;
}

export async function nextOccurrenceISO(rule: RecurringExpense, fromISO?: string): Promise<string | null> {
  const from = fromISO ? new Date(fromISO + 'T00:00:00') : new Date();
  const next = nextOccurrenceSync(rule, from);
  if (!next) return null;
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// CRUD (Kotlin /recurring-expenses)
// ─────────────────────────────────────────────────────────────

async function _getRecurringExpenses(): Promise<RecurringExpense[]> {
  await requireAuth();
  const rows = await apiFetch<KotlinRecurringExpense[]>('/recurring-expenses');
  return rows.map(mapKotlinRecurring);
}

export const getRecurringExpenses = withErrorLogging('getRecurringExpenses', _getRecurringExpenses);

type RecurringInput = {
  item_name: string;
  category_id: string;
  unit_price: number;
  quantity: number;
  payment_method_id: string;
  vendor?: string | null;
  memo?: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  days_of_week: number[];
  days_of_month: number[];
  yearly_dates: YearlyDate[];
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
};

// snake_case(웹 입력) → camelCase(Kotlin RecurringExpenseRequest, 전체 교체).
function toRecurringRequest(input: RecurringInput) {
  return {
    itemName: input.item_name,
    categoryId: Number(input.category_id),
    unitPrice: input.unit_price,
    quantity: input.quantity,
    paymentMethodId: Number(input.payment_method_id),
    vendor: input.vendor ?? null,
    memo: input.memo ?? null,
    frequency: input.frequency,
    intervalCount: input.interval_count,
    daysOfWeek: input.days_of_week,
    daysOfMonth: input.days_of_month,
    yearlyDates: input.yearly_dates,
    startDate: input.start_date,
    endDate: input.end_date ?? null,
    isActive: input.is_active,
  };
}

async function _createRecurringExpense(input: RecurringInput): Promise<RecurringExpense> {
  await requireAuth();
  const parsed = recurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다');
  }
  const row = await apiFetch<KotlinRecurringExpense>('/recurring-expenses', {
    method: 'POST',
    body: JSON.stringify(toRecurringRequest(parsed.data as RecurringInput)),
  });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
  return mapKotlinRecurring(row);
}

export const createRecurringExpense = withErrorLogging('createRecurringExpense', _createRecurringExpense);

async function _updateRecurringExpense(id: string, input: RecurringInput): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const parsed = recurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다');
  }
  await apiFetch<KotlinRecurringExpense>(`/recurring-expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toRecurringRequest(parsed.data as RecurringInput)),
  });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const updateRecurringExpense = withErrorLogging('updateRecurringExpense', _updateRecurringExpense);

async function _deleteRecurringExpense(id: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  await apiFetch<void>(`/recurring-expenses/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const deleteRecurringExpense = withErrorLogging('deleteRecurringExpense', _deleteRecurringExpense);

async function _toggleRecurringExpenseActive(id: string, isActive: boolean): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  await apiFetch<KotlinRecurringExpense>(`/recurring-expenses/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ isActive }),
  });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const toggleRecurringExpenseActive = withErrorLogging('toggleRecurringExpenseActive', _toggleRecurringExpenseActive);

// ─────────────────────────────────────────────────────────────
// iOS 스타일 "이것만 / 이후 모두" 분기 (scope=this|all)
// ─────────────────────────────────────────────────────────────

// 인스턴스 부분 수정 입력(snake_case) → camelCase(RecurringInstanceUpdateRequest).
function toInstanceRequest(fields: Partial<RecurringInput> & { date?: string }) {
  const body: Record<string, unknown> = {};
  if (fields.date !== undefined) body.date = fields.date;
  if (fields.item_name !== undefined) body.itemName = fields.item_name;
  if (fields.category_id !== undefined) body.categoryId = Number(fields.category_id);
  if (fields.unit_price !== undefined) body.unitPrice = fields.unit_price;
  if (fields.quantity !== undefined) body.quantity = fields.quantity;
  if (fields.payment_method_id !== undefined) body.paymentMethodId = Number(fields.payment_method_id);
  if (fields.vendor !== undefined) body.vendor = fields.vendor;
  if (fields.memo !== undefined) body.memo = fields.memo;
  return body;
}

async function _updateExpenseInstanceOnly(expenseId: string, fields: Partial<RecurringInput> & { date: string }): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  await apiFetch<void>(`/recurring-expenses/instances/${expenseId}?scope=this`, {
    method: 'PATCH',
    body: JSON.stringify(toInstanceRequest(fields)),
  });
  revalidatePath('/admin/expenses');
}

export const updateExpenseInstanceOnly = withErrorLogging('updateExpenseInstanceOnly', _updateExpenseInstanceOnly);

async function _updateRecurringFromInstance(expenseId: string, fields: Partial<RecurringInput>): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  await apiFetch<void>(`/recurring-expenses/instances/${expenseId}?scope=all`, {
    method: 'PATCH',
    body: JSON.stringify(toInstanceRequest(fields)),
  });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const updateRecurringFromInstance = withErrorLogging('updateRecurringFromInstance', _updateRecurringFromInstance);

async function _deleteExpenseInstanceOnly(expenseId: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  await apiFetch<void>(`/recurring-expenses/instances/${expenseId}?scope=this`, { method: 'DELETE' });
  revalidatePath('/admin/expenses');
}

export const deleteExpenseInstanceOnly = withErrorLogging('deleteExpenseInstanceOnly', _deleteExpenseInstanceOnly);

async function _deleteRecurringFromInstance(expenseId: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  await apiFetch<void>(`/recurring-expenses/instances/${expenseId}?scope=all`, { method: 'DELETE' });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const deleteRecurringFromInstance = withErrorLogging('deleteRecurringFromInstance', _deleteRecurringFromInstance);
