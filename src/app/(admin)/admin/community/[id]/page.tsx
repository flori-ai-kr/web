import {notFound} from 'next/navigation';
import {getComments, getCommunityPost} from '@/lib/actions/community';
import {ensureCommunityAccess} from '@/lib/actions/business-verification';
import {safe} from '@/lib/server-safe';
import {CommunityDetailClient} from './community-detail-client';

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureCommunityAccess();

  const { id } = await params;
  // 글·댓글은 독립적이라 병렬 조회(순차 워터폴 제거). 댓글 실패는 빈 배열로 흡수해
  // 글의 notFound/에러 의미를 보존한다(글이 없으면 notFound, 글 조회 자체 에러는 전파).
  const [post, comments] = await Promise.all([
    getCommunityPost(id),
    safe(() => getComments(id), []),
  ]);
  if (!post) notFound();

  return <CommunityDetailClient post={post} initialComments={comments} />;
}
