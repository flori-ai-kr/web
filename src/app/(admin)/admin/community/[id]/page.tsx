import {notFound} from 'next/navigation';
import {getComments, getCommunityPost} from '@/lib/actions/community';
import {ensureCommunityAccess} from '@/lib/actions/business-verification';
import {CommunityDetailClient} from './community-detail-client';

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureCommunityAccess();

  const { id } = await params;
  const post = await getCommunityPost(id);
  if (!post) notFound();

  const comments = post.can_view ? await getComments(id) : [];

  return <CommunityDetailClient post={post} initialComments={comments} />;
}
