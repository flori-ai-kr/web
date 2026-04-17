'use client';

import Link from 'next/link';
import Image from 'next/image';
import {ArrowRight, Clock, Heart, Sparkles} from 'lucide-react';
import {
    type InstagramPostWithAccount,
    TREND_CATEGORIES,
    type TrendArticle,
    type TrendCategory,
} from '@/types/database';
import {CategoryBadge} from '@/components/insights/category-badge';
import {formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';

interface InsightsClientProps {
  counts: Record<TrendCategory, number>;
  highlights: TrendArticle[];
  recentPosts: InstagramPostWithAccount[];
  latestScrapedAt: string | null;
}

export function InsightsClient({
  counts,
  highlights,
  recentPosts,
  latestScrapedAt,
}: InsightsClientProps) {
  const updateLabel = latestScrapedAt
    ? `최근 업데이트 · ${formatDistanceToNow(new Date(latestScrapedAt), { addSuffix: true, locale: ko })}`
    : '수집 대기 중';

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-brand mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-wider">INSIGHTS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">이번 주 인사이트</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {updateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>주 2회 자동 수집 · 월·금 08:00</span>
        </div>
      </header>

      {/* Category stats */}
      <section aria-label="카테고리별 신규 건수">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TREND_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/insights/trends?category=${cat.value}`}
              className="group rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:border-brand/50"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden
                />
                <span className="text-xs font-medium text-muted-foreground">{cat.label}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {counts[cat.value]}
              </div>
              <div className="text-xs text-muted-foreground mt-1">최근 7일 신규</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trend highlights */}
      <section aria-label="트렌드 하이라이트">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">트렌드 하이라이트</h2>
          <Link
            href="/insights/trends"
            className="text-sm text-brand hover:underline flex items-center gap-1"
          >
            전체 보기
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {highlights.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-muted-foreground" />}
            title="아직 수집된 트렌드가 없어요"
            description={`다음 수집 시각에 자동으로 도착합니다. 총 ${totalCount}건`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlights.map((article) => (
              <TrendHighlightCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>

      {/* Follow feed */}
      <section aria-label="팔로우 최근 피드">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">팔로우 피드</h2>
            <p className="text-xs text-muted-foreground mt-0.5">최근 2주 신규 포스트</p>
          </div>
          <Link
            href="/insights/follows"
            className="text-sm text-brand hover:underline flex items-center gap-1"
          >
            전체 보기
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-6 h-6 text-muted-foreground" />}
            title="아직 수집된 포스트가 없어요"
            description="팔로우 페이지에서 계정을 관리하고 다음 수집을 기다려보세요"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recentPosts.map((post) => (
              <FollowPreviewCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TrendHighlightCard({ article }: { article: TrendArticle }) {
  return (
    <Link
      href={`/insights/trends?articleId=${article.id}`}
      className="group block rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={article.category} />
          {article.source_name && (
            <span className="text-xs text-muted-foreground">{article.source_name}</span>
          )}
        </div>
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-brand transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
      </div>
    </Link>
  );
}

function FollowPreviewCard({ post }: { post: InstagramPostWithAccount }) {
  const coverUrl = post.image_urls[0] ?? '';
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="relative group aspect-square rounded-lg overflow-hidden bg-muted block"
      aria-label={`@${post.account.username} Instagram 포스트 열기`}
    >
      {coverUrl && (
        <Image
          src={coverUrl}
          alt={post.caption?.slice(0, 60) || `@${post.account.username} 포스트`}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5">
        <div className="text-white text-xs font-medium truncate">@{post.account.username}</div>
        {post.like_count > 0 && (
          <div className="text-white/70 text-[11px]">♥ {post.like_count.toLocaleString()}</div>
        )}
      </div>
    </a>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border bg-card/50">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
