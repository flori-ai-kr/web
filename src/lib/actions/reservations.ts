'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { createSale } from './sales';
import type { Reservation, ReservationStatus, Sale } from '@/types/database';
import { reservationSchema, uuidSchema } from '@/lib/validations';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { getMonthDateRange, sortByFrequency } from '@/lib/utils';

async function _getReservations(month: string): Promise<(Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number })[]> {
  const supabase = await createClient();
  const { startDate, endDate } = getMonthDateRange(month);

  const { data, error } = await supabase
    .from('reservations')
    .select('*, sale:sales!sale_id(date, product_category, customer_id, customer:customers!customer_id(total_purchase_count))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('time', { nullsFirst: false });

  if (error) throw error;
  return (data || []).map((r: Record<string, unknown>) => {
    const sale = r.sale as { date: string; product_category: string | null; customer_id: string | null; customer: { total_purchase_count: number } | null } | null;
    const { sale: _, ...rest } = r;
    return {
      ...rest,
      sale_date: sale?.date ?? undefined,
      product_category: sale?.product_category ?? undefined,
      customer_id: sale?.customer_id ?? undefined,
      purchase_count: sale?.customer?.total_purchase_count ?? undefined,
    } as Reservation & { sale_date?: string; product_category?: string; customer_id?: string; purchase_count?: number };
  });
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
  const user = await requireAuth();

  const parsed = reservationSchema.safeParse(formData);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      date: parsed.data.date,
      time: parsed.data.time || null,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      amount: parsed.data.amount ?? 0,
      status: parsed.data.status || 'pending',
      reminder_at: parsed.data.reminder_at || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Reservation;
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

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  if (formData.pickup_completed !== undefined) {
    updates.pickup_completed = formData.pickup_completed;
  }
  if (formData.sale_id !== undefined) {
    const saleParsed = formData.sale_id ? uuidSchema.safeParse(formData.sale_id) : null;
    if (formData.sale_id && (!saleParsed || !saleParsed.success)) {
      throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 매출 ID입니다');
    }
    updates.sale_id = formData.sale_id;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export const updateReservation = withErrorLogging('updateReservation', _updateReservation);

async function _deleteReservation(id: string): Promise<void> {
  await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  const supabase = await createClient();
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}

export const deleteReservation = withErrorLogging('deleteReservation', _deleteReservation);

/**
 * 예약을 매출로 변환한다.
 * 1) 예약 조회 → 2) 매출 생성 (FormData 사용) → 3) 예약 상태 confirmed + sale_id 연결
 */
async function _convertReservationToSale(
  reservationId: string,
  saleFormData: FormData,
): Promise<Sale> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(reservationId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const supabase = await createClient();

  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', idParsed.data)
    .single();

  if (fetchError || !reservation) {
    throw new AppError(ErrorCode.NOT_FOUND, '예약을 찾을 수 없습니다');
  }

  const sale = await createSale(saleFormData);

  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      status: 'pending',
      sale_id: sale.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', idParsed.data);
  if (updateError) throw updateError;

  revalidatePath('/calendar');
  revalidatePath('/');
  return sale as Sale;
}

export const convertReservationToSale = withErrorLogging('convertReservationToSale', _convertReservationToSale);

/**
 * 기존 매출에 픽업(예약)을 추가한다.
 * 고객 정보는 매출에서 상속받는다.
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
  const user = await requireAuth();

  const saleParsed = uuidSchema.safeParse(saleId);
  if (!saleParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 매출 ID입니다');

  const supabase = await createClient();
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('customer_name, customer_phone')
    .eq('id', saleParsed.data)
    .single();
  if (saleError || !sale) throw new AppError(ErrorCode.NOT_FOUND, '매출을 찾을 수 없습니다');

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

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      date: parsed.data.date,
      time: parsed.data.time || null,
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || null,
      title: parsed.data.title,
      amount: parsed.data.amount ?? 0,
      status: 'pending',
      sale_id: saleParsed.data,
      reminder_at: parsed.data.reminder_at || null,
    })
    .select()
    .single();
  if (error) throw error;

  revalidatePath('/calendar');
  return data as Reservation;
}

export const addPickupToSale = withErrorLogging('addPickupToSale', _addPickupToSale);

/**
 * 매출에 연결된 예약 목록을 조회한다.
 */
async function _getReservationsForSale(saleId: string): Promise<Reservation[]> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(saleId);
  if (!idParsed.success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('sale_id', idParsed.data)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []) as Reservation[];
}

export const getReservationsForSale = withErrorLogging('getReservationsForSale', _getReservationsForSale);

/**
 * 발동된 리마인더 목록을 조회한다.
 * reminder_at <= 현재 시간(KST) && 최근 48시간 이내, 취소 제외
 */
async function _getTriggeredReminders(): Promise<Reservation[]> {
  await requireAuth();
  const supabase = await createClient();

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const cutoff = new Date(kstNow.getTime() - 48 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .not('reminder_at', 'is', null)
    .neq('status', 'cancelled')
    .lte('reminder_at', kstNow.toISOString())
    .gte('reminder_at', cutoff.toISOString())
    .order('reminder_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Reservation[];
}

export const getTriggeredReminders = withErrorLogging('getTriggeredReminders', _getTriggeredReminders);

/**
 * 다가오는 예약 목록을 조회한다.
 * 현재 시점(KST) 이후 픽업인 예약, 취소 제외, 날짜+시간 오름차순
 */
async function _getUpcomingReservations(): Promise<Reservation[]> {
  await requireAuth();
  const supabase = await createClient();

  const now = new Date();
  const todayKST = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .neq('status', 'cancelled')
    .gte('date', todayKST)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data || []) as Reservation[];
}

export const getUpcomingReservations = withErrorLogging('getUpcomingReservations', _getUpcomingReservations);

/**
 * 예약 제목/메모 자동완성용 과거 값 조회
 */
async function _getReservationSuggestions(): Promise<{ titles: string[]; descriptions: string[] }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const [titlesRes, descriptionsRes] = await Promise.all([
    supabase.from('reservations').select('title').eq('user_id', user.id).neq('title', '').order('title'),
    supabase.from('reservations').select('description').eq('user_id', user.id).not('description', 'is', null).neq('description', '').order('description'),
  ]);

  const titles = sortByFrequency(titlesRes.data?.map(r => r.title) || []);
  const descriptions = sortByFrequency(descriptionsRes.data?.map(r => r.description) || []);

  return { titles, descriptions };
}

export const getReservationSuggestions = withErrorLogging('getReservationSuggestions', _getReservationSuggestions);
