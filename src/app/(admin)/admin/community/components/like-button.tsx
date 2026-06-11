'use client';

import {useState} from 'react';
import {Heart} from 'lucide-react';
import {cn} from '@/lib/utils';
import {togglePostLike} from '@/lib/actions/community';
import {toast} from 'sonner';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const onToggle = async () => {
    if (pending) return;
    // 롤백용 직전 값 캡처
    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !liked;
    // 낙관적 업데이트
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    setPending(true);
    try {
      const res = await togglePostLike(postId);
      setLiked(res.liked);
      setCount(res.likeCount);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      toast.error('좋아요 처리에 실패했어요');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        liked
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-border text-muted-foreground hover:border-brand/40 hover:text-brand',
      )}
    >
      <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
      <span>{count}</span>
    </button>
  );
}
