'use client';

import {useMemo, useState} from 'react';
import {CornerDownRight, Lock, Trash2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {cn} from '@/lib/utils';
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
import type {CommunityComment} from '@/types/database';
import {AdminBadge} from '@/app/(admin)/admin/community/components/admin-badge';
import {CommentForm} from './comment-form';
import {deleteComment} from '@/lib/actions/community';

// 최대 5뎁스(루트 depth 0 ~ 4). depth < MAX_REPLY_DEPTH 일 때만 답글 허용.
// 서버(CommunityService.MAX_COMMENT_DEPTH=5)와 동기화할 것.
const MAX_REPLY_DEPTH = 4;
// 들여쓰기는 모바일 오버플로 방지를 위해 이 깊이까지만 누적한다.
const MAX_INDENT_DEPTH = 3;

interface CommentTreeProps {
  postId: string;
  comments: CommunityComment[];
  onAdded: (comment: CommunityComment) => void;
  onDeleted: (id: string) => void;
}

export function CommentTree({ postId, comments, onAdded, onDeleted }: CommentTreeProps) {
  const { roots, childrenOf } = useMemo(() => {
    const childrenOf = new Map<string, CommunityComment[]>();
    const roots: CommunityComment[] = [];
    for (const c of comments) {
      if (c.parent_id) {
        const arr = childrenOf.get(c.parent_id) ?? [];
        arr.push(c);
        childrenOf.set(c.parent_id, arr);
      } else {
        roots.push(c);
      }
    }
    return { roots, childrenOf };
  }, [comments]);

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        첫 댓글을 남겨보세요.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {roots.map((c) => (
        <CommentNode
          key={c.id}
          postId={postId}
          comment={c}
          childrenOf={childrenOf}
          depth={0}
          onAdded={onAdded}
          onDeleted={onDeleted}
        />
      ))}
    </ul>
  );
}

function CommentNode({
  postId,
  comment,
  childrenOf,
  depth,
  onAdded,
  onDeleted,
}: {
  postId: string;
  comment: CommunityComment;
  childrenOf: Map<string, CommunityComment[]>;
  depth: number;
  onAdded: (comment: CommunityComment) => void;
  onDeleted: (id: string) => void;
}) {
  const replies = childrenOf.get(comment.id) ?? [];
  const [replying, setReplying] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const masked = comment.is_secret && !comment.can_view;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDeleted(comment.id);
    } catch {
      toast.error('댓글 삭제에 실패했어요');
      setDeleting(false);
    }
  };

  return (
    <li className={cn(depth > 0 && depth <= MAX_INDENT_DEPTH && 'ml-3 sm:ml-6')}>
      <div className="rounded-lg border border-border bg-card p-3">
        {comment.is_deleted ? (
          <p className="text-sm text-muted-foreground italic">삭제된 댓글입니다</p>
        ) : masked ? (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> 비밀 댓글입니다
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span className="font-medium text-foreground">{comment.author_nickname}</span>
              {comment.author_is_admin && <AdminBadge />}
              {comment.is_secret && <Lock className="h-3 w-3 text-muted-foreground" aria-label="비밀" />}
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {depth < MAX_REPLY_DEPTH && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setReplying((v) => !v)}
                >
                  <CornerDownRight className="h-3.5 w-3.5" /> 답글
                </Button>
              )}
              {comment.is_mine && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> 삭제
                </Button>
              )}
            </div>

            {/* 삭제 확인 — 즉시삭제/confirm() 금지 컨벤션(게시글 삭제와 동일 Dialog 패턴) */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>댓글을 삭제할까요?</DialogTitle>
                  <DialogDescription>삭제한 댓글은 복구할 수 없어요.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                    취소
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? '삭제 중…' : '삭제'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {replying && (
        <div className="mt-2 ml-3 sm:ml-6">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            forceSecret={comment.is_secret}
            autoFocus
            onAdded={(c) => {
              onAdded(c);
              setReplying(false);
            }}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {replies.length > 0 && (
        <ul className="mt-2 space-y-2">
          {replies.map((r) => (
            <CommentNode
              key={r.id}
              postId={postId}
              comment={r}
              childrenOf={childrenOf}
              depth={depth + 1}
              onAdded={onAdded}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
