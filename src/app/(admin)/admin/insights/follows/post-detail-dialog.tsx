'use client';

import {useState} from 'react';
import Image from 'next/image';
import {ExternalLink, Heart, X} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import type {InstagramPostWithAccount, ScrapMap} from '@/types/database';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import {ImageLightbox} from '@/components/ui/image-lightbox';
import {normalizeInstagramImageUrl} from '@/lib/instagram-url';
import {ScrapMemoEditor} from '@/app/(admin)/admin/insights/components/scrap-memo-editor';

interface PostDetailDialogProps {
  post: InstagramPostWithAccount | null;
  open: boolean;
  onClose: () => void;
  scrapMap?: ScrapMap;
}

export function PostDetailDialog(props: PostDetailDialogProps) {
  return <PostDetailDialogInner key={props.post?.id ?? 'empty'} {...props} />;
}

function PostDetailDialogInner({ post, open, onClose, scrapMap }: PostDetailDialogProps) {
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  if (!post) return null;

  const images = post.image_urls.length > 0 ? post.image_urls.map(normalizeInstagramImageUrl) : [];
  const caption = post.caption ?? '';
  const postedLabel = (() => {
    try {
      return format(new Date(post.posted_at), 'yyyy년 M월 d일 EEEE', { locale: ko });
    } catch {
      return '';
    }
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        >
          <DialogHeader className="px-5 pt-5 pb-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
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
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand/90"
                  aria-label="Instagram에서 열기"
                >
                  Instagram
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center hover:bg-muted/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Image gallery: 클릭 시 라이트박스로 확대 */}
          {images.length > 0 && (
            <div
              className={
                images.length === 1
                  ? 'bg-muted'
                  : 'grid grid-cols-2 md:grid-cols-3 gap-0.5 bg-muted'
              }
            >
              {images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setZoomedIndex(i)}
                  className={
                    images.length === 1
                      ? 'block relative w-full aspect-square cursor-zoom-in'
                      : 'block relative w-full aspect-square hover:opacity-90 transition-opacity cursor-zoom-in'
                  }
                  aria-label={`이미지 ${i + 1} 확대 보기`}
                >
                  <Image
                    src={url}
                    alt={`@${post.account.username} 포스트 이미지 ${i + 1}`}
                    fill
                    sizes={images.length === 1 ? '(min-width: 768px) 768px, 100vw' : '(min-width: 768px) 33vw, 50vw'}
                    className="object-cover"
                  />
                </button>
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

            <ScrapMemoEditor
              targetType="post"
              targetId={post.id}
              initialScraped={!!scrapMap?.[post.id]}
              initialMemo={scrapMap?.[post.id]?.memo ?? null}
            />

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

      <ImageLightbox
        images={images}
        index={zoomedIndex}
        onClose={() => setZoomedIndex(null)}
        onNavigate={(next) => setZoomedIndex(next)}
        caption={`@${post.account.username}`}
      />
    </>
  );
}
