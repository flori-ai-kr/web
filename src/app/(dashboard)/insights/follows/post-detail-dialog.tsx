'use client';

import Image from 'next/image';
import {ExternalLink, Heart} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import type {InstagramPostWithAccount} from '@/types/database';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';

interface PostDetailDialogProps {
  post: InstagramPostWithAccount | null;
  open: boolean;
  onClose: () => void;
}

export function PostDetailDialog({ post, open, onClose }: PostDetailDialogProps) {
  if (!post) return null;

  const images = post.image_urls.length > 0 ? post.image_urls : [];
  const caption = post.caption ?? '';
  const postedLabel = (() => {
    try {
      return format(new Date(post.posted_at), 'yyyy년 M월 d일 EEEE', { locale: ko });
    } catch {
      return '';
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-sage flex items-center justify-center text-white font-bold shrink-0">
                {(post.account.display_name || post.account.username)[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold truncate">
                  @{post.account.username}
                </DialogTitle>
                {postedLabel && (
                  <p className="text-xs text-muted-foreground truncate">{postedLabel}</p>
                )}
              </div>
            </div>
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand/90 shrink-0"
              aria-label="Instagram에서 열기"
            >
              Instagram
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </DialogHeader>

        {/* Image gallery: 1장이면 크게, 여러 장이면 그리드 */}
        {images.length > 0 && (
          <div
            className={
              images.length === 1
                ? 'bg-muted'
                : 'grid grid-cols-2 md:grid-cols-3 gap-0.5 bg-muted'
            }
          >
            {images.map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  images.length === 1
                    ? 'block relative w-full aspect-square'
                    : 'block relative w-full aspect-square hover:opacity-90 transition-opacity'
                }
                aria-label={`이미지 ${i + 1} — Instagram에서 열기`}
              >
                <Image
                  src={url}
                  alt={`@${post.account.username} 포스트 이미지 ${i + 1}`}
                  fill
                  sizes={images.length === 1 ? '(min-width: 768px) 768px, 100vw' : '(min-width: 768px) 33vw, 50vw'}
                  className="object-cover"
                  unoptimized
                />
              </a>
            ))}
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          {post.like_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{post.like_count.toLocaleString()}</span>
            </div>
          )}

          {caption && (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {caption}
            </p>
          )}

          <div className="pt-3 border-t border-border">
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              Instagram에서 전체 보기
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
