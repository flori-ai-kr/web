export type TrendCategory = 'flower' | 'inspiration' | 'business' | 'industry';
export type InstagramRegion = 'domestic' | 'international';

export interface TrendArticle {
  id: string;
  category: TrendCategory;
  title: string;
  summary: string;
  key_points: string[];
  source_url: string;
  source_name: string | null;
  published_at: string | null;
  collected_at: string;
  created_at: string;
}

export interface InstagramAccount {
  id: string;
  username: string;
  display_name: string | null;
  profile_url: string;
  region: InstagramRegion;
  sort_order: number;
  active: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramPost {
  id: string;
  account_id: string;
  shortcode: string;
  permalink: string;
  image_urls: string[];
  caption: string | null;
  like_count: number;
  posted_at: string;
  scraped_at: string;
}

export interface InstagramPostWithAccount extends InstagramPost {
  account: InstagramAccount;
}

export const TREND_CATEGORIES = [
  { value: 'flower', label: '꽃 트렌드', color: '#f43f5e' },
  { value: 'inspiration', label: '영감', color: '#a855f7' },
  { value: 'business', label: '사업 트렌드', color: '#3b82f6' },
  { value: 'industry', label: '업계 뉴스', color: '#f59e0b' },
] as const;

export const TREND_CATEGORY_LABELS: Record<TrendCategory, string> = {
  flower: '꽃 트렌드',
  inspiration: '영감',
  business: '사업 트렌드',
  industry: '업계 뉴스',
};

export const INSTAGRAM_REGION_LABELS: Record<InstagramRegion, string> = {
  domestic: '국내',
  international: '해외',
};

// ─── 스크랩/메모 ──────────────────────────────────────────
export type ScrapTargetType = 'trend' | 'post';

export interface InsightScrap {
  id: string;
  user_id: string;
  target_type: ScrapTargetType;
  target_id: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrendScrap {
  scrap: InsightScrap;
  article: TrendArticle;
}

export interface PostScrap {
  scrap: InsightScrap;
  post: InstagramPostWithAccount;
}

export interface ScrapInfo {
  id: string;
  memo: string | null;
}

export type ScrapMap = Record<string, ScrapInfo>;
