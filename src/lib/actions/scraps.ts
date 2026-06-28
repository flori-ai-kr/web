'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {scrapMemoSchema, scrapToggleSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';
import type {
    GrantScrap,
    InsightScrap,
    ScrapMap,
    ScrapTargetType,
    ScrapInfo,
} from '@/types/database';
import {
    type KotlinScrap,
    mapScrap,
} from '@/lib/api/insights-mappers';
import {type KotlinGrantProgram, mapGrantProgram} from '@/lib/api/mappers/grants';

// ─── Kotlin DTO 미러 (camelCase) ──────────────────────────
// 공통 DTO/매퍼(KotlinScrap/GrantProgram)는 mappers 에서 import.
// 아래는 scraps 전용 합성 DTO만 정의한다.

interface KotlinScrapInfo {
  id: string;
  memo: string | null;
}

interface KotlinGrantScrap {
  scrap: KotlinScrap;
  program: KotlinGrantProgram;
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

  revalidatePath('/admin/insights', 'layout');
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

  revalidatePath('/admin/insights', 'layout');
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

async function _getGrantScraps(limit = 100): Promise<GrantScrap[]> {
  await requireAuth();

  const params = new URLSearchParams();
  params.set('limit', String(limit));

  const data = await apiFetch<KotlinGrantScrap[]>(
    `/insights/scraps/grants?${params.toString()}`,
  );

  return (data ?? []).map((row) => ({
    scrap: mapScrap(row.scrap),
    program: mapGrantProgram(row.program),
  }));
}

export const getGrantScraps = withErrorLogging('getGrantScraps', _getGrantScraps);

async function _getScrapCounts(): Promise<{ grant: number }> {
  await requireAuth();

  const data = await apiFetch<{ grant: number }>('/insights/scraps/counts');
  return { grant: data.grant ?? 0 };
}

export const getScrapCounts = withErrorLogging('getScrapCounts', _getScrapCounts);
