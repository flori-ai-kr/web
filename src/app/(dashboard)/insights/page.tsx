import {
    getInstagramPosts,
    getLatestInstagramTimestamp,
    getRecentTrendsByCategory,
    getTrendCountsByCategory,
} from '@/lib/actions/insights';
import {getPostScraps, getScrapCounts, getTrendScraps} from '@/lib/actions/scraps';
import {InsightsClient} from './insights-client';

function getIsoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function InsightsPage() {
  const sinceDate = getIsoDateDaysAgo(7);

  const [
    counts,
    trendsByCategory,
    recentPosts,
    latestScrapedAt,
    scrapCounts,
    trendScraps,
    postScraps,
  ] = await Promise.all([
    getTrendCountsByCategory(sinceDate),
    getRecentTrendsByCategory(3),
    getInstagramPosts({ limit: 8, daysAgo: 14 }),
    getLatestInstagramTimestamp(),
    getScrapCounts(),
    getTrendScraps(3),
    getPostScraps(4),
  ]);

  const highlights = (['flower', 'inspiration', 'business', 'industry'] as const)
    .flatMap((cat) => trendsByCategory[cat].slice(0, 1))
    .slice(0, 3);

  return (
    <InsightsClient
      counts={counts}
      highlights={highlights}
      recentPosts={recentPosts}
      latestScrapedAt={latestScrapedAt}
      scrapCounts={scrapCounts}
      scrappedTrends={trendScraps}
      scrappedPosts={postScraps}
    />
  );
}
