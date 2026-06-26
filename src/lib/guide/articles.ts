import type { GuideArticle, GuideArticleMeta, GuideSectionWithArticles } from './types';
import { GUIDE_SECTIONS } from './sections';
import { START_ARTICLES } from './content/start';
import { OPERATE_ARTICLES } from './content/operate';
import { GROW_ARTICLES } from './content/grow';
import { COMMUNITY_ARTICLES } from './content/community';
import { SETTINGS_ARTICLES } from './content/settings';

/** 모든 아티클(본문 포함). sectionId·order 기준 정렬. */
export const ALL_ARTICLES: GuideArticle[] = [
  ...START_ARTICLES,
  ...OPERATE_ARTICLES,
  ...GROW_ARTICLES,
  ...COMMUNITY_ARTICLES,
  ...SETTINGS_ARTICLES,
].sort((a, b) => {
  const sectionOrder = (id: string) => GUIDE_SECTIONS.find(s => s.id === id)?.order ?? 99;
  const so = sectionOrder(a.sectionId) - sectionOrder(b.sectionId);
  return so !== 0 ? so : a.order - b.order;
});

/** 모든 아티클 메타(본문 블록 제외). 네비·카드용. */
export const ALL_METAS: GuideArticleMeta[] = ALL_ARTICLES.map(
  ({ slug, sectionId, order, title, description, icon, tldr }) => ({
    slug,
    sectionId,
    order,
    title,
    description,
    icon,
    tldr,
  }),
);

export function getArticleBySlug(slug: string): GuideArticle | undefined {
  return ALL_ARTICLES.find(a => a.slug === slug);
}

export function getMetaBySlug(slug: string): GuideArticleMeta | undefined {
  return ALL_METAS.find(m => m.slug === slug);
}

export function getAllSlugs(): string[] {
  return ALL_ARTICLES.map(a => a.slug);
}

export function getAllMetas(): GuideArticleMeta[] {
  return ALL_METAS;
}

/** 섹션 목록 + 각 섹션에 속한 아티클 메타 배열. 가이드 인덱스·좌측 네비용. */
export function getSectionsWithArticles(): GuideSectionWithArticles[] {
  return GUIDE_SECTIONS.map(section => ({
    ...section,
    articles: ALL_METAS.filter(m => m.sectionId === section.id),
  }));
}
