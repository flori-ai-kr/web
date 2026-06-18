export type TrendCategory = 'flower' | 'inspiration' | 'business' | 'industry';

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

export const TREND_CATEGORIES = [
  { value: 'flower', label: '꽃 트렌드', color: '#f43f5e' },
  { value: 'inspiration', label: '시즌·영감', color: '#a855f7' },
  { value: 'business', label: '사업 트렌드', color: '#3b82f6' },
  { value: 'industry', label: '업계 뉴스', color: '#f59e0b' },
] as const;

export const TREND_CATEGORY_LABELS: Record<TrendCategory, string> = {
  flower: '꽃 트렌드',
  inspiration: '시즌·영감',
  business: '사업 트렌드',
  industry: '업계 뉴스',
};

// ─── 스크랩/메모 ──────────────────────────────────────────
// 팔로우(인스타) 제거로 target_type 은 trend/grant 만 남는다.
export type ScrapTargetType = 'trend' | 'grant';

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

export interface ScrapInfo {
  id: string;
  memo: string | null;
}

export type ScrapMap = Record<string, ScrapInfo>;
