'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import type {Customer, Sale} from '@/types/database';
import {customerSchema, idSchema} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';
import {mapKotlinCustomer, type KotlinCustomer} from '@/lib/api/mappers/customers';

interface KotlinCustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  grade: string | null;
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
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const customer = await apiFetch<KotlinCustomer>(`/customers/${idParsed.data}`);
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
    gender: parseGender(formData),
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 등급은 더 이상 생성 요청에 포함하지 않는다 (서버가 자동 산정/시드).
  const created = await apiFetch<KotlinCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: parsed.data.name,
      phone: parsed.data.phone,
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
    gender: parseGender(formData),
    memo: formData.get('memo') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 등급은 별도 엔드포인트(assignCustomerGrade/revertCustomerGradeAuto)로만 변경한다.
  // 제공된(non-null) 필드만 PATCH (서버가 null 필드는 미반영)
  await apiFetch<KotlinCustomer>(`/customers/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: parsed.data.name ?? null,
      phone: parsed.data.phone ?? null,
      gender: parsed.data.gender ?? null,
      memo: parsed.data.memo ?? null,
    }),
  });

  revalidatePath('/admin/customers');
}

export const updateCustomer = withErrorLogging('updateCustomer', _updateCustomer);

// 고객 등급 수동 고정(특정 등급으로 잠금). gradeId는 등급 설정 id.
async function _assignCustomerGrade(customerId: string, gradeId: string) {
  await requireAuth();

  const idParsed = idSchema.safeParse(customerId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  const gradeParsed = idSchema.safeParse(gradeId);
  if (!gradeParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 등급입니다');

  await apiFetch<KotlinCustomer>(`/customers/${idParsed.data}/grade`, {
    method: 'PATCH',
    body: JSON.stringify({ gradeId: Number(gradeParsed.data) }),
  });

  revalidatePath('/admin/customers');
}

export const assignCustomerGrade = withErrorLogging('assignCustomerGrade', _assignCustomerGrade);

// 고객 등급을 자동 산정 모드로 되돌린다(수동 고정 해제).
async function _revertCustomerGradeAuto(customerId: string) {
  await requireAuth();

  const idParsed = idSchema.safeParse(customerId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  await apiFetch<KotlinCustomer>(`/customers/${idParsed.data}/grade/auto`, {
    method: 'PATCH',
  });

  revalidatePath('/admin/customers');
}

export const revertCustomerGradeAuto = withErrorLogging('revertCustomerGradeAuto', _revertCustomerGradeAuto);

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

interface KotlinCustomerSalesPage {
  sales: KotlinCustomerSale[];
  hasMore: boolean;
}

function mapCustomerSale(s: KotlinCustomerSale): Sale {
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
    grade: r.grade ?? null,
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
