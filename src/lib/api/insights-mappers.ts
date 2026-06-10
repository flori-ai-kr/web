// insights.ts ↔ scraps.ts 에 글자단위로 중복되던 Kotlin DTO 미러 + 매퍼를 단일 정의로 통합한다.
// (DTO 필드 변경 시 양쪽 동기화 누락으로 인한 드리프트 방지)
import type {
  InsightScrap,
  InstagramAccount,
  InstagramPostWithAccount,
  InstagramRegion,
  ScrapTargetType,
  TrendArticle,
  TrendCategory,
} from '@/types/database';

export interface KotlinScrap {
  id: string;
  targetType: ScrapTargetType;
  targetId: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KotlinTrendArticle {
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

export interface KotlinInstagramAccount {
  id: string;
  username: string;
  displayName: string | null;
  profileUrl: string;
  region: InstagramRegion;
  sortOrder: number;
  active: boolean;
  memo: string | null;
}

export interface KotlinInstagramPost {
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

export function mapScrap(s: KotlinScrap): InsightScrap {
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

export function mapTrendArticle(a: KotlinTrendArticle): TrendArticle {
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

export function mapAccount(a: KotlinInstagramAccount): InstagramAccount {
  return {
    id: a.id,
    username: a.username,
    display_name: a.displayName ?? null,
    profile_url: a.profileUrl,
    region: a.region,
    sort_order: a.sortOrder,
    active: a.active,
    memo: a.memo ?? null,
    created_at: '',
    updated_at: '',
  };
}

export function mapPost(p: KotlinInstagramPost): InstagramPostWithAccount {
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
    account: p.account ? mapAccount(p.account) : ({} as InstagramAccount),
  };
}
