import {notFound, redirect} from 'next/navigation';
import {getCommunityPost} from '@/lib/actions/community';
import {ensureCommunityAccess} from '@/lib/actions/business-verification';
import {CommunityWriteClient} from '../../write/community-write-client';

export default async function CommunityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureCommunityAccess();

  const { id } = await params;
  const post = await getCommunityPost(id);
  if (!post) notFound();
  // 본인 글만 수정 가능
  if (!post.is_mine) redirect(`/admin/community/${id}`);

  return <CommunityWriteClient post={post} />;
}
