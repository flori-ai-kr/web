'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {categorySettingSchema, idSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';

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

// Kotlin /settings/* 공통 응답 (LabelSettingResponse, camelCase).
// id는 Long(JSON 숫자)으로 내려오므로 받는 쪽에서 String으로 통일한다.
interface KotlinLabelSetting {
  id: number | string;
  value: string;
  label: string;
  color?: string;
  sortOrder: number;
}

// camelCase(Kotlin) → snake_case(웹 설정 타입).
// created_at은 Kotlin 응답에 없어 뷰에서 미사용이므로 현재 시각으로 채운다.
// id는 반드시 String으로 — 지출 category_id(String 변환)와 비교/매칭되어야 한다.
function mapLabelSetting(s: KotlinLabelSetting): ExpenseCategory {
  return {
    id: String(s.id),
    value: s.value,
    label: s.label,
    color: s.color ?? '#9ca3af',
    sort_order: s.sortOrder,
    created_at: new Date().toISOString(),
  };
}

// 기본 카테고리 (서버에 사용자 항목이 없을 때 인메모리 fallback)
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

function fallbackCategories(): ExpenseCategory[] {
  return DEFAULT_CATEGORIES.map((cat, idx) => ({
    ...cat,
    id: `default-${idx}`,
    created_at: new Date().toISOString(),
  }));
}

function fallbackPayments(): ExpensePaymentMethod[] {
  return DEFAULT_PAYMENTS.map((pm, idx) => ({
    ...pm,
    id: `default-${idx}`,
    created_at: new Date().toISOString(),
  }));
}

async function _getExpenseCategories(): Promise<ExpenseCategory[]> {
  await requireAuth();
  try {
    const rows = await apiFetch<KotlinLabelSetting[]>('/settings/expense-categories');
    // 서버에 사용자 항목이 없으면(최초 접근) 기존과 동일하게 기본 카테고리로 채운다.
    if (rows.length === 0) return fallbackCategories();
    return rows.map(mapLabelSetting);
  } catch {
    // 조회 실패 시에도 화면이 비지 않도록 기본값 fallback (기존 동작 유지)
    return fallbackCategories();
  }
}

export const getExpenseCategories = withErrorLogging('getExpenseCategories', _getExpenseCategories);

async function _getExpensePaymentMethods(): Promise<ExpensePaymentMethod[]> {
  await requireAuth();
  try {
    const rows = await apiFetch<KotlinLabelSetting[]>('/settings/expense-payment-methods');
    if (rows.length === 0) return fallbackPayments();
    return rows.map(mapLabelSetting);
  } catch {
    return fallbackPayments();
  }
}

export const getExpensePaymentMethods = withErrorLogging('getExpensePaymentMethods', _getExpensePaymentMethods);


async function _createExpenseCategory(label: string, color: string): Promise<ExpenseCategory> {
  await requireAuth();
  const parsed = categorySettingSchema.safeParse({ label, color });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);

  // value 슬러그 생성과 sort_order 부여는 서버(LabelSettingService)가 처리한다.
  const row = await apiFetch<KotlinLabelSetting>('/settings/expense-categories', {
    method: 'POST',
    body: JSON.stringify({ label: parsed.data.label, color: parsed.data.color ?? color }),
  });

  revalidatePath('/admin/expenses');
  return mapLabelSetting(row);
}

export const createExpenseCategory = withErrorLogging('createExpenseCategory', _createExpenseCategory);

async function _updateExpenseCategory(id: string, label: string, color: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  const parsed = categorySettingSchema.safeParse({ label, color });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);

  await apiFetch<KotlinLabelSetting>(`/settings/expense-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label: parsed.data.label, color: parsed.data.color ?? color }),
  });

  revalidatePath('/admin/expenses');
}

export const updateExpenseCategory = withErrorLogging('updateExpenseCategory', _updateExpenseCategory);

async function _deleteExpenseCategory(id: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<void>(`/settings/expense-categories/${id}`, { method: 'DELETE' });

  revalidatePath('/admin/expenses');
}

export const deleteExpenseCategory = withErrorLogging('deleteExpenseCategory', _deleteExpenseCategory);
