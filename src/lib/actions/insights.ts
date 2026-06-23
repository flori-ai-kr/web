'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {
    DEFAULT_BOTTOM_NAV_ITEMS,
    type NavItemKey,
    type TrendArticle,
    type TrendCategory,
    type UserPreferences,
} from '@/types/database';
import {bottomNavItemsSchema} from '@/lib/validations';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';
import {
    type KotlinTrendArticle,
    mapTrendArticle,
} from '@/lib/api/insights-mappers';

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 공통 DTO/매퍼(KotlinTrendArticle)는 lib/api/insights-mappers.ts 에서 import.

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
 * 트렌드·뉴스 탭 무한스크롤 추가 로드.
 */
async function _loadMoreTrendArticles(
  offset: number,
  options: { category?: TrendCategory; limit?: number } = {},
): Promise<TrendArticle[]> {
  return _getTrendArticles({ ...options, offset });
}

export const loadMoreTrendArticles = withErrorLogging(
  'loadMoreTrendArticles',
  _loadMoreTrendArticles,
);

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
