import {
    getInstagramPosts,
    getLatestInstagramTimestamp,
    getRecentTrendsByCategory,
    getTrendCountsByCategory,
} from '@/lib/actions/insights';
import {InsightsClient} from './insights-client';

function getIsoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function InsightsPage() {
  // 최근 7일 기준 카운트 & 콘텐츠
  const sinceDate = getIsoDateDaysAgo(7);

  const [counts, trendsByCategory, recentPosts, latestScrapedAt] = await Promise.all([
    getTrendCountsByCategory(sinceDate),
    getRecentTrendsByCategory(3),
    getInstagramPosts({ limit: 8, daysAgo: 14 }),
    getLatestInstagramTimestamp(),
  ]);

  // 하이라이트는 카테고리별로 가장 최근 1개씩 합쳐서 상위 3개
  const highlights = (['flower', 'inspiration', 'business', 'industry'] as const)
    .flatMap((cat) => trendsByCategory[cat].slice(0, 1))
    .slice(0, 3);

  return (
    <InsightsClient
      counts={counts}
      highlights={highlights}
      recentPosts={recentPosts}
      latestScrapedAt={latestScrapedAt}
    />
  );
}
