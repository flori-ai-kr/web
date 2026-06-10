'use client';

import {useState} from 'react';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Lock} from 'lucide-react';
import {toast} from 'sonner';
import {createComment} from '@/lib/actions/community';
import type {CommunityComment} from '@/types/database';

interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  forceSecret?: boolean; // 부모 댓글이 비밀이면 강제
  onAdded: (comment: CommunityComment) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentForm({
  postId,
  parentId = null,
  forceSecret = false,
  onAdded,
  onCancel,
  autoFocus,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [secret, setSecret] = useState(forceSecret);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || pending) return;
    setPending(true);
    try {
      const comment = await createComment(postId, {
        content,
        parentId,
        isSecret: forceSecret || secret,
      });
      onAdded(comment);
      setContent('');
      setSecret(forceSecret);
      onCancel?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '댓글 등록에 실패했어요');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? '답글을 입력해주세요' : '댓글을 입력해주세요'}
        rows={parentId ? 2 : 3}
        autoFocus={autoFocus}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={forceSecret || secret}
            disabled={forceSecret}
            onCheckedChange={(v) => setSecret(v === true)}
          />
          <Lock className="h-3.5 w-3.5" />
          비밀{parentId ? '답글' : '댓글'}
          {forceSecret && <span className="text-xs">(자동)</span>}
        </label>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!content.trim() || pending}>
            {pending ? '등록 중…' : '등록'}
          </Button>
        </div>
      </div>
    </form>
  );
}
