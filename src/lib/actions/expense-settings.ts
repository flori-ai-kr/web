'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { uuidSchema, categorySettingSchema } from '@/lib/validations';

export interface ExpenseCategory {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface ExpensePaymentMethod {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

// 기본 카테고리 (DB에 없을 경우 사용)
const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id' | 'created_at'>[] = [
  { value: 'flower_purchase', label: '꽃 사입', color: '#ec4899', sort_order: 1 },
  { value: 'delivery', label: '배송비', color: '#3b82f6', sort_order: 2 },
  { value: 'advertising', label: '광고비', color: '#a855f7', sort_order: 3 },
  { value: 'rent', label: '임대료', color: '#f97316', sort_order: 4 },
  { value: 'utilities', label: '공과금', color: '#06b6d4', sort_order: 5 },
  { value: 'supplies', label: '소모품', color: '#6b7280', sort_order: 6 },
  { value: 'other', label: '기타', color: '#9ca3af', sort_order: 7 },
];

const DEFAULT_PAYMENTS: Omit<ExpensePaymentMethod, 'id' | 'created_at'>[] = [
  { value: 'card', label: '카드', color: '#3b82f6', sort_order: 1 },
  { value: 'cash', label: '현금', color: '#f97316', sort_order: 2 },
  { value: 'transfer', label: '계좌이체', color: '#a855f7', sort_order: 3 },
];

async function _getExpenseCategories(): Promise<ExpenseCategory[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) {
    // 테이블 자체가 없는 경우 등 — 메모리 기본값 fallback
    return DEFAULT_CATEGORIES.map((cat, idx) => ({
      ...cat,
      id: `default-${idx}`,
      created_at: new Date().toISOString(),
    }));
  }

  if (!data || data.length === 0) {
    // 최초 접근 시 기본 카테고리 자동 시드 (동시 요청 대비 upsert + 재조회)
    const seedRows = DEFAULT_CATEGORIES.map(cat => ({ ...cat, user_id: user.id }));
    await supabase
      .from('expense_categories')
      .upsert(seedRows, { onConflict: 'value,user_id', ignoreDuplicates: true });
    const { data: seeded } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    if (!seeded || seeded.length === 0) {
      return DEFAULT_CATEGORIES.map((cat, idx) => ({
        ...cat,
        id: `default-${idx}`,
        created_at: new Date().toISOString(),
      }));
    }
    return seeded;
  }

  return data;
}

export const getExpenseCategories = withErrorLogging('getExpenseCategories', _getExpenseCategories);

async function _getExpensePaymentMethods(): Promise<ExpensePaymentMethod[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expense_payment_methods')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) {
    return DEFAULT_PAYMENTS.map((pm, idx) => ({
      ...pm,
      id: `default-${idx}`,
      created_at: new Date().toISOString(),
    }));
  }

  if (!data || data.length === 0) {
    const seedRows = DEFAULT_PAYMENTS.map(pm => ({ ...pm, user_id: user.id }));
    await supabase
      .from('expense_payment_methods')
      .upsert(seedRows, { onConflict: 'value,user_id', ignoreDuplicates: true });
    const { data: seeded } = await supabase
      .from('expense_payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    if (!seeded || seeded.length === 0) {
      return DEFAULT_PAYMENTS.map((pm, idx) => ({
        ...pm,
        id: `default-${idx}`,
        created_at: new Date().toISOString(),
      }));
    }
    return seeded;
  }
  return data;
}

export const getExpensePaymentMethods = withErrorLogging('getExpensePaymentMethods', _getExpensePaymentMethods);


async function _createExpenseCategory(label: string, color: string): Promise<ExpenseCategory> {
  const user = await requireAuth();
  const parsed = categorySettingSchema.safeParse({ label, color });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  const supabase = await createClient();

  const value = parsed.data.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_가-힣]/g, '') || `cat_${Date.now()}`;

  const { data: existing } = await supabase
    .from('expense_categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ user_id: user.id, value, label: parsed.data.label, color: parsed.data.color ?? color, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/expenses');
  return data;
}

export const createExpenseCategory = withErrorLogging('createExpenseCategory', _createExpenseCategory);

async function _updateExpenseCategory(id: string, label: string, color: string): Promise<void> {
  const user = await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  const parsed = categorySettingSchema.safeParse({ label, color });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  const supabase = await createClient();

  const { error } = await supabase
    .from('expense_categories')
    .update({ label: parsed.data.label, color: parsed.data.color ?? color })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/expenses');
}

export const updateExpenseCategory = withErrorLogging('updateExpenseCategory', _updateExpenseCategory);

async function _deleteExpenseCategory(id: string): Promise<void> {
  const user = await requireAuth();
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  const supabase = await createClient();

  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/expenses');
}

export const deleteExpenseCategory = withErrorLogging('deleteExpenseCategory', _deleteExpenseCategory);
