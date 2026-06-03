'use client';

import { useMemo } from 'react';
import { PhotoCard as PhotoCardType, PhotoTag } from '@/types/database';
import { PhotoCard } from './PhotoCard';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

interface PhotoCardGridProps {
  cards: PhotoCardType[];
  tags: PhotoTag[];
  onCardClick: (card: PhotoCardType) => void;
}

export function PhotoCardGrid({ cards, tags, onCardClick }: PhotoCardGridProps) {
  // 태그 이름 -> 색상 맵 생성
  const tagColorMap = useMemo(() => new Map(tags.map(t => [t.name, t.color])), [tags]);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="등록된 사진이 없습니다"
        description="새 카드를 추가해서 작업물을 기록해보세요"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <PhotoCard
          key={card.id}
          card={card}
          tagColorMap={tagColorMap}
          onClick={() => onCardClick(card)}
        />
      ))}
    </div>
  );
}
