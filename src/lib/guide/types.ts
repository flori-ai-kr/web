// 가이드 콘텐츠 도메인 타입. 본문은 MDX 대신 타입드 블록 배열로 모델링한다
// (렌더 결과는 동일, TOC 자동 추출·타입세이프·무의존성). 설계: docs/plans/26-06-26-guide-redesign.md

export interface GuideFaqItem {
  q: string;
  a: string;
}

/** 본문을 구성하는 블록. paragraph/steps/bullets/callout/faq 텍스트는 인라인 **굵게**·[링크](href) 지원. */
export type GuideBlock =
  | { type: 'heading'; text: string } // h2 → 우측 TOC 자동 등록
  | { type: 'paragraph'; text: string }
  | { type: 'steps'; items: string[] } // 번호 단계
  | { type: 'bullets'; items: string[] } // 점 목록
  | { type: 'shot'; src: string; alt: string; caption?: string; kind?: 'image' | 'gif' }
  | { type: 'callout'; variant: 'tip' | 'warn' | 'note'; title?: string; text: string }
  | { type: 'faq'; items: GuideFaqItem[] };

export interface GuideArticle {
  /** URL slug. /admin/guide/<slug> */
  slug: string;
  sectionId: string;
  /** 섹션 내 정렬 순서 */
  order: number;
  title: string;
  /** 제목 아래 한 줄 설명 */
  description: string;
  /** lucide 아이콘 키 (icon-map 참조) */
  icon: string;
  /** "한눈에 보기" 3줄 요약 */
  tldr?: string[];
  blocks: GuideBlock[];
}

/** 네비/카드용 경량 메타(본문 blocks 제외). */
export type GuideArticleMeta = Pick<
  GuideArticle,
  'slug' | 'sectionId' | 'order' | 'title' | 'description' | 'icon' | 'tldr'
>;

export interface GuideSectionMeta {
  id: string;
  title: string;
  order: number;
}

export interface GuideSectionWithArticles extends GuideSectionMeta {
  articles: GuideArticleMeta[];
}

export interface GuideTocItem {
  id: string;
  text: string;
}
