'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {uuidSchema} from '@/lib/validations';

// ============ Product Categories ============

export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

async function _getProductCategories(): Promise<ProductCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data as ProductCategory[];
}

export const getProductCategories = withErrorLogging('getProductCategories', _getProductCategories);

async function _createProductCategory(name: string): Promise<ProductCategory> {
  await requireAuth();

  const supabase = await createClient();

  // 현재 최대 sort_order 가져오기
  const { data: existing } = await supabase
    .from('product_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

  const { data, error } = await supabase
    .from('product_categories')
    .insert({ name, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/settings');
  return data as ProductCategory;
}

export const createProductCategory = withErrorLogging('createProductCategory', _createProductCategory);

async function _updateProductCategory(
  id: string,
  updates: { name?: string; sort_order?: number }
): Promise<void> {
  await requireAuth();

  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const supabase = await createClient();

  const { error } = await supabase
    .from('product_categories')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/settings');
}

export const updateProductCategory = withErrorLogging('updateProductCategory', _updateProductCategory);

async function _deleteProductCategory(id: string): Promise<void> {
  await requireAuth();

  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const supabase = await createClient();

  const { error } = await supabase
    .from('product_categories')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/settings');
}

export const deleteProductCategory = withErrorLogging('deleteProductCategory', _deleteProductCategory);

// ============ Bulk Update ============

async function _saveAllSettings(
  categories: string[]
): Promise<void> {
  await requireAuth();

  const supabase = await createClient();

  // 기존 카테고리 비활성화
  await supabase
    .from('product_categories')
    .update({ is_active: false })
    .eq('is_active', true);

  // 새 카테고리 upsert
  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      await supabase
        .from('product_categories')
        .update({ is_active: true, sort_order: i + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('product_categories')
        .insert({ name, sort_order: i + 1, is_active: true });
    }
  }

  revalidatePath('/settings');
  revalidatePath('/sales');
}

export const saveAllSettings = withErrorLogging('saveAllSettings', _saveAllSettings);
