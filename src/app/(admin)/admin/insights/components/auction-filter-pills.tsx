'use client';

import {FilterPill} from './filter-pill';
import type {AuctionCategory} from '@/types/auction';

interface AuctionFilterPillsProps {
  categories: AuctionCategory[];
  /** 활성 화훼구분 텍스트(flower_gubn: 절화/관엽/난/춘란). '' = 전체. (api가 텍스트로 필터함) */
  gubn: string;
  onChange: (gubn: string) => void;
}

/**
 * 화훼구분 칩 필터 (전체/절화/관엽/난/춘란). 네이티브 <select> 대체.
 * '전체' = gubn 미지정('').
 */
export function AuctionFilterPills({categories, gubn, onChange}: AuctionFilterPillsProps) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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
