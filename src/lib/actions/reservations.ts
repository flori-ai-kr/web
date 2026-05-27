'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import type { Reservation, ReservationStatus, Sale } from '@/types/database';
import { reservationSchema, uuidSchema } from '@/lib/validations';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { apiFetch } from '@/lib/api/client';

// Kotlin /reservations 응답의 단일 예약 (camelCase). 서버 계약과 1:1.
interface KotlinReservation {
  id: string;
  date: string;
  time: string | null;
  customerName: string;
  customerPhone: string | null;
  title: string;
  description: string | null;
  status: string;
  saleId: string | null;
  amount: number;
  reminderAt: string | null;
  reminderSent: boolean;
  pickupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Kotlin /reservations/{id}/convert-to-sale 응답 (SaleResponse, camelCase).
interface KotlinSale {
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
  note: string | null;
  isUnpaid: boolean;
  hasReview: boolean;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 Reservation 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
function mapKotlinReservation(r: KotlinReservation): Reservation {
  return {
    id: r.id,
    user_id: '',
    date: r.date,
    time: r.time,
    customer_name: r.customerName,
    customer_phone: r.customerPhone,
    title: r.title,
    description: r.description,
    status: r.status as ReservationStatus,
    sale_id: r.saleId,
    amount: r.amount,
    reminder_at: r.reminderAt,
    reminder_sent: r.reminderSent,
    pickup_completed: r.pickupCompleted,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

// camelCase(Kotlin SaleResponse) → snake_case(웹 Sale 타입) 매핑.
function mapKotlinSale(s: KotlinSale): Sale {
  return {
    id: s.id,
    user_id: '',
    date: s.date,
    product_name: s.productName,
    product_category: s.productCategory ?? s.productName,
    amount: s.amount,
    payment_method: s.paymentMethod as Sale['payment_method'],
    reservation_channel: s.reservationChannel as Sale['reservation_channel'],
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

// getReservations: Kotlin GET /reservations?month 으로 전환 (이전엔 Supabase 조인 잔류).
// 매출 조인 부가필드(sale_date/product_category/purchase_count 등)는 Kotlin 기본 응답에 없어
// undefined로 둔다 — sale 연결 예약의 부가 표시(상품 카테고리 칩/방문 횟수 뱃지)만 영향,
// 예약 자체 표시·상태 관리는 정상. (전체 충실도 필요 시 Kotlin 측 조인 엔드포인트 보강)
async function _getReservations(month: string): Promise<(Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number; sale_is_unpaid?: boolean; sale_payment_method?: string; sale_reservation_channel?: string })[]> {
  await requireAuth();
  const list = await apiFetch<KotlinReservation[]>(`/reservations?month=${encodeURIComponent(month)}`);
  return list.map((r) => ({
    ...mapKotlinReservation(r),
    sale_date: undefined,
    product_category: undefined,
    customer_id: undefined,
    purchase_count: undefined,
    sale_is_unpaid: undefined,
    sale_payment_method: undefined,
    sale_reservation_channel: undefined,
  }));
}

export const getReservations = withErrorLogging('getReservations', _getReservations);

async function _createReservation(formData: {
  date: string;
  time?: string;
  customer_name: string;
  customer_phone?: string;
  title: string;
  description?: string;
  amount?: number;
  status?: ReservationStatus;
  reminder_at?: string | null;
}): Promise<Reservation> {
  await requireAuth();

  const parsed = reservationSchema.safeParse(formData);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const created = await apiFetch<KotlinReservation>('/reservations', {
    method: 'POST',
    body: JSON.stringify({
      date: parsed.data.date,
      time: parsed.data.time || null,
      customerName: parsed.data.customer_name,
      customerPhone: parsed.data.customer_phone || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      amount: parsed.data.amount ?? 0,
      status: parsed.data.status || 'pending',
      reminderAt: parsed.data.reminder_at || null,
    }),
  });

  return mapKotlinReservation(created);
}

export const createReservation = withErrorLogging('createReservation', _createReservation);

async function _updateReservation(
  id: string,
  formData: {
    date?: string;
    time?: string | null;
    customer_name?: string;
    customer_phone?: string | null;
    title?: string;
    description?: string | null;
    amount?: number;
    status?: ReservationStatus;
    sale_id?: string | null;
    reminder_at?: string | null;
    pickup_completed?: boolean;
  }
): Promise<void> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const parsed = reservationSchema.partial().safeParse({
    date: formData.date,
    time: formData.time,
    customer_name: formData.customer_name,
    customer_phone: formData.customer_phone,
    title: formData.title,
    description: formData.description,
    amount: formData.amount,
    status: formData.status,
    reminder_at: formData.reminder_at,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 제공된(non-undefined) 필드만 PATCH 본문에 포함한다. Kotlin update는 non-null 필드만 반영하며
  // reminderAt 변경 시 reminderSent를 서버에서 리셋한다.
  const body: Record<string, string | number | boolean | null> = {};
  if (parsed.data.date !== undefined) body.date = parsed.data.date;
  if (parsed.data.time !== undefined) body.time = parsed.data.time;
  if (parsed.data.customer_name !== undefined) body.customerName = parsed.data.customer_name;
  if (parsed.data.customer_phone !== undefined) body.customerPhone = parsed.data.customer_phone;
  if (parsed.data.title !== undefined) body.title = parsed.data.title;
  if (parsed.data.description !== undefined) body.description = parsed.data.description;
  if (parsed.data.amount !== undefined) body.amount = parsed.data.amount;
  if (parsed.data.status !== undefined) body.status = parsed.data.status;
  if (formData.reminder_at !== undefined) body.reminderAt = formData.reminder_at;
  if (formData.pickup_completed !== undefined) body.pickupCompleted = formData.pickup_completed;
  if (formData.sale_id !== undefined) {
    const saleParsed = formData.sale_id ? uuidSchema.safeParse(formData.sale_id) : null;
    if (formData.sale_id && (!saleParsed || !saleParsed.success)) {
      throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 매출 ID입니다');
    }
    body.saleId = formData.sale_id;
  }

  await apiFetch<KotlinReservation>(`/reservations/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export const updateReservation = withErrorLogging('updateReservation', _updateReservation);

async function _deleteReservation(id: string): Promise<void> {
  await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  await apiFetch<void>(`/reservations/${idParsed.data}`, { method: 'DELETE' });
}

export const deleteReservation = withErrorLogging('deleteReservation', _deleteReservation);

/**
 * 예약을 매출로 변환한다.
 * 서버(/reservations/{id}/convert-to-sale)가 매출 생성 + 예약 sale_id 연결을 트랜잭션으로 처리한다.
 */
async function _convertReservationToSale(
  reservationId: string,
  saleFormData: FormData,
): Promise<Sale> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(reservationId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  // FormData → SaleCreateRequest(camelCase) 매핑. 고객 해석/계산은 서버가 처리한다.
  const customerId = (saleFormData.get('customer_id') as string) || null;
  const body: Record<string, string | number | null> = {
    date: (saleFormData.get('date') as string) ?? null,
    productCategory: (saleFormData.get('product_category') as string) ?? null,
    amount: parseInt(saleFormData.get('amount') as string) || 0,
    paymentMethod: (saleFormData.get('payment_method') as string) ?? null,
    reservationChannel: (saleFormData.get('reservation_channel') as string) || 'other',
    customerName: (saleFormData.get('customer_name') as string) || null,
    customerPhone: (saleFormData.get('customer_phone') as string) || null,
    customerId,
    note: (saleFormData.get('note') as string) || null,
  };

  const sale = await apiFetch<KotlinSale>(`/reservations/${idParsed.data}/convert-to-sale`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  revalidatePath('/calendar');
  revalidatePath('/');
  return mapKotlinSale(sale);
}

export const convertReservationToSale = withErrorLogging('convertReservationToSale', _convertReservationToSale);

/**
 * 기존 매출에 픽업(예약)을 추가한다.
 * 고객 정보는 서버가 매출에서 상속한다.
 */
async function _addPickupToSale(
  saleId: string,
  formData: {
    date: string;
    time?: string;
    title: string;
    amount?: number;
    reminder_at?: string | null;
  }
): Promise<Reservation> {
  await requireAuth();

  const saleParsed = uuidSchema.safeParse(saleId);
  if (!saleParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 매출 ID입니다');

  const parsed = reservationSchema.pick({
    date: true,
    time: true,
    title: true,
    amount: true,
    reminder_at: true,
  }).safeParse({
    date: formData.date,
    time: formData.time || null,
    title: formData.title,
    amount: formData.amount,
    reminder_at: formData.reminder_at,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const created = await apiFetch<KotlinReservation>(`/reservations/add-pickup/${saleParsed.data}`, {
    method: 'POST',
    body: JSON.stringify({
      date: parsed.data.date,
      time: parsed.data.time || null,
      title: parsed.data.title,
      amount: parsed.data.amount ?? 0,
      reminderAt: parsed.data.reminder_at || null,
    }),
  });

  revalidatePath('/calendar');
  return mapKotlinReservation(created);
}

export const addPickupToSale = withErrorLogging('addPickupToSale', _addPickupToSale);

/**
 * 매출에 연결된 예약 목록을 조회한다.
 */
async function _getReservationsForSale(saleId: string): Promise<Reservation[]> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(saleId);
  if (!idParsed.success) return [];

  const list = await apiFetch<KotlinReservation[]>(`/reservations/by-sale/${idParsed.data}`);
  return list.map(mapKotlinReservation);
}

export const getReservationsForSale = withErrorLogging('getReservationsForSale', _getReservationsForSale);

/**
 * 발동된 리마인더 목록을 조회한다.
 * reminder_at <= 현재 시간 && 최근 48시간 이내, 취소 제외 (서버가 필터)
 */
async function _getTriggeredReminders(): Promise<Reservation[]> {
  await requireAuth();
  const list = await apiFetch<KotlinReservation[]>('/reservations/reminders');
  return list.map(mapKotlinReservation);
}

export const getTriggeredReminders = withErrorLogging('getTriggeredReminders', _getTriggeredReminders);

/**
 * 다가오는 예약 목록을 조회한다.
 * 현재 시점 이후 픽업인 예약, 취소 제외, 날짜+시간 오름차순 (서버가 필터)
 */
async function _getUpcomingReservations(): Promise<Reservation[]> {
  await requireAuth();
  const list = await apiFetch<KotlinReservation[]>('/reservations/upcoming');
  return list.map(mapKotlinReservation);
}

export const getUpcomingReservations = withErrorLogging('getUpcomingReservations', _getUpcomingReservations);

/**
 * 예약 제목/메모 자동완성용 과거 값 조회
 */
async function _getReservationSuggestions(): Promise<{ titles: string[]; descriptions: string[] }> {
  await requireAuth();
  const res = await apiFetch<{ titles: string[]; descriptions: string[] }>('/reservations/suggestions');
  return { titles: res.titles, descriptions: res.descriptions };
}

export const getReservationSuggestions = withErrorLogging('getReservationSuggestions', _getReservationSuggestions);
