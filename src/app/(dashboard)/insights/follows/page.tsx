import {getInstagramAccounts, getInstagramPosts,} from '@/lib/actions/insights';
import type {InstagramRegion} from '@/types/database';
import {FollowsClient} from './follows-client';

export default async function FollowsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; sort?: string; accountId?: string }>;
}) {
  const params = await searchParams;
  const region: InstagramRegion | undefined =
    params.region === 'domestic' || params.region === 'international' ? params.region : undefined;
  const sortBy: 'latest' | 'likes' = params.sort === 'likes' ? 'likes' : 'latest';

  const [accounts, posts] = await Promise.all([
    getInstagramAccounts({ activeOnly: false }),
    getInstagramPosts({
      region,
      accountId: params.accountId,
      limit: 120,
      sortBy,
      daysAgo: 14,
    }),
  ]);

  return (
    <FollowsClient
      initialAccounts={accounts}
      initialPosts={posts}
      initialRegion={region ?? null}
      initialSort={sortBy}
      initialAccountId={params.accountId ?? null}
    />
  );
}
