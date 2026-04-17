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

// ─── 트렌드 조회 ──────────────────────────────────────────

async function _getTrendArticles(options: {
  category?: TrendCategory;
  limit?: number;
  offset?: number;
} = {}): Promise<TrendArticle[]> {
  await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from('trend_articles')
    .select('*')
    .order('collected_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (options.category) query = query.eq('category', options.category);
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TrendArticle[];
}

export const getTrendArticles = withErrorLogging('getTrendArticles', _getTrendArticles);

/**
 * 대시보드용: 카테고리별로 최신 N개씩 가져온다.
 */
async function _getRecentTrendsByCategory(
  limitPerCategory: number = 3,
): Promise<Record<TrendCategory, TrendArticle[]>> {
  await requireAuth();
  const supabase = await createClient();

  const categories: TrendCategory[] = ['flower', 'inspiration', 'business', 'industry'];

  const results = await Promise.all(
    categories.map((category) =>
      supabase
        .from('trend_articles')
        .select('*')
        .eq('category', category)
        .order('collected_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limitPerCategory),
    ),
  );

  const output: Record<TrendCategory, TrendArticle[]> = {
    flower: [],
    inspiration: [],
    business: [],
    industry: [],
  };

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]!;
    const { data, error } = results[i]!;
    if (error) throw error;
    output[category] = (data || []) as TrendArticle[];
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
  const supabase = await createClient();

  let query = supabase
    .from('instagram_accounts')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('username', { ascending: true });

  if (options.activeOnly) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InstagramAccount[];
}

export const getInstagramAccounts = withErrorLogging(
  'getInstagramAccounts',
  _getInstagramAccounts,
);

async function _createInstagramAccount(input: unknown): Promise<InstagramAccount> {
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
  const supabase = await createClient();

  const limit = options.limit ?? 50;
  const sortBy = options.sortBy ?? 'latest';
  // region 필터가 있으면 JS에서 걸러야 하므로 버퍼로 더 가져온다.
  const fetchLimit = options.region ? limit * 3 : limit;

  let query = supabase
    .from('instagram_posts')
    .select('*, account:instagram_accounts!inner(*)');

  if (options.accountId) query = query.eq('account_id', options.accountId);
  if (options.daysAgo) {
    const since = new Date(Date.now() - options.daysAgo * 24 * 60 * 60 * 1000);
    query = query.gte('posted_at', since.toISOString());
  }

  query =
    sortBy === 'likes'
      ? query.order('like_count', { ascending: false })
      : query.order('posted_at', { ascending: false });

  query = query.limit(fetchLimit);

  const { data, error } = await query;
  if (error) throw error;

  // region은 PostgREST embedded filter가 버전/스키마에 따라 동작이 달라질 수 있어
  // fetch 후 JS에서 안전하게 필터링.
  let posts = (data || []) as unknown as InstagramPostWithAccount[];
  if (options.region) {
    posts = posts.filter((p) => p.account?.region === options.region);
  }
  return posts.slice(0, limit);
}

export const getInstagramPosts = withErrorLogging('getInstagramPosts', _getInstagramPosts);

async function _getLatestInstagramTimestamp(): Promise<string | null> {
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
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      user_id: user.id,
      bottom_nav_items: [...DEFAULT_BOTTOM_NAV_ITEMS],
      updated_at: new Date().toISOString(),
    };
  }

  const items = (data.bottom_nav_items as NavItemKey[]) || [...DEFAULT_BOTTOM_NAV_ITEMS];
  return {
    user_id: data.user_id as string,
    bottom_nav_items: items,
    updated_at: data.updated_at as string,
  };
}

export const getUserPreferences = withErrorLogging('getUserPreferences', _getUserPreferences);

async function _updateBottomNavItems(items: unknown): Promise<UserPreferences> {
  const user = await requireAuth();
  const parsed = bottomNavItemsSchema.parse(items);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        bottom_nav_items: parsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/', 'layout');
  return {
    user_id: data.user_id as string,
    bottom_nav_items: (data.bottom_nav_items as NavItemKey[]) ?? parsed,
    updated_at: data.updated_at as string,
  };
}

export const updateBottomNavItems = withErrorLogging(
  'updateBottomNavItems',
  _updateBottomNavItems,
);
