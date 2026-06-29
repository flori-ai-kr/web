import type { GuideArticleMeta } from './types';

// 정렬된 메타 목록에서 현재 slug의 이전/다음 글. 순수 함수 → nav.test.ts.
export function getAdjacent(
  metas: GuideArticleMeta[],
  slug: string,
): { prev: GuideArticleMeta | null; next: GuideArticleMeta | null } {
  const i = metas.findIndex((m) => m.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? metas[i - 1] : null,
    next: i < metas.length - 1 ? metas[i + 1] : null,
  };
}
