'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {scrapMemoSchema, scrapToggleSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';
import type {
    InsightScrap,
    PostScrap,
    ScrapMap,
    ScrapTargetType,
    ScrapInfo,
    TrendScrap,
} from '@/types/database';
import {
    type KotlinScrap,
    type KotlinTrendArticle,
    type KotlinInstagramPost,
    mapScrap,
    mapTrendArticle,
    mapPost,
} from '@/lib/api/insights-mappers';

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 공통 DTO/매퍼(KotlinScrap/TrendArticle/Account/Post)는 lib/api/insights-mappers.ts 에서 import.
// 아래는 scraps 전용 합성 DTO만 정의한다.

interface KotlinScrapInfo {
  id: string;
  memo: string | null;
}

interface KotlinTrendScrap {
  scrap: KotlinScrap;
  article: KotlinTrendArticle;
}

interface KotlinPostScrap {
  scrap: KotlinScrap;
  post: KotlinInstagramPost;
}

async function _toggleScrap(input: unknown): Promise<{ scraped: boolean }> {
  await requireAuth();
  const parsed = scrapToggleSchema.parse(input);

  const res = await apiFetch<{ scraped: boolean }>('/insights/scraps/toggle', {
    method: 'POST',
    body: JSON.stringify({
      targetType: parsed.target_type,
      targetId: parsed.target_id,
    }),
  });

  revalidatePath('/insights', 'layout');
  return { scraped: res.scraped };
}

export const toggleScrap = withErrorLogging('toggleScrap', _toggleScrap);

async function _updateScrapMemo(input: unknown): Promise<InsightScrap> {
  await requireAuth();
  const parsed = scrapMemoSchema.parse(input);

  const memoValue = parsed.memo && parsed.memo.trim() !== '' ? parsed.memo : null;

  const data = await apiFetch<KotlinScrap>('/insights/scraps/memo', {
    method: 'PUT',
    body: JSON.stringify({
      targetType: parsed.target_type,
      targetId: parsed.target_id,
      memo: memoValue,
    }),
  });

  revalidatePath('/insights', 'layout');
  return mapScrap(data);
}

export const updateScrapMemo = withErrorLogging('updateScrapMemo', _updateScrapMemo);

async function _getScrapMap(targetType: ScrapTargetType): Promise<ScrapMap> {
  await requireAuth();

  const params = new URLSearchParams();
  params.set('targetType', targetType);

  const data = await apiFetch<Record<string, KotlinScrapInfo>>(
    `/insights/scraps/map?${params.toString()}`,
  );

  const map: ScrapMap = {};
  for (const [targetId, info] of Object.entries(data ?? {})) {
    map[targetId] = { id: info.id, memo: info.memo ?? null } satisfies ScrapInfo;
  }
  return map;
}

export const getScrapMap = withErrorLogging('getScrapMap', _getScrapMap);

async function _getTrendScraps(limit = 100): Promise<TrendScrap[]> {
  await requireAuth();

  const params = new URLSearchParams();
  params.set('limit', String(limit));

  const data = await apiFetch<KotlinTrendScrap[]>(
    `/insights/scraps/trends?${params.toString()}`,
  );

  return (data ?? []).map((row) => ({
    scrap: mapScrap(row.scrap),
    article: mapTrendArticle(row.article),
  }));
}

export const getTrendScraps = withErrorLogging('getTrendScraps', _getTrendScraps);

async function _getPostScraps(limit = 100): Promise<PostScrap[]> {
  await requireAuth();

  const params = new URLSearchParams();
  params.set('limit', String(limit));

  const data = await apiFetch<KotlinPostScrap[]>(
    `/insights/scraps/posts?${params.toString()}`,
  );

  return (data ?? []).map((row) => ({
    scrap: mapScrap(row.scrap),
    post: mapPost(row.post),
  }));
}

export const getPostScraps = withErrorLogging('getPostScraps', _getPostScraps);

async function _getScrapCounts(): Promise<{ trend: number; post: number }> {
  await requireAuth();

  const data = await apiFetch<{ trend: number; post: number }>('/insights/scraps/counts');
  return { trend: data.trend ?? 0, post: data.post ?? 0 };
}

export const getScrapCounts = withErrorLogging('getScrapCounts', _getScrapCounts);
