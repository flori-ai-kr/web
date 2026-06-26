'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft, MessageSquare, Pencil, Pin, Trash2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';
import type {CommunityComment, CommunityPost} from '@/types/database';
import {CommunityCategoryBadge} from '@/components/community/category-badge';
import {AdminBadge} from '@/app/(admin)/admin/community/components/admin-badge';
import dynamic from 'next/dynamic';
import {LikeButton} from '@/app/(admin)/admin/community/components/like-button';
import {CommentForm} from '@/app/(admin)/admin/community/components/comment-form';
import {CommentTree} from '@/app/(admin)/admin/community/components/comment-tree';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {toast} from 'sonner';
import {deleteCommunityPost, setCommunityPostPinned} from '@/lib/actions/community';

// Tiptap 렌더러도 ProseMirror 의존 → 상세 진입 시점에 지연 로드.
const TiptapContent = dynamic(
  () => import('@/app/(admin)/admin/community/components/tiptap-content').then((m) => m.TiptapContent),
  {
    ssr: false,
    loading: () => <div className="min-h-[120px] rounded-md bg-muted/30 animate-pulse" />,
  },
);

interface DetailProps {
  post: CommunityPost;
  initialComments: CommunityComment[];
}

export function CommunityDetailClient({ post, initialComments }: DetailProps) {
  const router = useRouter();
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPinned, setIsPinned] = useState(post.is_pinned);
  const [pinning, setPinning] = useState(false);

  const handleTogglePin = async () => {
    const next = !isPinned;
    setPinning(true);
    try {
      await setCommunityPostPinned(post.id, next);
      setIsPinned(next);
      toast.success(next ? '게시글을 고정했어요' : '고정을 해제했어요');
    } catch {
      toast.error('고정 상태를 변경하지 못했어요');
    } finally {
      setPinning(false);
    }
  };

  const addComment = (c: CommunityComment) => setComments((prev) => [...prev, c]);
  const markDeleted = (id: string) =>
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_deleted: true, content: '' } : c)),
    );

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await deleteCommunityPost(post.id);
      toast.success('게시글을 삭제했어요');
      router.push('/admin/community');
      router.refresh();
    } catch {
      toast.error('삭제에 실패했어요');
      setDeleting(false);
    }
  };

  const activeCount = comments.filter((c) => !c.is_deleted).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-1 sm:py-2 space-y-6">
      <Link
        href="/admin/community"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> 목록
      </Link>

      <>
          {/* Header */}
          <header className="space-y-3 border-b border-border pb-5">
            <div className="flex items-center gap-2 flex-wrap">
              {isPinned && <Pin className="h-4 w-4 text-brand" aria-label="고정글" />}
              <CommunityCategoryBadge category={post.category} />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{post.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{post.author_nickname}</span>
              {post.author_is_admin && <AdminBadge />}
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
              </span>
            </div>
          </header>

          {/* Body — 이미지는 TiptapContent 본문에 인라인으로 렌더된다.
              image_urls(본문 이미지에서 추출)는 목록 카드 썸네일 전용이며,
              상세에서 별도 그리드로 다시 그리면 인라인 이미지와 중복돼 페이지가
              과도하게 길어지므로(푸터 아래 빈 스크롤) 렌더하지 않는다. */}
          <article>
            <TiptapContent content={post.content} />
          </article>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <LikeButton postId={post.id} initialLiked={post.liked} initialCount={post.like_count} />
            <div className="flex items-center gap-1.5">
              {post.viewer_is_admin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePin}
                  disabled={pinning}
                  className={isPinned ? 'text-brand' : undefined}
                  aria-pressed={isPinned}
                >
                  <Pin className="w-3.5 h-3.5" /> {isPinned ? '고정 해제' : '고정'}
                </Button>
              )}
            {post.is_mine && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/community/${post.id}/edit`}>
                    <Pencil className="w-3.5 h-3.5" /> 수정
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </Button>
              </>
            )}
            </div>
          </div>

          {/* Comments */}
          <section className="space-y-4 pt-2" aria-label="댓글">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MessageSquare className="w-4 h-4" /> 댓글 {activeCount}
            </h2>
            <CommentForm postId={post.id} onAdded={addComment} />
            <CommentTree
              postId={post.id}
              comments={comments}
              onAdded={addComment}
              onDeleted={markDeleted}
            />
          </section>
        </>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>게시글을 삭제할까요?</DialogTitle>
            <DialogDescription>삭제한 게시글은 복구할 수 없어요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={deleting}>
              {deleting ? '삭제 중…' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
