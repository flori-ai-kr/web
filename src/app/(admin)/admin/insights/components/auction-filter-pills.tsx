'use client';

import {FilterPill} from './filter-pill';
import type {AuctionCategory} from '@/types/auction';

interface AuctionFilterPillsProps {
  categories: AuctionCategory[];
  /** 활성 화훼구분 텍스트(flower_gubn: 절화/관엽/난/춘란). '' = 전체. (api가 텍스트로 필터함) */
  gubn: string;
  onChange: (gubn: string) => void;
  /** 스크랩만 보기 토글 상태(화훼구분과 직교 — 선택한 구분 안에서 스크랩만 필터). */
  scrapedOnly: boolean;
  scrappedCount: number;
  onScrapToggle: () => void;
}

/**
 * 화훼구분 칩 필터 (스크랩/전체/절화/관엽/난). 네이티브 <select> 대체.
 * '전체' = gubn 미지정(''). 스크랩 칩은 맨 앞 — 화훼구분과 직교하는 '스크랩만 보기' 토글.
 */
export function AuctionFilterPills({
  categories,
  gubn,
  onChange,
  scrapedOnly,
  scrappedCount,
  onScrapToggle,
}: AuctionFilterPillsProps) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      <FilterPill
        active={scrapedOnly}
        onClick={onScrapToggle}
        label="스크랩"
        glyph="🔖"
        count={scrappedCount}
      />
      <FilterPill active={gubn === ''} onClick={() => onChange('')} label="전체" />
      {categories.map((c) => (
        <FilterPill
          key={c.code}
          active={gubn === c.label}
          onClick={() => onChange(c.label)}
          label={c.label}
        />
      ))}
    </div>
  );
}
