import {getTrendArticles} from '@/lib/actions/insights';
import type {TrendCategory} from '@/types/database';
import {TrendsClient} from './trends-client';

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; articleId?: string }>;
}) {
  const params = await searchParams;
  const validCategories: TrendCategory[] = ['flower', 'inspiration', 'business', 'industry'];
  const category = validCategories.find((c) => c === params.category);

  const articles = await getTrendArticles({ category, limit: 100 });

  return (
    <TrendsClient
      initialArticles={articles}
      initialCategory={category ?? null}
      initialArticleId={params.articleId ?? null}
    />
  );
}
