export type RangePreset = 'this-month' | 'last-month' | 'last-3m' | 'this-year' | 'custom';

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function resolveRange(preset: RangePreset, base = new Date()): { from: string; to: string } {
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();
  switch (preset) {
    case 'last-month':
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    case 'last-3m':
      // 오늘로부터 3개월 전 같은 날짜 ~ 오늘 (예: 6/10 → 3/10)
      return { from: fmt(new Date(y, m - 3, d)), to: fmt(base) };
    case 'this-year':
      return { from: fmt(new Date(y, 0, 1)), to: fmt(new Date(y, 11, 31)) };
    case 'this-month':
    case 'custom':
    default:
      return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
}
