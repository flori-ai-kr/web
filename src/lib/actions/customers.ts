'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import type {Customer, CustomerGender, CustomerGrade, PaymentMethod, ReservationChannel, Sale,} from '@/types/database';
import {customerGradeSchema, customerSchema, idSchema} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// Kotlin /customers 응답 (camelCase). 서버 계약과 1:1.
interface KotlinCustomer {
  id: string;
  name: string;
  phone: string;
  grade: string;
  gender: string | null;
  memo: string | null;
  totalPurchaseCount: number;
  totalPurchaseAmount: number;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KotlinCustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  grade: string;
}

// camelCase(Kotlin) → snake_case(웹 Customer 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
function mapKotlinCustomer(c: KotlinCustomer): Customer {
  return {
    id: c.id,
    user_id: '',
    name: c.name,
    phone: c.phone,
    grade: c.grade as CustomerGrade,
    gender: (c.gender as CustomerGender | null) ?? null,
    total_purchase_count: c.totalPurchaseCount,
    total_purchase_amount: c.totalPurchaseAmount,
    first_purchase_date: c.firstPurchaseDate ?? undefined,
    last_purchase_date: c.lastPurchaseDate ?? undefined,
    memo: c.memo ?? undefined,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

async function _getCustomers() {
  await requireAuth();
  // 서버가 매출 통계를 실시간 집계 후 구매금액 내림차순 정렬해 반환한다.
  const customers = await apiFetch<KotlinCustomer[]>('/customers');
  return customers.map(mapKotlinCustomer);
}

export const getCustomers = withErrorLogging('getCustomers', _getCustomers);

async function _getCustomerById(id: string) {
  await requireAuth();
  const customer = await apiFetch<KotlinCustomer>(`/customers/${id}`);
  return mapKotlinCustomer(customer);
}

export const getCustomerById = withErrorLogging('getCustomerById', _getCustomerById);

function parseGender(formData: FormData): 'male' | 'female' | null {
  const raw = formData.get('gender');
  return (raw === 'male' || raw === 'female') ? raw : null;
}

async function _createCustomer(formData: FormData) {
  await requireAuth();

  const parsed = customerSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    grade: formData.get('grade') || 'new',
    gender: parseGender(formData),
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const created = await apiFetch<KotlinCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: parsed.data.name,
      phone: parsed.data.phone,
      grade: parsed.data.grade || 'new',
      gender: parsed.data.gender ?? null,
      memo: parsed.data.memo || null,
    }),
  });

  revalidatePath('/admin/customers');
  return mapKotlinCustomer(created);
}

export const createCustomer = withErrorLogging('createCustomer', _createCustomer);

async function _updateCustomer(id: string, formData: FormData) {
  await requireAuth();

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const parsed = customerSchema.partial().safeParse({
    name: formData.get('name') || undefined,
    phone: formData.get('phone') || undefined,
    grade: formData.get('grade') || undefined,
    gender: parseGender(formData),
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 제공된(non-null) 필드만 PATCH (서버가 null 필드는 미반영)
  await apiFetch<KotlinCustomer>(`/customers/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: parsed.data.name ?? null,
      phone: parsed.data.phone ?? null,
      grade: parsed.data.grade ?? null,
      gender: parsed.data.gender ?? null,
      memo: parsed.data.memo ?? null,
    }),
  });

  revalidatePath('/admin/customers');
}

export const updateCustomer = withErrorLogging('updateCustomer', _updateCustomer);

async function _updateCustomerGrade(id: string, grade: CustomerGrade) {
  await requireAuth();

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  const gradeParsed = customerGradeSchema.safeParse(grade);
  if (!gradeParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 등급입니다');

  await apiFetch<KotlinCustomer>(`/customers/${idParsed.data}/grade`, {
    method: 'PATCH',
    body: JSON.stringify({ grade: gradeParsed.data }),
  });

  revalidatePath('/admin/customers');
}

export const updateCustomerGrade = withErrorLogging('updateCustomerGrade', _updateCustomerGrade);

async function _deleteCustomer(id: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  await apiFetch<void>(`/customers/${idParsed.data}`, { method: 'DELETE' });

  revalidatePath('/admin/customers');
}

export const deleteCustomer = withErrorLogging('deleteCustomer', _deleteCustomer);

async function _findOrCreateCustomer(name: string, phone: string) {
  await requireAuth();
  // 서버가 phone+tenant 기준으로 찾거나 생성한다(레이스 컨디션은 서버 책임).
  const customer = await apiFetch<KotlinCustomer>('/customers/find-or-create', {
    method: 'POST',
    body: JSON.stringify({ name, phone }),
  });
  return mapKotlinCustomer(customer);
}

export const findOrCreateCustomer = withErrorLogging('findOrCreateCustomer', _findOrCreateCustomer);

// Kotlin SaleResponse(camelCase) → 웹 Sale 타입(snake_case) 매핑.
// /sales 응답과 동일한 계약. photos는 Kotlin /sales가 반환하지 않으므로 undefined.
interface KotlinCustomerSale {
  id: string;
  date: string;
  productName: string;
  productCategory: string | null;
  amount: number;
  paymentMethod: string;
  reservationChannel: string;
  customerName: string | null;
  customerPhone: string | null;
  customerId: string | null;
  memo: string | null;
  isUnpaid: boolean;
  hasReview: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KotlinCustomerSalesPage {
  sales: KotlinCustomerSale[];
  hasMore: boolean;
}

function mapCustomerSale(s: KotlinCustomerSale): Sale {
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
    memo: s.memo ?? undefined,
    is_unpaid: s.isUnpaid,
    has_review: s.hasReview,
    photos: undefined,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

async function _getCustomerSales(customerId: string, page: number = 0, pageSize: number = 10) {
  await requireAuth();
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(pageSize));

  const result = await apiFetch<KotlinCustomerSalesPage>(`/customers/${customerId}/sales?${params.toString()}`);
  return { sales: result.sales.map(mapCustomerSale), hasMore: result.hasMore };
}

export const getCustomerSales = withErrorLogging('getCustomerSales', _getCustomerSales);

// 이름으로 고객 검색 (LIKE)
async function _searchCustomersByName(query: string) {
  if (!query || query.length < 1) return [];

  await requireAuth();
  const params = new URLSearchParams();
  params.set('q', query);

  const results = await apiFetch<KotlinCustomerSearchResult[]>(`/customers/search?${params.toString()}`);
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    grade: r.grade as CustomerGrade,
  })) as Pick<Customer, 'id' | 'name' | 'phone' | 'grade'>[];
}

export const searchCustomersByName = withErrorLogging('searchCustomersByName', _searchCustomersByName);

// 연락처 중복 체크 (중복 없으면 204 → undefined)
async function _checkPhoneDuplicate(phone: string, excludeId?: string) {
  if (!phone || phone.length < 10) return null;

  await requireAuth();
  const params = new URLSearchParams();
  params.set('phone', phone);
  if (excludeId) params.set('excludeId', excludeId);

  const result = await apiFetch<KotlinCustomerSearchResult | undefined>(
    `/customers/check-phone?${params.toString()}`,
  );
  if (!result) return null;

  return { id: result.id, name: result.name, phone: result.phone };
}

export const checkPhoneDuplicate = withErrorLogging('checkPhoneDuplicate', _checkPhoneDuplicate);
