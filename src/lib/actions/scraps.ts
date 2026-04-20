'use server';

import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {scrapMemoSchema, scrapToggleSchema} from '@/lib/validations';
import type {
    InsightScrap,
    InstagramPostWithAccount,
    PostScrap,
    ScrapMap,
    ScrapTargetType,
    TrendArticle,
    TrendScrap,
} from '@/types/database';

async function _toggleScrap(input: unknown): Promise<{ scraped: boolean }> {
  const user = await requireAuth();
  const parsed = scrapToggleSchema.parse(input);
  const supabase = await createClient();

  const { data: existing, error: selectError } = await supabase
    .from('insight_scraps')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', parsed.target_type)
    .eq('target_id', parsed.target_id)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from('insight_scraps')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    revalidatePath('/insights', 'layout');
    return { scraped: false };
  }

  // target_id가 실제로 존재하는지 검증 (orphan scrap 방지)
  const sourceTable = parsed.target_type === 'trend' ? 'trend_articles' : 'instagram_posts';
  const { data: target, error: targetError } = await supabase
    .from(sourceTable)
    .select('id')
    .eq('id', parsed.target_id)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) {
    throw new AppError(
      ErrorCode.NOT_FOUND,
      parsed.target_type === 'trend' ? '존재하지 않는 트렌드입니다' : '존재하지 않는 포스트입니다',
    );
  }

  const { error } = await supabase.from('insight_scraps').insert({
    user_id: user.id,
    target_type: parsed.target_type,
    target_id: parsed.target_id,
    memo: null,
  });
  if (error) {
    // 동시 토글 시 race condition — 이미 존재하면 스크랩 성공으로 간주
    if (error.code === '23505') {
      revalidatePath('/insights', 'layout');
      return { scraped: true };
    }
    throw error;
  }
  revalidatePath('/insights', 'layout');
  return { scraped: true };
}

export const toggleScrap = withErrorLogging('toggleScrap', _toggleScrap);

async function _updateScrapMemo(input: unknown): Promise<InsightScrap> {
  const user = await requireAuth();
  const parsed = scrapMemoSchema.parse(input);
  const supabase = await createClient();

  // 스크랩 레코드가 없으면 메모 저장 거부 (직접 RPC 호출로 유령 레코드 생성 방지)
  const { data: existing, error: checkError } = await supabase
    .from('insight_scraps')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', parsed.target_type)
    .eq('target_id', parsed.target_id)
    .maybeSingle();
  if (checkError) throw checkError;
  if (!existing) {
    throw new AppError(ErrorCode.NOT_FOUND, '먼저 스크랩한 후 메모를 저장할 수 있어요');
  }

  const memoValue = parsed.memo && parsed.memo.trim() !== '' ? parsed.memo : null;

  const { data, error } = await supabase
    .from('insight_scraps')
    .update({ memo: memoValue })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/insights', 'layout');
  return data as InsightScrap;
}

export const updateScrapMemo = withErrorLogging('updateScrapMemo', _updateScrapMemo);

async function _getScrapMap(targetType: ScrapTargetType): Promise<ScrapMap> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('insight_scraps')
    .select('id, target_id, memo')
    .eq('user_id', user.id)
    .eq('target_type', targetType);
  if (error) throw error;

  const map: ScrapMap = {};
  for (const row of data ?? []) {
    map[row.target_id as string] = {
      id: row.id as string,
      memo: (row.memo as string | null) ?? null,
    };
  }
  return map;
}

export const getScrapMap = withErrorLogging('getScrapMap', _getScrapMap);

async function _getTrendScraps(limit = 100): Promise<TrendScrap[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  // insight_scraps.target_id는 polymorphic이라 FK가 없음 → 2단계 조회
  const { data: scraps, error: scrapsError } = await supabase
    .from('insight_scraps')
    .select('*')
    .eq('user_id', user.id)
    .eq('target_type', 'trend')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (scrapsError) throw scrapsError;
  if (!scraps || scraps.length === 0) return [];

  const ids = scraps.map((s) => s.target_id as string);
  const { data: articles, error: articlesError } = await supabase
    .from('trend_articles')
    .select('*')
    .in('id', ids);
  if (articlesError) throw articlesError;

  const articleMap = new Map<string, TrendArticle>();
  for (const a of articles ?? []) articleMap.set(a.id as string, a as TrendArticle);

  const result: TrendScrap[] = [];
  for (const scrap of scraps) {
    const article = articleMap.get(scrap.target_id as string);
    if (article) result.push({ scrap: scrap as InsightScrap, article });
  }
  return result;
}

export const getTrendScraps = withErrorLogging('getTrendScraps', _getTrendScraps);

async function _getPostScraps(limit = 100): Promise<PostScrap[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: scraps, error: scrapsError } = await supabase
    .from('insight_scraps')
    .select('*')
    .eq('user_id', user.id)
    .eq('target_type', 'post')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (scrapsError) throw scrapsError;
  if (!scraps || scraps.length === 0) return [];

  const ids = scraps.map((s) => s.target_id as string);
  const { data: posts, error: postsError } = await supabase
    .from('instagram_posts')
    .select('*, account:instagram_accounts!inner(*)')
    .in('id', ids);
  if (postsError) throw postsError;

  const postMap = new Map<string, InstagramPostWithAccount>();
  for (const p of (posts ?? []) as unknown as InstagramPostWithAccount[]) {
    postMap.set(p.id, p);
  }

  const result: PostScrap[] = [];
  for (const scrap of scraps) {
    const post = postMap.get(scrap.target_id as string);
    if (post) result.push({ scrap: scrap as InsightScrap, post });
  }
  return result;
}

export const getPostScraps = withErrorLogging('getPostScraps', _getPostScraps);

async function _getScrapCounts(): Promise<{ trend: number; post: number }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const [trendRes, postRes] = await Promise.all([
    supabase
      .from('insight_scraps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('target_type', 'trend'),
    supabase
      .from('insight_scraps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('target_type', 'post'),
  ]);
  if (trendRes.error) throw trendRes.error;
  if (postRes.error) throw postRes.error;
  return { trend: trendRes.count ?? 0, post: postRes.count ?? 0 };
}

export const getScrapCounts = withErrorLogging('getScrapCounts', _getScrapCounts);
