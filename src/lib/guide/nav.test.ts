import { describe, expect, it } from 'vitest';
import { getAdjacent } from './nav';
import type { GuideArticleMeta } from './types';

const meta = (slug: string): GuideArticleMeta => ({
  slug,
  sectionId: 'start',
  order: 1,
  title: slug,
  description: '',
  icon: 'book',
});

const metas = ['a', 'b', 'c'].map(meta);

describe('getAdjacent', () => {
  it('가운데 글은 양쪽 이웃', () => {
    expect(getAdjacent(metas, 'b')).toEqual({ prev: metas[0], next: metas[2] });
  });

  it('첫 글은 prev 없음', () => {
    expect(getAdjacent(metas, 'a')).toEqual({ prev: null, next: metas[1] });
  });

  it('마지막 글은 next 없음', () => {
    expect(getAdjacent(metas, 'c')).toEqual({ prev: metas[1], next: null });
  });

  it('없는 slug 는 둘 다 null', () => {
    expect(getAdjacent(metas, 'z')).toEqual({ prev: null, next: null });
  });
});
