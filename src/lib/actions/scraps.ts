'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {scrapMemoSchema, scrapToggleSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';
import type {
    InsightScrap,
    InstagramAccount,
    InstagramPostWithAccount,
    PostScrap,
    ScrapMap,
    ScrapTargetType,
    TrendArticle,
    TrendCategory,
    InstagramRegion,
    ScrapInfo,
    TrendScrap,
} from '@/types/database';

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 서버 계약과 1:1. 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰 미사용).

interface KotlinScrap {
  id: string;
  targetType: ScrapTargetType;
  targetId: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

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

function mapScrap(s: KotlinScrap): InsightScrap {
  return {
    id: s.id,
    user_id: '',
    target_type: s.targetType,
    target_id: s.targetId,
    memo: s.memo ?? null,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
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
    account: p.account
      ? mapAccount(p.account)
      : ({} as InstagramAccount),
  };
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
