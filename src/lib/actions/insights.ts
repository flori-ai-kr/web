'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {
    DEFAULT_BOTTOM_NAV_ITEMS,
    type InstagramAccount,
    type InstagramPostWithAccount,
    type InstagramRegion,
    type NavItemKey,
    type TrendArticle,
    type TrendCategory,
    type UserPreferences,
} from '@/types/database';
import {bottomNavItemsSchema, instagramAccountCreateSchema, instagramAccountUpdateSchema,} from '@/lib/validations';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch, apiFetchInternal} from '@/lib/api/client';
import {
    type KotlinTrendArticle,
    type KotlinInstagramAccount,
    type KotlinInstagramPost,
    mapTrendArticle,
    mapAccount,
    mapPost,
} from '@/lib/api/insights-mappers';

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 공통 DTO/매퍼(KotlinTrendArticle/Account/Post)는 lib/api/insights-mappers.ts 에서 import.

interface KotlinUserPreferences {
  bottomNavItems: string[];
}

// ─── 트렌드 조회 ──────────────────────────────────────────

async function _getTrendArticles(options: {
  category?: TrendCategory;
  limit?: number;
  offset?: number;
} = {}): Promise<TrendArticle[]> {
  await requireAuth();

  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  params.set('limit', String(options.limit ?? 50));
  params.set('offset', String(options.offset ?? 0));

  const data = await apiFetch<KotlinTrendArticle[]>(
    `/insights/trends?${params.toString()}`,
  );
  return (data ?? []).map(mapTrendArticle);
}

export const getTrendArticles = withErrorLogging('getTrendArticles', _getTrendArticles);

/**
 * 대시보드용: 카테고리별로 최신 N개씩 가져온다.
 */
async function _getRecentTrendsByCategory(
  limitPerCategory: number = 3,
): Promise<Record<TrendCategory, TrendArticle[]>> {
  await requireAuth();

  const params = new URLSearchParams();
  params.set('perCategory', String(limitPerCategory));

  const data = await apiFetch<Record<string, KotlinTrendArticle[]>>(
    `/insights/trends/recent?${params.toString()}`,
  );

  const output: Record<TrendCategory, TrendArticle[]> = {
    flower: [],
    inspiration: [],
    business: [],
    industry: [],
  };
  for (const category of Object.keys(output) as TrendCategory[]) {
    output[category] = (data[category] ?? []).map(mapTrendArticle);
  }
  return output;
}

export const getRecentTrendsByCategory = withErrorLogging(
  'getRecentTrendsByCategory',
  _getRecentTrendsByCategory,
);

async function _getTrendCountsByCategory(
  sinceIsoDate?: string,
): Promise<Record<TrendCategory, number>> {
  await requireAuth();

  const params = new URLSearchParams();
  if (sinceIsoDate) params.set('since', sinceIsoDate);
  const data = await apiFetch<Record<string, number>>(
    `/insights/trends/counts?${params.toString()}`,
  );

  const counts: Record<TrendCategory, number> = {
    flower: 0,
    inspiration: 0,
    business: 0,
    industry: 0,
  };
  for (const category of Object.keys(counts) as TrendCategory[]) {
    counts[category] = data[category] ?? 0;
  }
  return counts;
}

export const getTrendCountsByCategory = withErrorLogging(
  'getTrendCountsByCategory',
  _getTrendCountsByCategory,
);

// ─── Instagram 계정 관리 ─────────────────────────────────

async function _getInstagramAccounts(options: {
  activeOnly?: boolean;
} = {}): Promise<InstagramAccount[]> {
  await requireAuth();

  const params = new URLSearchParams();
  if (options.activeOnly) params.set('activeOnly', 'true');

  const data = await apiFetch<KotlinInstagramAccount[]>(
    `/insights/accounts?${params.toString()}`,
  );
  return (data ?? []).map(mapAccount);
}

export const getInstagramAccounts = withErrorLogging(
  'getInstagramAccounts',
  _getInstagramAccounts,
);

async function _createInstagramAccount(input: unknown): Promise<InstagramAccount> {
  // 계정 관리는 서버에 사용자용 엔드포인트가 없어 /internal/** (Bearer INTERNAL_API_KEY)로 호출한다.
  await requireAuth();
  const parsed = instagramAccountCreateSchema.parse(input);

  const data = await apiFetchInternal<KotlinInstagramAccount>('/internal/instagram-accounts', {
    method: 'POST',
    body: JSON.stringify({
      username: parsed.username,
      displayName: parsed.display_name ?? null,
      region: parsed.region,
      sortOrder: parsed.sort_order ?? 0,
      active: parsed.active ?? true,
      notes: parsed.memo ?? null,
    }),
  });

  revalidatePath('/admin/insights/follows');
  return mapAccount(data);
}

export const createInstagramAccount = withErrorLogging(
  'createInstagramAccount',
  _createInstagramAccount,
);

async function _updateInstagramAccount(
  id: string,
  input: unknown,
): Promise<InstagramAccount> {
  await requireAuth();
  const parsed = instagramAccountUpdateSchema.parse(input);

  const body: Record<string, unknown> = {};
  if (parsed.username !== undefined) body.username = parsed.username;
  if (parsed.display_name !== undefined) body.displayName = parsed.display_name;
  if (parsed.region !== undefined) body.region = parsed.region;
  if (parsed.sort_order !== undefined) body.sortOrder = parsed.sort_order;
  if (parsed.active !== undefined) body.active = parsed.active;
  if (parsed.memo !== undefined) body.notes = parsed.memo;

  const data = await apiFetchInternal<KotlinInstagramAccount>(
    `/internal/instagram-accounts/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );

  revalidatePath('/admin/insights/follows');
  return mapAccount(data);
}

export const updateInstagramAccount = withErrorLogging(
  'updateInstagramAccount',
  _updateInstagramAccount,
);

async function _deleteInstagramAccount(id: string): Promise<void> {
  await requireAuth();

  await apiFetchInternal<void>(
    `/internal/instagram-accounts/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );

  revalidatePath('/admin/insights/follows');
}

export const deleteInstagramAccount = withErrorLogging(
  'deleteInstagramAccount',
  _deleteInstagramAccount,
);

// ─── Instagram 포스트 조회 ───────────────────────────────

async function _getInstagramPosts(options: {
  accountId?: string;
  region?: InstagramRegion;
  limit?: number;
  sortBy?: 'latest' | 'likes';
  daysAgo?: number;
} = {}): Promise<InstagramPostWithAccount[]> {
  await requireAuth();

  const params = new URLSearchParams();
  if (options.accountId) params.set('accountId', options.accountId);
  if (options.region) params.set('region', options.region);
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.daysAgo) params.set('daysAgo', String(options.daysAgo));
  params.set('limit', String(options.limit ?? 50));

  const data = await apiFetch<KotlinInstagramPost[]>(
    `/insights/posts?${params.toString()}`,
  );
  return (data ?? []).map(mapPost);
}

export const getInstagramPosts = withErrorLogging('getInstagramPosts', _getInstagramPosts);

async function _getLatestInstagramTimestamp(): Promise<string | null> {
  await requireAuth();
  const data = await apiFetch<{ latest: string | null }>('/insights/instagram/latest');
  return data?.latest ?? null;
}

export const getLatestInstagramTimestamp = withErrorLogging(
  'getLatestInstagramTimestamp',
  _getLatestInstagramTimestamp,
);

// ─── 유저 설정 (하단바 커스터마이즈) ─────────────────────

async function _getUserPreferences(): Promise<UserPreferences> {
  await requireAuth();

  const data = await apiFetch<KotlinUserPreferences>('/settings/preferences');
  const items = (data.bottomNavItems as NavItemKey[]) || [...DEFAULT_BOTTOM_NAV_ITEMS];
  return {
    user_id: '',
    bottom_nav_items: items,
    updated_at: new Date().toISOString(),
  };
}

export const getUserPreferences = withErrorLogging('getUserPreferences', _getUserPreferences);

async function _updateBottomNavItems(items: unknown): Promise<UserPreferences> {
  await requireAuth();
  const parsed = bottomNavItemsSchema.parse(items);

  const data = await apiFetch<KotlinUserPreferences>('/settings/preferences/bottom-nav', {
    method: 'PUT',
    body: JSON.stringify({ items: parsed }),
  });

  revalidatePath('/', 'layout');
  return {
    user_id: '',
    bottom_nav_items: (data.bottomNavItems as NavItemKey[]) ?? parsed,
    updated_at: new Date().toISOString(),
  };
}

export const updateBottomNavItems = withErrorLogging(
  'updateBottomNavItems',
  _updateBottomNavItems,
);
