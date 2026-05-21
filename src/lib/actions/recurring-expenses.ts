'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { recurringExpenseSchema, uuidSchema } from '@/lib/validations';
import type { RecurringExpense, RecurringFrequency, YearlyDate } from '@/types/database';

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
// CRUD
// ─────────────────────────────────────────────────────────────

async function _getRecurringExpenses(): Promise<RecurringExpense[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const getRecurringExpenses = withErrorLogging('getRecurringExpenses', _getRecurringExpenses);

type RecurringInput = {
  item_name: string;
  category: string;
  unit_price: number;
  quantity: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'naverpay' | 'kakaopay';
  vendor?: string | null;
  note?: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  days_of_week: number[];
  days_of_month: number[];
  yearly_dates: YearlyDate[];
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
};

async function _createRecurringExpense(input: RecurringInput): Promise<RecurringExpense> {
  const user = await requireAuth();
  const parsed = recurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다');
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
  return data;
}

export const createRecurringExpense = withErrorLogging('createRecurringExpense', _createRecurringExpense);

async function _updateRecurringExpense(id: string, input: RecurringInput): Promise<void> {
  const user = await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const parsed = recurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다');
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('recurring_expenses')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const updateRecurringExpense = withErrorLogging('updateRecurringExpense', _updateRecurringExpense);

async function _deleteRecurringExpense(id: string): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const deleteRecurringExpense = withErrorLogging('deleteRecurringExpense', _deleteRecurringExpense);

async function _toggleRecurringExpenseActive(id: string, isActive: boolean): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();
  const { error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const toggleRecurringExpenseActive = withErrorLogging('toggleRecurringExpenseActive', _toggleRecurringExpenseActive);

// 빠른 추가: 오늘 날짜로 expense 즉시 생성 (recurring_id 연결)
async function _quickAddFromRecurring(recurringId: string): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(recurringId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();

  const { data: rule, error: ruleErr } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('id', recurringId)
    .eq('user_id', user.id)
    .single();
  if (ruleErr || !rule) throw new AppError(ErrorCode.NOT_FOUND, '고정비를 찾을 수 없습니다');

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { error: insErr } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      date: todayISO,
      item_name: rule.item_name,
      category: rule.category,
      unit_price: rule.unit_price,
      quantity: rule.quantity,
      total_amount: rule.unit_price * rule.quantity,
      payment_method: rule.payment_method,
      vendor: rule.vendor,
      note: rule.note,
      recurring_id: null,             // 수동 추가는 템플릿과 분리 (자동생성 idempotency 충돌 회피)
      is_recurring_modified: false,
    });
  if (insErr) throw insErr;
  revalidatePath('/admin/expenses');
}

export const quickAddFromRecurring = withErrorLogging('quickAddFromRecurring', _quickAddFromRecurring);

// ─────────────────────────────────────────────────────────────
// iOS 스타일 "이것만 / 이후 모두" 분기 (P4)
// ─────────────────────────────────────────────────────────────

async function _updateExpenseInstanceOnly(expenseId: string, fields: Partial<RecurringInput> & { date: string }): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();

  const updateFields: Record<string, unknown> = {
    date: fields.date,
    item_name: fields.item_name,
    category: fields.category,
    unit_price: fields.unit_price,
    quantity: fields.quantity,
    total_amount: (fields.unit_price ?? 0) * (fields.quantity ?? 1),
    payment_method: fields.payment_method,
    vendor: fields.vendor ?? null,
    note: fields.note ?? null,
    is_recurring_modified: true,
  };
  const { error } = await supabase
    .from('expenses')
    .update(updateFields)
    .eq('id', expenseId)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath('/admin/expenses');
}

export const updateExpenseInstanceOnly = withErrorLogging('updateExpenseInstanceOnly', _updateExpenseInstanceOnly);

async function _updateRecurringFromInstance(expenseId: string, fields: Partial<RecurringInput>): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();

  const { data: instance, error: instErr } = await supabase
    .from('expenses')
    .select('id, recurring_id, date')
    .eq('id', expenseId)
    .eq('user_id', user.id)
    .single();
  if (instErr || !instance?.recurring_id) {
    throw new AppError(ErrorCode.NOT_FOUND, '반복 지출 정보를 찾을 수 없습니다');
  }

  const tplPatch: Record<string, unknown> = {};
  if (fields.item_name !== undefined) tplPatch.item_name = fields.item_name;
  if (fields.category !== undefined) tplPatch.category = fields.category;
  if (fields.unit_price !== undefined) tplPatch.unit_price = fields.unit_price;
  if (fields.quantity !== undefined) tplPatch.quantity = fields.quantity;
  if (fields.payment_method !== undefined) tplPatch.payment_method = fields.payment_method;
  if (fields.vendor !== undefined) tplPatch.vendor = fields.vendor;
  if (fields.note !== undefined) tplPatch.note = fields.note;

  if (Object.keys(tplPatch).length > 0) {
    const { error: tplErr } = await supabase
      .from('recurring_expenses')
      .update(tplPatch)
      .eq('id', instance.recurring_id)
      .eq('user_id', user.id);
    if (tplErr) throw tplErr;
  }

  const instPatch: Record<string, unknown> = { ...tplPatch, is_recurring_modified: false };
  // instance만은 total_amount도 재계산 (DB가 generated column 아님)
  if (fields.unit_price !== undefined || fields.quantity !== undefined) {
    const up = fields.unit_price ?? 0;
    const qty = fields.quantity ?? 1;
    instPatch.total_amount = up * qty;
  }
  const { error: updErr } = await supabase
    .from('expenses')
    .update(instPatch)
    .eq('id', expenseId)
    .eq('user_id', user.id);
  if (updErr) throw updErr;

  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const updateRecurringFromInstance = withErrorLogging('updateRecurringFromInstance', _updateRecurringFromInstance);

async function _deleteExpenseInstanceOnly(expenseId: string): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();

  const { data: instance } = await supabase
    .from('expenses')
    .select('id, recurring_id, date')
    .eq('id', expenseId)
    .eq('user_id', user.id)
    .single();

  // skip 마커 추가 (cron 재생성 방지) — instance가 recurring 출처일 때만
  if (instance?.recurring_id) {
    const { error: skipErr } = await supabase
      .from('recurring_skips')
      .insert({ user_id: user.id, recurring_id: instance.recurring_id, skip_date: instance.date });
    if (skipErr) throw skipErr;
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath('/admin/expenses');
}

export const deleteExpenseInstanceOnly = withErrorLogging('deleteExpenseInstanceOnly', _deleteExpenseInstanceOnly);

async function _deleteRecurringFromInstance(expenseId: string): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(expenseId);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID가 올바르지 않습니다');
  const supabase = await createClient();

  const { data: instance } = await supabase
    .from('expenses')
    .select('id, recurring_id, date')
    .eq('id', expenseId)
    .eq('user_id', user.id)
    .single();
  if (!instance?.recurring_id) throw new AppError(ErrorCode.NOT_FOUND, '반복 지출 정보를 찾을 수 없습니다');

  // 템플릿 end_date를 이번 발생일 전날로 (현재 이후 자동생성 차단)
  const dateObj = new Date(instance.date + 'T00:00:00');
  dateObj.setDate(dateObj.getDate() - 1);
  const newEnd = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  const { error: tplErr } = await supabase
    .from('recurring_expenses')
    .update({ end_date: newEnd })
    .eq('id', instance.recurring_id)
    .eq('user_id', user.id);
  if (tplErr) throw tplErr;

  const { error: delErr } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', user.id);
  if (delErr) throw delErr;

  revalidatePath('/admin/expenses');
  revalidatePath('/admin/settings');
}

export const deleteRecurringFromInstance = withErrorLogging('deleteRecurringFromInstance', _deleteRecurringFromInstance);
