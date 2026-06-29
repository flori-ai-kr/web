import type { GuideBlock, GuideTocItem } from './types';

// heading 블록의 id는 본문 블록 배열 인덱스 기준(렌더러와 동일 규칙) → 스크롤 타깃 일치.
export const headingId = (blockIndex: number): string => `s-${blockIndex}`;

export function extractToc(blocks: GuideBlock[]): GuideTocItem[] {
  const items: GuideTocItem[] = [];
  blocks.forEach((block, i) => {
    if (block.type === 'heading') items.push({ id: headingId(i), text: block.text });
  });
  return items;
}
