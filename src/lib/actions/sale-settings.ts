'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {idSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';

export interface SaleCategory {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

// ─── Kotlin DTO 미러 (camelCase) ───────────────────────────────
// LabelSettingResponse는 created_at을 제공하지 않는다(서버 도메인 외 필드).
// 웹 타입은 created_at을 요구하지만 모든 소비자가 무시하므로 안전한 기본값('')을 채운다.

interface LabelSettingDto {
  id: string;
  value: string;
  label: string;
  color: string;
  sortOrder: number;
}

function toSaleCategory(dto: LabelSettingDto): SaleCategory {
  return {
    id: dto.id,
    value: dto.value,
    label: dto.label,
    color: dto.color,
    sort_order: dto.sortOrder,
    created_at: '',
  };
}

function toPaymentMethod(dto: LabelSettingDto): PaymentMethod {
  return {
    id: dto.id,
    value: dto.value,
    label: dto.label,
    color: dto.color,
    sort_order: dto.sortOrder,
    created_at: '',
  };
}

// 카테고리 조회
async function _getSaleCategories(): Promise<SaleCategory[]> {
  await requireAuth();
  const dtos = await apiFetch<LabelSettingDto[]>('/settings/sale-categories');
  return (dtos || []).map(toSaleCategory);
}

export const getSaleCategories = withErrorLogging('getSaleCategories', _getSaleCategories);

// 카테고리 생성 (value 슬러그 생성 · sort_order 계산 · 중복 검사는 서버가 처리)
async function _createSaleCategory(label: string, color?: string): Promise<SaleCategory> {
  await requireAuth();

  const dto = await apiFetch<LabelSettingDto>('/settings/sale-categories', {
    method: 'POST',
    body: JSON.stringify({ label, color: color ?? null }),
  });

  revalidatePath('/admin/sales');
  return toSaleCategory(dto);
}

export const createSaleCategory = withErrorLogging('createSaleCategory', _createSaleCategory);

// 카테고리 수정
async function _updateSaleCategory(id: string, label: string, color: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<LabelSettingDto>(`/settings/sale-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label, color }),
  });

  revalidatePath('/admin/sales');
}

export const updateSaleCategory = withErrorLogging('updateSaleCategory', _updateSaleCategory);

// 카테고리 삭제
async function _deleteSaleCategory(id: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<void>(`/settings/sale-categories/${id}`, { method: 'DELETE' });

  revalidatePath('/admin/sales');
}

export const deleteSaleCategory = withErrorLogging('deleteSaleCategory', _deleteSaleCategory);

// 결제방식 조회
async function _getPaymentMethods(): Promise<PaymentMethod[]> {
  await requireAuth();
  const dtos = await apiFetch<LabelSettingDto[]>('/settings/payment-methods');
  return (dtos || []).map(toPaymentMethod);
}

export const getPaymentMethods = withErrorLogging('getPaymentMethods', _getPaymentMethods);

// 결제방식 생성 (value 슬러그 생성 · sort_order 계산 · 중복 검사는 서버가 처리)
async function _createPaymentMethod(label: string, color?: string, value?: string): Promise<PaymentMethod> {
  await requireAuth();

  const dto = await apiFetch<LabelSettingDto>('/settings/payment-methods', {
    method: 'POST',
    body: JSON.stringify({ label, color: color ?? null, value: value ?? null }),
  });

  revalidatePath('/admin/sales');
  return toPaymentMethod(dto);
}

export const createPaymentMethod = withErrorLogging('createPaymentMethod', _createPaymentMethod);

// 결제방식 수정 (value는 수정 불가 - CHECK 제약조건 때문)
async function _updatePaymentMethod(id: string, label: string, color: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<LabelSettingDto>(`/settings/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label, color }),
  });

  revalidatePath('/admin/sales');
}

export const updatePaymentMethod = withErrorLogging('updatePaymentMethod', _updatePaymentMethod);

// 결제방식 삭제
async function _deletePaymentMethod(id: string): Promise<void> {
  await requireAuth();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<void>(`/settings/payment-methods/${id}`, { method: 'DELETE' });

  revalidatePath('/admin/sales');
}

export const deletePaymentMethod = withErrorLogging('deletePaymentMethod', _deletePaymentMethod);
