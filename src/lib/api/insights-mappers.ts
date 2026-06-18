// insights.ts ↔ scraps.ts 에 글자단위로 중복되던 Kotlin DTO 미러 + 매퍼를 단일 정의로 통합한다.
// (DTO 필드 변경 시 양쪽 동기화 누락으로 인한 드리프트 방지)
import type {
  InsightScrap,
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
