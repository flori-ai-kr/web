'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {idSchema, idsSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';

// 라벨 설정(label_settings) — 카테고리/결제방식/채널 공통 모양. color는 서버에서 제거됨.
export interface SaleCategory {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

export interface PaymentMethod {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

export interface SaleChannel {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

// ─── Kotlin LabelSettingResponse 미러 (camelCase) ───────────────
interface LabelSettingDto {
  id: number | string;
  value: string;
  label: string;
  sortOrder: number;
}

function toLabel<T extends { id: string; value: string; label: string; sort_order: number }>(dto: LabelSettingDto): T {
  return {
    id: String(dto.id),
    value: dto.value,
    label: dto.label,
    sort_order: dto.sortOrder,
  } as T;
}

// ─── 카테고리 ────────────────────────────────────────────────
async function _getSaleCategories(): Promise<SaleCategory[]> {
  await requireAuth();
  const dtos = await apiFetch<LabelSettingDto[]>('/settings/sale-categories');
  return (dtos || []).map((d) => toLabel<SaleCategory>(d));
}
export const getSaleCategories = withErrorLogging('getSaleCategories', _getSaleCategories);

async function _createSaleCategory(label: string): Promise<SaleCategory> {
  await requireAuth();
  const dto = await apiFetch<LabelSettingDto>('/settings/sale-categories', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
  revalidatePath('/admin/sales');
  return toLabel<SaleCategory>(dto);
}
export const createSaleCategory = withErrorLogging('createSaleCategory', _createSaleCategory);

async function _updateSaleCategory(id: string, label: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<LabelSettingDto>(`/settings/sale-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label }),
  });
  revalidatePath('/admin/sales');
}
export const updateSaleCategory = withErrorLogging('updateSaleCategory', _updateSaleCategory);

async function _deleteSaleCategory(id: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<void>(`/settings/sale-categories/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/sales');
}
export const deleteSaleCategory = withErrorLogging('deleteSaleCategory', _deleteSaleCategory);

async function _reorderSaleCategories(ids: string[]): Promise<void> {
  await requireAuth();
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, '순서 목록이 올바르지 않습니다');
  await apiFetch<LabelSettingDto[]>('/settings/sale-categories/order', {
    method: 'PUT',
    body: JSON.stringify({ ids: parsed.data.map(Number) }),
  });
  revalidatePath('/admin/sales');
}
export const reorderSaleCategories = withErrorLogging('reorderSaleCategories', _reorderSaleCategories);

// ─── 결제방식 ────────────────────────────────────────────────
async function _getPaymentMethods(): Promise<PaymentMethod[]> {
  await requireAuth();
  const dtos = await apiFetch<LabelSettingDto[]>('/settings/payment-methods');
  return (dtos || []).map((d) => toLabel<PaymentMethod>(d));
}
export const getPaymentMethods = withErrorLogging('getPaymentMethods', _getPaymentMethods);

async function _createPaymentMethod(label: string, value?: string): Promise<PaymentMethod> {
  await requireAuth();
  const dto = await apiFetch<LabelSettingDto>('/settings/payment-methods', {
    method: 'POST',
    body: JSON.stringify({ label, value: value ?? null }),
  });
  revalidatePath('/admin/sales');
  return toLabel<PaymentMethod>(dto);
}
export const createPaymentMethod = withErrorLogging('createPaymentMethod', _createPaymentMethod);

async function _updatePaymentMethod(id: string, label: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<LabelSettingDto>(`/settings/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label }),
  });
  revalidatePath('/admin/sales');
}
export const updatePaymentMethod = withErrorLogging('updatePaymentMethod', _updatePaymentMethod);

async function _deletePaymentMethod(id: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<void>(`/settings/payment-methods/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/sales');
}
export const deletePaymentMethod = withErrorLogging('deletePaymentMethod', _deletePaymentMethod);

async function _reorderPaymentMethods(ids: string[]): Promise<void> {
  await requireAuth();
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, '순서 목록이 올바르지 않습니다');
  await apiFetch<LabelSettingDto[]>('/settings/payment-methods/order', {
    method: 'PUT',
    body: JSON.stringify({ ids: parsed.data.map(Number) }),
  });
  revalidatePath('/admin/sales');
}
export const reorderPaymentMethods = withErrorLogging('reorderPaymentMethods', _reorderPaymentMethods);

// ─── 매출 채널 (신규: label_settings로 동적화) ─────────────────
async function _getSaleChannels(): Promise<SaleChannel[]> {
  await requireAuth();
  const dtos = await apiFetch<LabelSettingDto[]>('/settings/sale-channels');
  return (dtos || []).map((d) => toLabel<SaleChannel>(d));
}
export const getSaleChannels = withErrorLogging('getSaleChannels', _getSaleChannels);

async function _createSaleChannel(label: string): Promise<SaleChannel> {
  await requireAuth();
  const dto = await apiFetch<LabelSettingDto>('/settings/sale-channels', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
  revalidatePath('/admin/sales');
  return toLabel<SaleChannel>(dto);
}
export const createSaleChannel = withErrorLogging('createSaleChannel', _createSaleChannel);

async function _updateSaleChannel(id: string, label: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<LabelSettingDto>(`/settings/sale-channels/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label }),
  });
  revalidatePath('/admin/sales');
}
export const updateSaleChannel = withErrorLogging('updateSaleChannel', _updateSaleChannel);

async function _deleteSaleChannel(id: string): Promise<void> {
  await requireAuth();
  if (!idSchema.safeParse(id).success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');
  await apiFetch<void>(`/settings/sale-channels/${id}`, { method: 'DELETE' });
  revalidatePath('/admin/sales');
}
export const deleteSaleChannel = withErrorLogging('deleteSaleChannel', _deleteSaleChannel);

async function _reorderSaleChannels(ids: string[]): Promise<void> {
  await requireAuth();
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, '순서 목록이 올바르지 않습니다');
  await apiFetch<LabelSettingDto[]>('/settings/sale-channels/order', {
    method: 'PUT',
    body: JSON.stringify({ ids: parsed.data.map(Number) }),
  });
  revalidatePath('/admin/sales');
}
export const reorderSaleChannels = withErrorLogging('reorderSaleChannels', _reorderSaleChannels);
