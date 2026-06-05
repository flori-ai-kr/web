'use client';

import {useEffect} from 'react';
import Image from 'next/image';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';

/**
 * 이미지 확대 라이트박스. prev/next 화살표 + Esc/←/→ 키보드 내비게이션.
 * index가 null이면 닫힘. 매출 상세·인스타 포스트 등에서 공용 사용.
 */
export function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
  caption,
}: {
  images: string[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
  caption: string;
}) {
  useEffect(() => {
    if (index === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && index! > 0) onNavigate(index! - 1);
      if (e.key === 'ArrowRight' && index! < images.length - 1) onNavigate(index! + 1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, images.length, onNavigate]);

  if (index === null) return null;
  const src = images[index];
  if (!src) return null;
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[min(95vw,1200px)] w-full p-0 gap-0 bg-zinc-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl"
      >
        <DialogTitle className="sr-only">{`이미지 확대 보기 · ${caption}`}</DialogTitle>
        <div className="relative flex items-center justify-center min-h-[60vh] max-h-[90vh]">
          <Image
            key={src}
            src={src}
            alt={`${caption} 이미지 ${index + 1}`}
            width={1200}
            height={1200}
            sizes="(min-width: 1200px) 1200px, 95vw"
            className="max-h-[90vh] w-auto h-auto object-contain"
            priority
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 backdrop-blur-md ring-1 ring-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {hasPrev && (
            <button
              type="button"
              onClick={() => onNavigate(index - 1)}
              aria-label="이전 이미지"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 backdrop-blur-md ring-1 ring-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onNavigate(index + 1)}
              aria-label="다음 이미지"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 backdrop-blur-md ring-1 ring-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/15 text-white text-xs backdrop-blur-md ring-1 ring-white/10">
              {index + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
