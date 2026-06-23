'use client';

import {useRef, useState, useTransition} from 'react';
import {Bookmark} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';
import {toggleScrap} from '@/lib/actions/scraps';
import type {ScrapTargetType} from '@/types/database';

interface ScrapButtonProps {
  targetType: ScrapTargetType;
  targetId: string;
  scraped: boolean;
  variant?: 'ghost' | 'overlay';
  size?: 'sm' | 'md';
  label?: string;
  onChange?: (scraped: boolean) => void;
}

export function ScrapButton({
  targetType,
  targetId,
  scraped,
  variant = 'ghost',
  size = 'md',
  label,
  onChange,
}: ScrapButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(scraped);
  const rollbackRef = useRef(scraped);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    const next = !optimistic;
    rollbackRef.current = optimistic;
    setOptimistic(next);
    onChange?.(next);

    startTransition(async () => {
      try {
        const result = await toggleScrap({
          target_type: targetType,
          target_id: targetId,
        });
        setOptimistic(result.scraped);
        onChange?.(result.scraped);
        toast.success(result.scraped ? '스크랩에 추가했어요' : '스크랩에서 제거했어요');
        router.refresh();
      } catch {
        setOptimistic(rollbackRef.current);
        onChange?.(rollbackRef.current);
        toast.error('스크랩 처리에 실패했어요');
      }
    });
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const padClass = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={optimistic ? '스크랩 해제' : '스크랩 추가'}
        aria-pressed={optimistic}
        className={cn(
          'inline-flex items-center justify-center rounded-full backdrop-blur-sm transition-colors',
          padClass,
          optimistic
            ? 'bg-brand text-white hover:bg-brand/90'
            : 'bg-black/55 text-white hover:bg-black/75',
        )}
      >
        <Bookmark className={cn(iconSize, optimistic && 'fill-current')} />
      </button>
    );
  }

  if (label) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={optimistic}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
          optimistic
            ? 'bg-brand text-white border-brand hover:bg-brand/90'
            : 'bg-card border-border text-foreground hover:border-brand/50',
        )}
      >
        <Bookmark className={cn(iconSize, optimistic && 'fill-current')} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={optimistic ? '스크랩 해제' : '스크랩 추가'}
      aria-pressed={optimistic}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        padClass,
        optimistic
          ? 'text-brand hover:bg-muted'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Bookmark className={cn(iconSize, optimistic && 'fill-current')} />
    </button>
  );
}
