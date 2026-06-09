import { describe, it, expect } from 'vitest';
import { resolveRange } from '../range';

describe('resolveRange', () => {
  const today = new Date(2026, 5, 9); // 2026-06-09 local
  it('this-month → 그 달 1일~말일', () => {
    expect(resolveRange('this-month', today)).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });
  it('last-month', () => {
    expect(resolveRange('last-month', today)).toEqual({ from: '2026-05-01', to: '2026-05-31' });
  });
  it('last-3m → 직전 2개월 1일 ~ 오늘', () => {
    expect(resolveRange('last-3m', today)).toEqual({ from: '2026-04-01', to: '2026-06-09' });
  });
  it('this-year', () => {
    expect(resolveRange('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
  it('custom → falls back to this-month range', () => {
    expect(resolveRange('custom', today)).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });
});
