import {notFound, redirect} from 'next/navigation';
import {getComments, getCommunityPost} from '@/lib/actions/community';
import {getMyBusinessVerification} from '@/lib/actions/business-verification';
import {CommunityDetailClient} from './community-detail-client';

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const verification = await getMyBusinessVerification();
  if (verification.status !== 'APPROVED') redirect('/admin/community/verify');

  const { id } = await params;
  const post = await getCommunityPost(id);
  if (!post) notFound();

  const comments = post.can_view ? await getComments(id) : [];

  return <CommunityDetailClient post={post} initialComments={comments} />;
}
