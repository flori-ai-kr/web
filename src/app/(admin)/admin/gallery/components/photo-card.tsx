'use client';

import { PhotoCard as PhotoCardType } from '@/types/database';
import { FileText, Image as ImageIcon, Images, User } from 'lucide-react';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';

interface PhotoCardProps {
  card: PhotoCardType;
  onClick: () => void;
}

/**
 * 앨범 표지 스타일 — 표지 1장이 타일을 꽉 채우고, 메타는 하단 그라데이션 캡션으로.
 * (PWA 모바일은 hover가 없어 캡션은 항상 최소 노출, hover 시 살짝 강조)
 */
export function PhotoCard({ card, onClick }: PhotoCardProps) {
  const photoCount = card.photos.length;
  const cover = card.photos[0];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${card.title} 사진 카드 보기`}
      className="group relative aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer ring-1 ring-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* 표지 */}
      {cover ? (
        <ImageWithSkeleton
          src={cover.url}
          alt={card.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-9 h-9 text-muted-foreground/50" />
        </div>
      )}

      {/* 우상단: 여러 장 표지 배지 */}
      {photoCount > 1 && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Images className="w-3 h-3" aria-hidden />
          {photoCount}
        </span>
      )}

      {/* 좌상단: 메모 픽토그램(메모 있을 때만) */}
      {card.memo && (
        <span
          className="absolute top-2 left-2 grid place-items-center w-6 h-6 rounded-full bg-black/45 text-white backdrop-blur-sm"
          title="메모 있음"
          aria-label="메모 있음"
        >
          <FileText className="w-3 h-3" aria-hidden />
        </span>
      )}

      {/* 하단 캡션 — 항상 최소 노출, hover 시 그라데이션 강조 */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 pt-6 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
        {/* 태그 — #해시태그 (최대 3) */}
        {card.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-0.5">
            {card.tags.slice(0, 3).map((tagName) => (
              <span key={tagName} className="text-[10px] font-medium text-white/90 truncate max-w-[90px]">
                #{tagName}
              </span>
            ))}
          </div>
        )}
        <h3 className="text-[13px] font-semibold text-white truncate drop-shadow-sm">{card.title}</h3>
        {card.customer_name && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/85 truncate">
            <User className="w-3 h-3 shrink-0" aria-hidden />
            <span className="truncate">{card.customer_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
