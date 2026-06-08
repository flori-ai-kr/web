'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {idSchema, labelSettingSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';

// label_settings(지출) — color는 서버/DB에서 제거됨.
export interface ExpenseCategory {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

export interface ExpensePaymentMethod {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

// Kotlin /settings/* 공통 응답 (LabelSettingResponse, camelCase).
// id는 Long(JSON 숫자)으로 내려오므로 받는 쪽에서 String으로 통일한다.
interface KotlinLabelSetting {
  id: number | string;
  value: string;
  label: string;
  sortOrder: number;
}

// camelCase(Kotlin) → snake_case(웹 설정 타입). id는 반드시 String으로.
function mapLabelSetting<T extends { id: string; value: string; label: string; sort_order: number }>(
  s: KotlinLabelSetting,
): T {
  return {
    id: String(s.id),
    value: s.value,
    label: s.label,
    sort_order: s.sortOrder,
  } as T;
}

// 기본 항목 (서버에 사용자 항목이 없을 때 인메모리 fallback).
const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id'>[] = [
  { value: 'flower_purchase', label: '꽃 사입', sort_order: 1 },
  { value: 'delivery', label: '배송비', sort_order: 2 },
  { value: 'advertising', label: '광고비', sort_order: 3 },
  { value: 'rent', label: '임대료', sort_order: 4 },
  { value: 'utilities', label: '공과금', sort_order: 5 },
  { value: 'supplies', label: '소모품', sort_order: 6 },
  { value: 'other', label: '기타', sort_order: 7 },
];

const DEFAULT_PAYMENTS: Omit<ExpensePaymentMethod, 'id'>[] = [
  { value: 'card', label: '카드', sort_order: 1 },
  { value: 'cash', label: '현금', sort_order: 2 },
  { value: 'transfer', label: '계좌이체', sort_order: 3 },
];

function fallbackCategories(): ExpenseCategory[] {
  return DEFAULT_CATEGORIES.map((cat, idx) => ({ ...cat, id: `default-${idx}` }));
}

function fallbackPayments(): ExpensePaymentMethod[] {
  return DEFAULT_PAYMENTS.map((pm, idx) => ({ ...pm, id: `default-${idx}` }));
}

// ─── 지출 카테고리 ───────────────────────────────────────────
async function _getExpenseCategories(): Promise<ExpenseCategory[]> {
  await requireAuth();
  try {
    const rows = await apiFetch<KotlinLabelSetting[]>('/settings/expense-categories');
    // 서버에 사용자 항목이 없으면(최초 접근) 기존과 동일하게 기본 카테고리로 채운다.
    if (rows.length === 0) return fallbackCategories();
    return rows.map((r) => mapLabelSetting<ExpenseCategory>(r));
  } catch {
    // 조회 실패 시에도 화면이 비지 않도록 기본값 fallback (기존 동작 유지)
    return fallbackCategories();
  }
}
export const getExpenseCategories = withErrorLogging('getExpenseCategories', _getExpenseCategories);

async function _createExpenseCategory(label: string): Promise<ExpenseCategory> {
  await requireAuth();
  const parsed = labelSettingSchema.safeParse({ label });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);

  const row = await apiFetch<KotlinLabelSetting>('/settings/expense-categories', {
    method: 'POST',
    body: JSON.stringify({ label: parsed.data.label }),
  });

  revalidatePath('/admin/expenses');
  return mapLabelSetting<ExpenseCategory>(row);
}
export const createExpenseCategory = withErrorLogging('createExpenseCategory', _createExpenseCategory);

async function _updateExpenseCategory(id: string, label: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  const parsed = labelSettingSchema.safeParse({ label });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);

  await apiFetch<KotlinLabelSetting>(`/settings/expense-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label: parsed.data.label }),
  });

  revalidatePath('/admin/expenses');
}
export const updateExpenseCategory = withErrorLogging('updateExpenseCategory', _updateExpenseCategory);

async function _deleteExpenseCategory(id: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<void>(`/settings/expense-categories/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/expenses');
}
export const deleteExpenseCategory = withErrorLogging('deleteExpenseCategory', _deleteExpenseCategory);

// ─── 지출 결제방식 ───────────────────────────────────────────
async function _getExpensePaymentMethods(): Promise<ExpensePaymentMethod[]> {
  await requireAuth();
  try {
    const rows = await apiFetch<KotlinLabelSetting[]>('/settings/expense-payment-methods');
    if (rows.length === 0) return fallbackPayments();
    return rows.map((r) => mapLabelSetting<ExpensePaymentMethod>(r));
  } catch {
    return fallbackPayments();
  }
}
export const getExpensePaymentMethods = withErrorLogging('getExpensePaymentMethods', _getExpensePaymentMethods);

async function _createExpensePaymentMethod(label: string): Promise<ExpensePaymentMethod> {
  await requireAuth();
  const parsed = labelSettingSchema.safeParse({ label });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);

  const row = await apiFetch<KotlinLabelSetting>('/settings/expense-payment-methods', {
    method: 'POST',
    body: JSON.stringify({ label: parsed.data.label }),
  });

  revalidatePath('/admin/expenses');
  return mapLabelSetting<ExpensePaymentMethod>(row);
}
export const createExpensePaymentMethod = withErrorLogging('createExpensePaymentMethod', _createExpensePaymentMethod);

async function _updateExpensePaymentMethod(id: string, label: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  const parsed = labelSettingSchema.safeParse({ label });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);

  await apiFetch<KotlinLabelSetting>(`/settings/expense-payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label: parsed.data.label }),
  });

  revalidatePath('/admin/expenses');
}
export const updateExpensePaymentMethod = withErrorLogging('updateExpensePaymentMethod', _updateExpensePaymentMethod);

async function _deleteExpensePaymentMethod(id: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<void>(`/settings/expense-payment-methods/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/expenses');
}
export const deleteExpensePaymentMethod = withErrorLogging('deleteExpensePaymentMethod', _deleteExpensePaymentMethod);
