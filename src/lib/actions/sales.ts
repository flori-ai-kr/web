'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {findOrCreateCustomer} from './customers';
import type {Sale} from '@/types/database';
import {z} from 'zod';
import {idSchema, saleSchema} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

/**
 * 매출 폼 데이터에서 고객 ID를 결정한다.
 * 1) 이미 customer_id가 있으면 그대로 사용
 * 2) 이름+전화번호가 있으면 findOrCreateCustomer로 찾기/생성
 * 3) 그 외에는 null
 */
async function resolveCustomerId(
  customerId: string | null,
  customerName: string | null,
  customerPhone: string | null,
): Promise<string | null> {
  if (customerId) return customerId;
  if (!customerName?.trim()) return null;

  if (customerPhone?.trim()) {
    try {
      const customer = await findOrCreateCustomer(customerName.trim(), customerPhone.trim());
      return customer.id;
    } catch {
      return null;
    }
  }

  return null;
}

const SALES_PAGE_SIZE = 100;

export interface SalesFilters {
  category?: string[];
  payment?: string[];
  channel?: string[];
  search?: string;
}

// Kotlin /sales 응답의 단일 매출 (camelCase). 서버 계약과 1:1.
// 카테고리·채널은 id 기반 + 라벨 동봉(label_settings). 결제방식은 문자열 value 유지.
interface KotlinSale {
  id: string;
  date: string;
  categoryId: number | string | null;
  categoryLabel: string | null;
  amount: number;
  paymentMethodId: number | string | null;
  paymentMethodLabel: string | null;
  channelId: number | string | null;
  channelLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerId: string | null;
  memo: string | null;
  isUnpaid: boolean;
  hasReview: boolean;
  photos: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface KotlinSalesPage {
  sales: KotlinSale[];
  hasMore: boolean;
}

// camelCase(Kotlin) → snake_case(웹 Sale 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
// photos는 목록 응답에 연결된 사진 URL 목록(없으면 빈 배열). 리스트 썸네일 표시에 사용.
function mapKotlinSale(s: KotlinSale): Sale {
  return {
    id: s.id,
    user_id: '',
    date: s.date,
    category_id: s.categoryId != null ? String(s.categoryId) : null,
    category_label: s.categoryLabel,
    amount: s.amount,
    payment_method_id: s.paymentMethodId != null ? String(s.paymentMethodId) : null,
    payment_method_label: s.paymentMethodLabel,
    channel_id: s.channelId != null ? String(s.channelId) : null,
    channel_label: s.channelLabel,
    customer_name: s.customerName ?? undefined,
    customer_phone: s.customerPhone ?? undefined,
    customer_id: s.customerId ?? undefined,
    memo: s.memo ?? undefined,
    is_unpaid: s.isUnpaid,
    has_review: s.hasReview,
    photos: s.photos && s.photos.length > 0 ? s.photos : undefined,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

async function _getSales(month?: string, offset: number = 0, limit: number = SALES_PAGE_SIZE, filters?: SalesFilters, dateRange?: { startDate: string; endDate: string }) {
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
  for (const ch of filters?.channel ?? []) params.append('channel', ch);
  if (filters?.search) params.set('search', filters.search);

  const page = await apiFetch<KotlinSalesPage>(`/sales?${params.toString()}`);

  return {
    sales: page.sales.map(mapKotlinSale),
    hasMore: page.hasMore,
  };
}

export const getSales = withErrorLogging('getSales', _getSales);

async function _loadMoreSales(month: string | null, offset: number, filters?: SalesFilters) {
  return _getSales(month ?? undefined, offset, SALES_PAGE_SIZE, filters);
}

export const loadMoreSales = withErrorLogging('loadMoreSales', _loadMoreSales);

interface KotlinSalesSummary {
  total: number;
  card: number;
  naverpay: number;
  transfer: number;
  cash: number;
  count: number;
}

// 요약 집계: 페이지네이션과 무관하게 필터 적용 전체를 서버가 집계한다.
// month 파싱(연/특정일/월 범위)과 필터 적용은 서버 `/sales/summary`가 담당한다.
// startDate/endDate 가 있으면 month 무시하고 범위 조회.
async function _getSalesSummary(month?: string, filters?: SalesFilters, dateRange?: { startDate: string; endDate: string }) {
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
  for (const ch of filters?.channel ?? []) params.append('channel', ch);
  if (filters?.search) params.set('search', filters.search);

  const data = await apiFetch<KotlinSalesSummary>(`/sales/summary?${params.toString()}`);

  return {
    total: data?.total ?? 0,
    card: data?.card ?? 0,
    naverpay: data?.naverpay ?? 0,
    transfer: data?.transfer ?? 0,
    cash: data?.cash ?? 0,
    count: data?.count ?? 0,
  };
}

export const getSalesSummary = withErrorLogging('getSalesSummary', _getSalesSummary);

async function _createSale(formData: FormData) {
  await requireAuth();

  const customerName = formData.get('customer_name') as string || null;
  const customerPhone = formData.get('customer_phone') as string || null;
  const customerId = formData.get('customer_id') as string || null;

  const isUnpaid = formData.get('is_unpaid') === 'true';

  // 입력 검증
  const parsed = saleSchema.safeParse({
    date: formData.get('date'),
    category_id: formData.get('category_id'),
    amount: parseInt(formData.get('amount') as string) || 0,
    payment_method_id: isUnpaid ? null : (formData.get('payment_method_id') || null),
    is_unpaid: isUnpaid,
    channel_id: formData.get('channel_id') || null,
    customer_name: customerName,
    customer_phone: customerPhone,
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const finalCustomerId = await resolveCustomerId(customerId, customerName, customerPhone);

  // 미수(isUnpaid=true)면 서버가 paymentMethodId를 무시하고 NULL 저장. 카테고리·채널·결제는 id로 전송.
  const created = await apiFetch<KotlinSale>('/sales', {
    method: 'POST',
    body: JSON.stringify({
      date: parsed.data.date,
      categoryId: Number(parsed.data.category_id),
      amount: parsed.data.amount,
      paymentMethodId: parsed.data.payment_method_id ? Number(parsed.data.payment_method_id) : null,
      isUnpaid,
      channelId: parsed.data.channel_id ? Number(parsed.data.channel_id) : null,
      customerName,
      customerPhone,
      customerId: finalCustomerId,
      memo: parsed.data.memo || null,
    }),
  });

  revalidatePath('/admin/sales');
  revalidatePath('/admin/customers');
  revalidatePath('/admin');
  return mapKotlinSale(created);
}

export const createSale = withErrorLogging('createSale', _createSale);

async function _updateSale(id: string, formData: FormData) {
  await requireAuth();

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  // formData.has()로 미전송 필드와 명시적 null을 구분하여 부분 업데이트를 안전하게 처리
  const customerName = formData.has('customer_name') ? (formData.get('customer_name') as string || null) : undefined;
  const customerPhone = formData.has('customer_phone') ? (formData.get('customer_phone') as string || null) : undefined;
  const customerId = formData.get('customer_id') as string || null;

  const unpaidProvided = formData.has('is_unpaid');
  const isUnpaid = formData.get('is_unpaid') === 'true';

  const parsed = saleSchema.partial().safeParse({
    date: formData.get('date') || undefined,
    category_id: formData.get('category_id') || undefined,
    amount: formData.get('amount') ? parseInt(formData.get('amount') as string) : undefined,
    payment_method_id: formData.has('payment_method_id') ? (formData.get('payment_method_id') as string || null) : undefined,
    is_unpaid: unpaidProvided ? isUnpaid : undefined,
    channel_id: formData.has('channel_id') ? (formData.get('channel_id') as string || null) : undefined,
    customer_name: customerName,
    customer_phone: customerPhone,
    memo: formData.has('memo') ? (formData.get('memo') as string || null) : undefined,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const shouldResolveCustomer = formData.has('customer_name') || formData.has('customer_id');
  const finalCustomerId = shouldResolveCustomer
    ? await resolveCustomerId(customerId, customerName ?? null, customerPhone ?? null)
    : undefined;

  // 제공된 필드만 PATCH 본문에 포함 (서버가 non-null 필드만 반영)
  const body: Record<string, string | number | boolean | null> = {};
  if (parsed.data.date !== undefined) body.date = parsed.data.date;
  if (parsed.data.category_id !== undefined) body.categoryId = Number(parsed.data.category_id);
  if (parsed.data.amount !== undefined) body.amount = parsed.data.amount;
  if (unpaidProvided) {
    body.isUnpaid = isUnpaid;
    body.paymentMethodId = isUnpaid ? null : (parsed.data.payment_method_id ? Number(parsed.data.payment_method_id) : null);
  } else if (parsed.data.payment_method_id !== undefined) {
    body.paymentMethodId = parsed.data.payment_method_id ? Number(parsed.data.payment_method_id) : null;
  }
  if (parsed.data.channel_id !== undefined) body.channelId = parsed.data.channel_id ? Number(parsed.data.channel_id) : null;
  if (parsed.data.customer_name !== undefined) body.customerName = parsed.data.customer_name;
  if (parsed.data.customer_phone !== undefined) body.customerPhone = parsed.data.customer_phone;
  if (parsed.data.memo !== undefined) body.memo = parsed.data.memo;
  if (shouldResolveCustomer) body.customerId = finalCustomerId ?? null;

  const hasReview = formData.get('has_review');
  if (hasReview !== null) {
    body.hasReview = hasReview === 'true';
  }

  await apiFetch<KotlinSale>(`/sales/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  revalidatePath('/admin/sales');
  revalidatePath('/admin/customers');
  revalidatePath('/admin');
}

export const updateSale = withErrorLogging('updateSale', _updateSale);

/**
 * 미수 매출의 결제를 완료한다.
 * payment_method를 실제 결제방식으로 변경한다.
 */
async function _completeUnpaidSale(saleId: string, paymentMethodId: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(saleId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const pmParsed = idSchema.safeParse(paymentMethodId);
  if (!pmParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 결제방식입니다');

  await apiFetch<KotlinSale>(`/sales/${idParsed.data}/complete-unpaid`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethodId: Number(pmParsed.data) }),
  });

  revalidatePath('/admin/sales');
  revalidatePath('/admin/calendar');
  revalidatePath('/admin');
}

export const completeUnpaidSale = withErrorLogging('completeUnpaidSale', _completeUnpaidSale);

/**
 * 미수 매출의 결제 완료를 되돌린다.
 * payment_method를 다시 'unpaid'로 변경한다.
 */
async function _revertUnpaidSale(saleId: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(saleId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  await apiFetch<KotlinSale>(`/sales/${idParsed.data}/revert-unpaid`, {
    method: 'POST',
  });

  revalidatePath('/admin/sales');
  revalidatePath('/admin/calendar');
  revalidatePath('/admin');
}

export const revertUnpaidSale = withErrorLogging('revertUnpaidSale', _revertUnpaidSale);

async function _deleteSale(id: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  await apiFetch<void>(`/sales/${idParsed.data}`, { method: 'DELETE' });

  revalidatePath('/admin/sales');
  revalidatePath('/admin/customers');
  revalidatePath('/admin');
}

export const deleteSale = withErrorLogging('deleteSale', _deleteSale);

async function _getSaleById(id: string): Promise<Sale | null> {
  await requireAuth();
  // 서버 SaleResponse는 customerName/customerPhone을 이미 포함한다(별도 조인 불필요).
  // 미존재 시 apiFetch가 NOT_FOUND를 throw → null 반환으로 기존 계약 유지.
  try {
    const sale = await apiFetch<KotlinSale>(`/sales/${id}`);
    return mapKotlinSale(sale);
  } catch (e) {
    if (e instanceof AppError && e.code === ErrorCode.NOT_FOUND) return null;
    throw e;
  }
}

export const getSaleById = withErrorLogging('getSaleById', _getSaleById);

/**
 * 매출 메모 자동완성용 과거 값 조회
 */
async function _getSaleSuggestions(): Promise<{ memos: string[] }> {
  await requireAuth();
  const { memos } = await apiFetch<{ memos: string[] }>('/sales/suggestions');
  return { memos };
}

export const getSaleSuggestions = withErrorLogging('getSaleSuggestions', _getSaleSuggestions);
