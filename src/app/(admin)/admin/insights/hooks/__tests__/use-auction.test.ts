import {describe, it, expect, vi} from 'vitest';

// 훅 모듈은 server action(auction.ts)을 정적 import 하므로, 순수 함수만 테스트해도
// 모듈 평가 시 BFF 클라이언트/auth-guard 가 끌려온다. 부작용 없이 평가되도록 모킹한다.
vi.mock('@/lib/auth-guard', () => ({requireAuth: vi.fn()}));
vi.mock('@/lib/api/client', () => ({apiFetch: vi.fn()}));

import {filterAuctionItems, pickAuctionExtremes} from '../use-auction';
import {AUCTION_DEFAULT_GUBN} from '@/types/auction';
import type {AuctionSummaryItem} from '@/types/auction';

function item(
  pum: string,
  rate: number | null,
  variants: number,
): AuctionSummaryItem {
  return {pum_name: pum, rep_avg: 1000, rep_change_rate: rate, variant_count: variants};
}

describe('AUCTION_DEFAULT_GUBN', () => {
  it("기본 화훼구분은 전체('') — 세 구분을 모두 노출", () => {
    expect(AUCTION_DEFAULT_GUBN).toBe('');
  });
});

describe('pickAuctionExtremes (신뢰도 필터)', () => {
  it('품종·등급 3개 미만(thin) 품목은 신뢰 후보에서 제외하고, 3개 이상에서 강세/약세를 고른다', () => {
    const items = [
      item('치자', 0.84, 1), // thin: +84% 이지만 1건 → 제외
      item('돈나무', -0.47, 2), // thin: -47% 이지만 2건 → 제외
      item('안개', 0.18, 12), // confident 강세
      item('맨드라미', -0.09, 8), // confident 약세
    ];
    const {strongest, weakest} = pickAuctionExtremes(items);
    expect(strongest?.pum_name).toBe('안개');
    expect(weakest?.pum_name).toBe('맨드라미');
  });

  it('정확히 3개 품종은 신뢰 후보에 포함된다', () => {
    const items = [item('국화', 0.2, 3), item('장미', 0.1, 50)];
    const {strongest} = pickAuctionExtremes(items);
    expect(strongest?.pum_name).toBe('국화');
  });

  it('rep_change_rate 가 null 인 항목은 신뢰 여부와 무관하게 제외', () => {
    const items = [item('백합', null, 99), item('튤립', 0.05, 5)];
    const {strongest} = pickAuctionExtremes(items);
    expect(strongest?.pum_name).toBe('튤립');
  });

  it('신뢰 후보가 없으면(전부 thin) 등락 있는 전 품목으로 폴백', () => {
    const items = [item('치자', 0.84, 1), item('돈나무', -0.47, 2)];
    const {strongest, weakest} = pickAuctionExtremes(items);
    expect(strongest?.pum_name).toBe('치자');
    expect(weakest?.pum_name).toBe('돈나무');
  });

  it('한쪽만 신뢰 후보가 있으면 비는 칸만 전 품목으로 폴백', () => {
    const items = [
      item('안개', 0.18, 12), // confident 강세
      item('돈나무', -0.47, 1), // thin 약세 → 폴백으로만 채워짐
    ];
    const {strongest, weakest} = pickAuctionExtremes(items);
    expect(strongest?.pum_name).toBe('안개');
    expect(weakest?.pum_name).toBe('돈나무');
  });

  it('변동 없는(0) 항목은 강세/약세 모두에서 제외', () => {
    const items = [item('소국', 0, 10), item('거베라', 0.03, 6)];
    const {strongest, weakest} = pickAuctionExtremes(items);
    expect(strongest?.pum_name).toBe('거베라');
    expect(weakest).toBeNull();
  });
});

describe('filterAuctionItems (품목 검색)', () => {
  const items = [item('장미', 0.1, 5), item('국화', -0.05, 8), item('소국', 0.02, 4)];

  it('빈 쿼리(공백 포함)는 전체를 그대로 반환', () => {
    expect(filterAuctionItems(items, '')).toHaveLength(3);
    expect(filterAuctionItems(items, '   ')).toHaveLength(3);
  });

  it('pum_name 부분일치(대소문자 무시)로 좁힌다', () => {
    const result = filterAuctionItems(items, '국');
    expect(result.map((it) => it.pum_name)).toEqual(['국화', '소국']);
  });

  it('영문 검색어는 대소문자를 무시한다', () => {
    const en = [item('Rose', 0.1, 5), item('Lily', 0.0, 3)];
    expect(filterAuctionItems(en, 'rose')).toHaveLength(1);
    expect(filterAuctionItems(en, 'ROSE')[0].pum_name).toBe('Rose');
  });

  it('일치 항목이 없으면 빈 배열', () => {
    expect(filterAuctionItems(items, '튤립')).toEqual([]);
  });
});
