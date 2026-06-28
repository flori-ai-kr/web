'use client';

import { PhotoTag } from '@/types/database';
import { FilterSelect } from '@/components/ui/filter-select';

interface TagFilterProps {
  tags: PhotoTag[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

/**
 * 태그 필터 — 매출/지출/고객과 동일한 셀렉트 드롭다운 형태.
 * 태그가 많아도 위 공간을 차지하지 않도록 칩 나열 대신 단일 선택 드롭다운으로 표시.
 */
export function TagFilter({ tags, selectedTag, onSelectTag }: TagFilterProps) {
  const options = [
    { value: '', label: '전체' },
    ...tags.map((tag) => ({ value: tag.name, label: `#${tag.name}` })),
  ];

  return (
    <FilterSelect
      label="태그"
      value={selectedTag ?? ''}
      defaultValue=""
      options={options}
      onChange={(v) => onSelectTag(v === '' ? null : v)}
    />
  );
}
