'use client';

import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Lock, MessageSquare, Pencil, Pin, Trash2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';
import type {CommunityComment, CommunityPost} from '@/types/database';
import {CommunityCategoryBadge} from '@/components/community/category-badge';
import {AdminBadge} from '@/components/community/admin-badge';
import dynamic from 'next/dynamic';
import {LikeButton} from '@/components/community/like-button';
import {CommentForm} from '@/components/community/comment-form';
import {CommentTree} from '@/components/community/comment-tree';
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
import {deleteCommunityPost} from '@/lib/actions/community';

// Tiptap 렌더러도 ProseMirror 의존 → 상세 진입 시점에 지연 로드.
const TiptapContent = dynamic(
  () => import('@/components/community/tiptap-content').then((m) => m.TiptapContent),
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

      {/* 비밀글 비권한자 */}
      {!post.can_view ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-xl border border-dashed border-border bg-card/50">
          <Lock className="w-8 h-8 text-muted-foreground mb-3" />
          <h2 className="font-medium text-foreground mb-1">비밀글입니다</h2>
          <p className="text-sm text-muted-foreground">작성자와 관리자만 볼 수 있어요.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="space-y-3 border-b border-border pb-5">
            <div className="flex items-center gap-2 flex-wrap">
              {post.is_pinned && <Pin className="h-4 w-4 text-brand" aria-label="고정글" />}
              <CommunityCategoryBadge category={post.category} />
              {post.is_secret && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> 비밀글
                </span>
              )}
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

          {/* Body */}
          <article>
            <TiptapContent content={post.content} />
            {post.image_urls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {post.image_urls.map((url) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image src={url} alt="첨부 이미지" fill className="object-cover" sizes="33vw" />
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <LikeButton postId={post.id} initialLiked={post.liked} initialCount={post.like_count} />
            {post.is_mine && (
              <div className="flex items-center gap-1.5">
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
              </div>
            )}
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
      )}

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>게시글을 삭제할까요?</DialogTitle>
            <DialogDescription>삭제한 게시글은 복구할 수 없어요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              취소
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeletePost}
              disabled={deleting}
            >
              {deleting ? '삭제 중…' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
