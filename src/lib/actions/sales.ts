'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {findOrCreateCustomer} from './customers';
import type {PaymentMethod, ReservationChannel, Sale} from '@/types/database';
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
interface KotlinSale {
  id: string;
  date: string;
  productName: string;
  productCategory: string | null;
  amount: number;
  paymentMethod: string;
  cardCompany: string | null;
  fee: number | null;
  expectedDeposit: number | null;
  expectedDepositDate: string | null;
  depositStatus: string;
  depositedAt: string | null;
  reservationChannel: string;
  customerName: string | null;
  customerPhone: string | null;
  customerId: string | null;
  note: string | null;
  isUnpaid: boolean;
  hasReview: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KotlinSalesPage {
  sales: KotlinSale[];
  hasMore: boolean;
}

// camelCase(Kotlin) → snake_case(웹 Sale 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
// photos는 Kotlin /sales가 반환하지 않으므로 undefined.
function mapKotlinSale(s: KotlinSale): Sale {
  return {
    id: s.id,
    user_id: '',
    date: s.date,
    product_name: s.productName,
    product_category: s.productCategory ?? s.productName,
    amount: s.amount,
    payment_method: s.paymentMethod as PaymentMethod,
    reservation_channel: s.reservationChannel as ReservationChannel,
    customer_name: s.customerName ?? undefined,
    customer_phone: s.customerPhone ?? undefined,
    customer_id: s.customerId ?? undefined,
    note: s.note ?? undefined,
    is_unpaid: s.isUnpaid,
    has_review: s.hasReview,
    photos: undefined,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

async function _getSales(month?: string, offset: number = 0, limit: number = SALES_PAGE_SIZE, filters?: SalesFilters) {
  await requireAuth();

  // 쿼리 파라미터 구성. 다중값(category/payment/channel)은 반복 파라미터로
  // 보내 Spring List<String> 바인딩과 일치시킨다.
  const params = new URLSearchParams();
  params.set('offset', String(offset));
  params.set('limit', String(limit));
  if (month) params.set('month', month);
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
async function _getSalesSummary(month?: string, filters?: SalesFilters) {
  await requireAuth();

  const params = new URLSearchParams();
  if (month) params.set('month', month);
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

  const productCategory = formData.get('product_category') as string;
  const customerName = formData.get('customer_name') as string || null;
  const customerPhone = formData.get('customer_phone') as string || null;
  const customerId = formData.get('customer_id') as string || null;
  const cardCompany = formData.get('card_company') as string || null;

  // 입력 검증
  const parsed = saleSchema.safeParse({
    date: formData.get('date'),
    product_category: productCategory,
    amount: parseInt(formData.get('amount') as string) || 0,
    payment_method: formData.get('payment_method'),
    reservation_channel: formData.get('reservation_channel') || 'other',
    customer_name: customerName,
    customer_phone: customerPhone,
    note: formData.get('note') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const finalCustomerId = await resolveCustomerId(customerId, customerName, customerPhone);

  // fee/expected_deposit/deposit_status/is_unpaid는 서버가 계산한다.
  const created = await apiFetch<KotlinSale>('/sales', {
    method: 'POST',
    body: JSON.stringify({
      date: parsed.data.date,
      productCategory,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.payment_method,
      cardCompany,
      reservationChannel: parsed.data.reservation_channel || 'other',
      customerName,
      customerPhone,
      customerId: finalCustomerId,
      note: parsed.data.note || null,
    }),
  });

  revalidatePath('/sales');
  revalidatePath('/customers');
  revalidatePath('/');
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

  const parsed = saleSchema.partial().safeParse({
    date: formData.get('date') || undefined,
    product_category: formData.get('product_category') || undefined,
    amount: formData.get('amount') ? parseInt(formData.get('amount') as string) : undefined,
    payment_method: formData.get('payment_method') || undefined,
    reservation_channel: formData.get('reservation_channel') || undefined,
    customer_name: customerName,
    customer_phone: customerPhone,
    note: formData.has('note') ? (formData.get('note') as string || null) : undefined,
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
  if (parsed.data.product_category !== undefined) body.productCategory = parsed.data.product_category;
  if (parsed.data.amount !== undefined) body.amount = parsed.data.amount;
  if (parsed.data.payment_method !== undefined) body.paymentMethod = parsed.data.payment_method;
  if (parsed.data.reservation_channel !== undefined) body.reservationChannel = parsed.data.reservation_channel;
  if (parsed.data.customer_name !== undefined) body.customerName = parsed.data.customer_name;
  if (parsed.data.customer_phone !== undefined) body.customerPhone = parsed.data.customer_phone;
  if (parsed.data.note !== undefined) body.note = parsed.data.note;
  if (shouldResolveCustomer) body.customerId = finalCustomerId ?? null;

  const hasReview = formData.get('has_review');
  if (hasReview !== null) {
    body.hasReview = hasReview === 'true';
  }

  await apiFetch<KotlinSale>(`/sales/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  revalidatePath('/sales');
  revalidatePath('/customers');
  revalidatePath('/');
}

export const updateSale = withErrorLogging('updateSale', _updateSale);

/**
 * 미수 매출의 결제를 완료한다.
 * payment_method를 실제 결제방식으로 변경한다.
 */
async function _completeUnpaidSale(saleId: string, paymentMethod: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(saleId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const pmParsed = z.enum(['cash', 'card', 'transfer', 'naverpay', 'kakaopay']).safeParse(paymentMethod);
  if (!pmParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 결제방식입니다');

  await apiFetch<KotlinSale>(`/sales/${idParsed.data}/complete-unpaid`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod: pmParsed.data }),
  });

  revalidatePath('/sales');
  revalidatePath('/calendar');
  revalidatePath('/');
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

  revalidatePath('/sales');
  revalidatePath('/calendar');
  revalidatePath('/');
}

export const revertUnpaidSale = withErrorLogging('revertUnpaidSale', _revertUnpaidSale);

async function _deleteSale(id: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  await apiFetch<void>(`/sales/${idParsed.data}`, { method: 'DELETE' });

  revalidatePath('/sales');
  revalidatePath('/customers');
  revalidatePath('/');
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
 * 매출 비고 자동완성용 과거 값 조회
 */
async function _getSaleSuggestions(): Promise<{ notes: string[] }> {
  await requireAuth();
  // 서버가 빈도순 정렬된 note 목록을 반환한다.
  const { notes } = await apiFetch<{ notes: string[] }>('/sales/suggestions');
  return { notes };
}

export const getSaleSuggestions = withErrorLogging('getSaleSuggestions', _getSaleSuggestions);
