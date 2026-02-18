'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { findOrCreateCustomer } from './customers';
import type { Sale } from '@/types/database';
import { saleSchema, uuidSchema, validateImageFile } from '@/lib/validations';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { getMonthDateRange } from '@/lib/utils';
import { uploadFile, deleteFileByUrl, generateFileKey, StoragePrefix } from '@/lib/storage';

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
  category?: string;
  payment?: string;
  channel?: string;
}

async function _getSales(month?: string, offset: number = 0, limit: number = SALES_PAGE_SIZE, filters?: SalesFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('sales')
    .select(`
      *,
      customer:customers(id, name, phone)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (month) {
    if (month.length === 4) {
      query = query.gte('date', `${month}-01-01`).lte('date', `${month}-12-31`);
    } else {
      const { startDate, endDate } = getMonthDateRange(month);
      query = query.gte('date', startDate).lte('date', endDate);
    }
  }

  if (filters?.category) query = query.eq('product_category', filters.category);
  if (filters?.payment) query = query.eq('payment_method', filters.payment);
  if (filters?.channel) query = query.eq('reservation_channel', filters.channel);

  const { data, error } = await query;
  if (error) throw error;

  const sales = (data || []).map(sale => ({
    ...sale,
    customer_name: sale.customer?.name || sale.customer_name,
    customer_phone: sale.customer?.phone || sale.customer_phone,
  })) as Sale[];

  return { sales, hasMore: (data || []).length === limit };
}

export const getSales = withErrorLogging('getSales', _getSales);

async function _loadMoreSales(month: string | null, offset: number, filters?: SalesFilters) {
  return _getSales(month ?? undefined, offset, SALES_PAGE_SIZE, filters);
}

export const loadMoreSales = withErrorLogging('loadMoreSales', _loadMoreSales);

// 요약 집계 (DB RPC로 직접 집계 — row limit 영향 없음)
async function _getSalesSummary(month?: string, filters?: SalesFilters) {
  const supabase = await createClient();

  let startDate: string | null = null;
  let endDate: string | null = null;

  if (month) {
    if (month.length === 4) {
      startDate = `${month}-01-01`;
      endDate = `${month}-12-31`;
    } else {
      const range = getMonthDateRange(month);
      startDate = range.startDate;
      endDate = range.endDate;
    }
  }

  const { data, error } = await supabase.rpc('get_sales_summary', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_category: filters?.category || null,
    p_payment: filters?.payment || null,
    p_channel: filters?.channel || null,
  });
  if (error) throw error;

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
  const user = await requireAuth();
  const supabase = await createClient();

  const productCategory = formData.get('product_category') as string;
  const customerName = formData.get('customer_name') as string || null;
  const customerPhone = formData.get('customer_phone') as string || null;
  const customerId = formData.get('customer_id') as string || null;

  // 입력 검증
  const parsed = saleSchema.safeParse({
    date: formData.get('date'),
    product_category: productCategory,
    amount: parseInt(formData.get('amount') as string) || 0,
    payment_method: formData.get('payment_method'),
    card_company: formData.get('card_company') || null,
    fee: formData.get('fee') ? parseInt(formData.get('fee') as string) : null,
    expected_deposit: formData.get('expected_deposit') ? parseInt(formData.get('expected_deposit') as string) : null,
    expected_deposit_date: formData.get('expected_deposit_date') || null,
    deposit_status: formData.get('deposit_status') || 'not_applicable',
    reservation_channel: formData.get('reservation_channel') || 'other',
    customer_name: customerName,
    customer_phone: customerPhone,
    note: formData.get('note') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const finalCustomerId = await resolveCustomerId(customerId, customerName, customerPhone);

  const sale = {
    user_id: user.id,
    date: parsed.data.date,
    product_name: productCategory,
    product_category: productCategory,
    amount: parsed.data.amount,
    payment_method: parsed.data.payment_method,
    card_company: parsed.data.card_company || null,
    fee: parsed.data.fee || null,
    expected_deposit: parsed.data.expected_deposit || null,
    expected_deposit_date: parsed.data.expected_deposit_date || null,
    deposit_status: parsed.data.deposit_status || 'not_applicable',
    reservation_channel: parsed.data.reservation_channel || 'other',
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_id: finalCustomerId,
    note: parsed.data.note || null,
  };

  const { data, error } = await supabase.from('sales').insert(sale).select().single();
  if (error) throw error;

  revalidatePath('/sales');
  revalidatePath('/customers');
  revalidatePath('/');
  return data;
}

export const createSale = withErrorLogging('createSale', _createSale);

async function _updateSale(id: string, formData: FormData) {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const customerName = formData.get('customer_name') as string || null;
  const customerPhone = formData.get('customer_phone') as string || null;
  const customerId = formData.get('customer_id') as string || null;

  const parsed = saleSchema.partial().safeParse({
    date: formData.get('date') || undefined,
    product_category: formData.get('product_category') || undefined,
    amount: formData.get('amount') ? parseInt(formData.get('amount') as string) : undefined,
    payment_method: formData.get('payment_method') || undefined,
    card_company: formData.get('card_company') || null,
    fee: formData.get('fee') ? parseInt(formData.get('fee') as string) : null,
    expected_deposit: formData.get('expected_deposit') ? parseInt(formData.get('expected_deposit') as string) : null,
    expected_deposit_date: formData.get('expected_deposit_date') || null,
    deposit_status: formData.get('deposit_status') || undefined,
    reservation_channel: formData.get('reservation_channel') || undefined,
    customer_name: customerName,
    customer_phone: customerPhone,
    note: formData.get('note') || null,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const supabase = await createClient();
  const finalCustomerId = await resolveCustomerId(customerId, customerName, customerPhone);

  const updates: Record<string, string | number | boolean | null | undefined> = {
    ...parsed.data,
    product_name: parsed.data.product_category,
    customer_id: finalCustomerId,
  };

  const hasReview = formData.get('has_review');
  if (hasReview !== null) {
    updates.has_review = hasReview === 'true';
  }

  const { error } = await supabase.from('sales').update(updates).eq('id', id);
  if (error) throw error;

  revalidatePath('/sales');
  revalidatePath('/customers');
  revalidatePath('/');
}

export const updateSale = withErrorLogging('updateSale', _updateSale);

async function _deleteSale(id: string) {
  await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  const supabase = await createClient();
  const { error } = await supabase.from('sales').delete().eq('id', idParsed.data);
  if (error) throw error;

  revalidatePath('/sales');
  revalidatePath('/customers');
  revalidatePath('/');
}

export const deleteSale = withErrorLogging('deleteSale', _deleteSale);

// Photo upload functions
async function _uploadSalePhotos(saleId: string, formData: FormData): Promise<string[]> {
  await requireAuth();
  const supabase = await createClient();
  const files = formData.getAll('photos') as File[];
  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (!file.size) continue;

    const imageError = validateImageFile(file);
    if (imageError) throw new AppError(ErrorCode.VALIDATION, imageError);

    // R2 Storage: 키 생성 및 업로드
    const key = generateFileKey(StoragePrefix.PHOTO_CARDS, saleId, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const publicUrl = await uploadFile(key, arrayBuffer, file.type || 'image/jpeg');

    uploadedUrls.push(publicUrl);
  }

  // Update sale with photo URLs
  if (uploadedUrls.length > 0) {
    const { data: sale } = await supabase
      .from('sales')
      .select('photos')
      .eq('id', saleId)
      .single();

    const existingPhotos = sale?.photos || [];
    const allPhotos = [...existingPhotos, ...uploadedUrls];

    const { error: updateError } = await supabase
      .from('sales')
      .update({ photos: allPhotos })
      .eq('id', saleId);

    if (updateError) throw updateError;
  }

  revalidatePath('/sales');
  revalidatePath('/customers');
  return uploadedUrls;
}

export const uploadSalePhotos = withErrorLogging('uploadSalePhotos', _uploadSalePhotos);

async function _deleteSalePhoto(saleId: string, photoUrl: string): Promise<void> {
  await requireAuth();
  const supabase = await createClient();

  // R2 Storage: URL로 파일 삭제
  await deleteFileByUrl(photoUrl);

  // Update sale to remove photo URL
  const { data: sale } = await supabase
    .from('sales')
    .select('photos')
    .eq('id', saleId)
    .single();

  if (sale?.photos) {
    const updatedPhotos = sale.photos.filter((p: string) => p !== photoUrl);
    await supabase
      .from('sales')
      .update({ photos: updatedPhotos })
      .eq('id', saleId);
  }

  revalidatePath('/sales');
  revalidatePath('/customers');
}

export const deleteSalePhoto = withErrorLogging('deleteSalePhoto', _deleteSalePhoto);

async function _getSaleById(id: string): Promise<Sale | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      customer:customers(id, name, phone)
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  // 고객 정보 병합
  return {
    ...data,
    customer_name: data.customer?.name || data.customer_name,
    customer_phone: data.customer?.phone || data.customer_phone,
  } as Sale;
}

export const getSaleById = withErrorLogging('getSaleById', _getSaleById);
