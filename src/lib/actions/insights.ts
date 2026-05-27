'use server';

import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
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
import {
    bottomNavItemsSchema,
    instagramAccountCreateSchema,
    instagramAccountUpdateSchema,
    uuidSchema,
} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 서버 계약과 1:1. created_at/updated_at처럼 Kotlin이 반환하지 않는 필드는
// 뷰에서 미사용이므로 안전 기본값으로 채운다.

interface KotlinTrendArticle {
  id: string;
  category: TrendCategory;
  title: string;
  summary: string;
  keyPoints: string[];
  sourceUrl: string;
  sourceName: string | null;
  publishedAt: string | null;
  collectedAt: string;
  createdAt: string;
}

interface KotlinInstagramAccount {
  id: string;
  username: string;
  displayName: string | null;
  profileUrl: string;
  region: InstagramRegion;
  sortOrder: number;
  active: boolean;
  notes: string | null;
}

interface KotlinInstagramPost {
  id: string;
  accountId: string;
  shortcode: string;
  permalink: string;
  imageUrls: string[];
  caption: string | null;
  likeCount: number;
  postedAt: string;
  account: KotlinInstagramAccount | null;
}

interface KotlinUserPreferences {
  bottomNavItems: string[];
}

function mapTrendArticle(a: KotlinTrendArticle): TrendArticle {
  return {
    id: a.id,
    category: a.category,
    title: a.title,
    summary: a.summary,
    key_points: a.keyPoints ?? [],
    source_url: a.sourceUrl,
    source_name: a.sourceName ?? null,
    published_at: a.publishedAt ?? null,
    collected_at: a.collectedAt,
    created_at: a.createdAt,
  };
}

function mapAccount(a: KotlinInstagramAccount): InstagramAccount {
  return {
    id: a.id,
    username: a.username,
    display_name: a.displayName ?? null,
    profile_url: a.profileUrl,
    region: a.region,
    sort_order: a.sortOrder,
    active: a.active,
    notes: a.notes ?? null,
    created_at: '',
    updated_at: '',
  };
}

function mapPost(p: KotlinInstagramPost): InstagramPostWithAccount {
  return {
    id: p.id,
    account_id: p.accountId,
    shortcode: p.shortcode,
    permalink: p.permalink,
    image_urls: p.imageUrls ?? [],
    caption: p.caption ?? null,
    like_count: p.likeCount,
    posted_at: p.postedAt,
    scraped_at: '',
    account: p.account ? mapAccount(p.account) : ({} as InstagramAccount),
  };
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
  // NOTE: Kotlin BFF에 카테고리별 트렌드 카운트 엔드포인트가 없어 Supabase 유지.
  await requireAuth();
  const supabase = await createClient();

  let query = supabase.from('trend_articles').select('category');
  if (sinceIsoDate) query = query.gte('collected_at', sinceIsoDate);
  const { data, error } = await query;
  if (error) throw error;

  const counts: Record<TrendCategory, number> = {
    flower: 0,
    inspiration: 0,
    business: 0,
    industry: 0,
  };
  for (const row of data || []) {
    const c = row.category as TrendCategory;
    if (c in counts) counts[c]++;
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
  // NOTE: 계정 생성은 Kotlin /internal/** (서버↔서버 ingest) 에만 있어 웹에서 호출 불가 → Supabase service role 유지.
  await requireAuth();
  const parsed = instagramAccountCreateSchema.parse(input);
  // RLS에서 instagram_accounts 쓰기 차단 → service role 사용
  const supabase = createServiceClient();

  const profile_url = `https://www.instagram.com/${parsed.username}`;

  const { data, error } = await supabase
    .from('instagram_accounts')
    .insert({
      username: parsed.username,
      display_name: parsed.display_name ?? null,
      region: parsed.region,
      sort_order: parsed.sort_order ?? 0,
      active: parsed.active ?? true,
      notes: parsed.notes ?? null,
      profile_url,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(ErrorCode.DUPLICATE, '이미 등록된 계정입니다');
    }
    throw error;
  }

  revalidatePath('/insights/follows');
  return data as InstagramAccount;
}

export const createInstagramAccount = withErrorLogging(
  'createInstagramAccount',
  _createInstagramAccount,
);

async function _updateInstagramAccount(
  id: string,
  input: unknown,
): Promise<InstagramAccount> {
  // NOTE: 계정 수정은 Kotlin /internal/** 전용 → Supabase service role 유지.
  await requireAuth();
  const parsedId = uuidSchema.parse(id);
  const parsed = instagramAccountUpdateSchema.parse(input);
  // RLS에서 instagram_accounts 쓰기 차단 → service role 사용
  const supabase = createServiceClient();

  const updates: Record<string, unknown> = {};
  if (parsed.username !== undefined) {
    updates.username = parsed.username;
    updates.profile_url = `https://www.instagram.com/${parsed.username}`;
  }
  if (parsed.display_name !== undefined) updates.display_name = parsed.display_name;
  if (parsed.region !== undefined) updates.region = parsed.region;
  if (parsed.sort_order !== undefined) updates.sort_order = parsed.sort_order;
  if (parsed.active !== undefined) updates.active = parsed.active;
  if (parsed.notes !== undefined) updates.notes = parsed.notes;

  const { data, error } = await supabase
    .from('instagram_accounts')
    .update(updates)
    .eq('id', parsedId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new AppError(ErrorCode.NOT_FOUND, '계정을 찾을 수 없습니다');

  revalidatePath('/insights/follows');
  return data as InstagramAccount;
}

export const updateInstagramAccount = withErrorLogging(
  'updateInstagramAccount',
  _updateInstagramAccount,
);

async function _deleteInstagramAccount(id: string): Promise<void> {
  // NOTE: 계정 삭제는 Kotlin /internal/** 전용 → Supabase service role 유지.
  await requireAuth();
  const parsedId = uuidSchema.parse(id);
  // RLS에서 instagram_accounts 쓰기 차단 → service role 사용
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('instagram_accounts')
    .delete()
    .eq('id', parsedId);

  if (error) throw error;
  revalidatePath('/insights/follows');
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
  // NOTE: Kotlin BFF에 최신 수집 타임스탬프 엔드포인트가 없어 Supabase 유지.
  await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from('instagram_posts')
    .select('scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.scraped_at as string | null) ?? null;
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
