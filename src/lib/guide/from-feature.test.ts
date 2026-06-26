import { describe, expect, it } from 'vitest';
import { backTarget } from './from-feature';

describe('backTarget', () => {
  it('알려진 기능 slug → 라벨/href', () => {
    expect(backTarget('sales')).toEqual({ label: '매출', href: '/admin/sales' });
  });

  it('없거나 모르는 값 → null', () => {
    expect(backTarget(undefined)).toBeNull();
    expect(backTarget(null)).toBeNull();
    expect(backTarget('nope')).toBeNull();
  });
});
