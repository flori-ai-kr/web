import {getTrendArticles} from '@/lib/actions/insights';
import {getScrapMap} from '@/lib/actions/scraps';
import type {TrendCategory} from '@/types/database';
import {TrendsClient} from './trends-client';

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; articleId?: string; scraped?: string }>;
}) {
  const params = await searchParams;
  const validCategories: TrendCategory[] = ['flower', 'inspiration', 'business', 'industry'];
  const category = validCategories.find((c) => c === params.category);
  const scrapedOnly = params.scraped === '1';

  const [articles, scrapMap] = await Promise.all([
    getTrendArticles({ limit: 200 }),
    getScrapMap('trend'),
  ]);

  return (
    <TrendsClient
      initialArticles={articles}
      initialCategory={category ?? null}
      initialArticleId={params.articleId ?? null}
      initialScrapMap={scrapMap}
      initialScrapedOnly={scrapedOnly}
    />
  );
}
