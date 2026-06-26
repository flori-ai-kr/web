import { describe, expect, it } from 'vitest';
import { extractToc, headingId } from './toc';
import type { GuideBlock } from './types';

describe('extractToc', () => {
  it('heading 블록만 뽑아 블록 인덱스로 id 생성', () => {
    const blocks: GuideBlock[] = [
      { type: 'paragraph', text: 'intro' },
      { type: 'heading', text: '첫 단계' },
      { type: 'steps', items: ['a'] },
      { type: 'heading', text: '둘째 단계' },
    ];
    expect(extractToc(blocks)).toEqual([
      { id: headingId(1), text: '첫 단계' },
      { id: headingId(3), text: '둘째 단계' },
    ]);
  });

  it('heading 이 없으면 빈 배열', () => {
    expect(extractToc([{ type: 'paragraph', text: 'x' }])).toEqual([]);
  });
});
