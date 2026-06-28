'use server';

import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';
import type {GrantCategory, GrantProgram} from '@/types/grants';
import {type KotlinGrantProgram, mapGrantProgram} from '@/lib/api/mappers/grants';

// ─── 지원사업 조회 ────────────────────────────────────────

async function _getGrants(options: {
  category?: GrantCategory;
  keyword?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<GrantProgram[]> {
  await requireAuth();

  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  if (options.keyword) params.set('keyword', options.keyword);
  params.set('limit', String(options.limit ?? 50));
  params.set('offset', String(options.offset ?? 0));

  const data = await apiFetch<KotlinGrantProgram[]>(
    `/insights/grants?${params.toString()}`,
  );
  return (data ?? []).map(mapGrantProgram);
}

export const getGrants = withErrorLogging('getGrants', _getGrants);

/**
 * 지원사업 탭 무한스크롤 추가 로드 + 디바운스 서버 검색(keyword).
 */
async function _loadMoreGrants(
  offset: number,
  options: { category?: GrantCategory; keyword?: string; limit?: number } = {},
): Promise<GrantProgram[]> {
  return _getGrants({ ...options, offset });
}

export const loadMoreGrants = withErrorLogging('loadMoreGrants', _loadMoreGrants);
