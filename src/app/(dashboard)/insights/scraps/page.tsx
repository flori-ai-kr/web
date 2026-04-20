import {getPostScraps, getTrendScraps} from '@/lib/actions/scraps';
import {ScrapsClient} from './scraps-client';

export default async function ScrapsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: 'trend' | 'post' = params.tab === 'post' ? 'post' : 'trend';

  const [trendScraps, postScraps] = await Promise.all([
    getTrendScraps(200),
    getPostScraps(200),
  ]);

  return (
    <ScrapsClient
      initialTrendScraps={trendScraps}
      initialPostScraps={postScraps}
      initialTab={tab}
    />
  );
}
