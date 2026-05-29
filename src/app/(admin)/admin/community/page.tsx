import {redirect} from 'next/navigation';
import {getCommunityPosts} from '@/lib/actions/community';
import {getMyBusinessVerification} from '@/lib/actions/business-verification';
import {COMMUNITY_CATEGORIES, type CommunityCategory} from '@/types/database';
import {CommunityClient} from './community-client';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const verification = await getMyBusinessVerification();
  if (verification.status !== 'APPROVED') redirect('/admin/community/verify');

  const params = await searchParams;
  const category = COMMUNITY_CATEGORIES.find((c) => c.value === params.category)?.value as
    | CommunityCategory
    | undefined;

  const posts = await getCommunityPosts({ category });

  return <CommunityClient initialPosts={posts} activeCategory={category ?? null} />;
}
