'use client';

import { useMemo } from 'react';
import { PhotoCard as PhotoCardType } from '@/types/database';
import { PhotoCard } from './PhotoCard';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

interface PhotoCardGridProps {
  cards: PhotoCardType[];
  onCardClick: (card: PhotoCardType) => void;
}

// KST 고정 — 서버/클라 라벨 일치(하이드레이션 안전). 등록일(created_at) 기준.
const MONTH_FMT = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long' });
const KEY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });

export function PhotoCardGrid({ cards, onCardClick }: PhotoCardGridProps) {
  // 등록일(created_at) 기준 월별 그룹. 목록 정렬키(updated_at)와 분류키가 달라도 섹션이
  // 뒤섞이지 않도록 월 키로 모은 뒤 월 desc로 정렬(다중월 범위에서도 안정적).
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; cards: PhotoCardType[]; photoCount: number }>();
    for (const card of cards) {
      const d = new Date(card.created_at);
      const key = KEY_FMT.format(d); // YYYY-MM (정렬용)
      let g = map.get(key);
      if (!g) {
        g = { label: MONTH_FMT.format(d), cards: [], photoCount: 0 };
        map.set(key, g);
      }
      g.cards.push(card);
      g.photoCount += card.photos.length;
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, g]) => g);
  }, [cards]);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="등록된 사진이 없습니다"
        description="새 카드를 추가해서 작업물을 기록해보세요"
      />
    );
  }

  // 단일 월(기간 셀렉터로 한 달만 보는 경우)이면 섹션 헤더 생략 — 상단 기간 헤더와 중복.
  const showHeaders = groups.length > 1;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.label}>
          {showHeaders && (
            <div className="sticky top-0 z-10 -mx-1 mb-2 bg-background/85 px-1 py-1.5 backdrop-blur-sm">
              <h2 className="text-[13px] font-semibold text-foreground">
                {group.label}
                <span className="ml-1.5 font-normal text-muted-foreground">· {group.photoCount}장</span>
              </h2>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {group.cards.map((card) => (
              <PhotoCard
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
