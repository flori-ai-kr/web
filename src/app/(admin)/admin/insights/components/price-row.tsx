import type {AuctionPrice} from '@/types/auction';

export type PriceDeltaTone = 'up' | 'down' | 'flat';

/**
 * 한국 시세 관행: 상승=빨강 ▲, 하락=파랑 ▼, 변동없음/없음=회색.
 * (앱의 매출 delta는 상승=초록이지만 시세는 좋고나쁨이 아니라 방향이라 분리한다.)
 */
export function priceDeltaTone(rate: number | null): PriceDeltaTone {
  if (rate == null || rate === 0) return 'flat';
  return rate > 0 ? 'up' : 'down';
}

/** 등락률(비율, 0.1=+10%)을 "▲ 18%" 형태로 포맷. */
export function formatPriceDelta(rate: number | null): string {
  if (rate == null) return '–';
  if (rate === 0) return '0%';
  const glyph = rate > 0 ? '▲' : '▼';
  const pct = Math.abs(rate * 100);
  const text = pct >= 10 ? Math.round(pct).toString() : pct.toFixed(1);
  return `${glyph} ${text}%`;
}

/** 부호 없는 등락률(▲17.5% 형태, 공백 없음 — 좁은 컬럼용). */
export function formatPriceDeltaTight(rate: number | null): string {
  if (rate == null) return '–';
  if (rate === 0) return '0%';
  const glyph = rate > 0 ? '▲' : '▼';
  const pct = Math.abs(rate * 100);
  const text = pct >= 10 ? Math.round(pct).toString() : pct.toFixed(1);
  return `${glyph}${text}%`;
}

export const TONE_TEXT: Record<PriceDeltaTone, string> = {
  up: 'text-danger',
  down: 'text-[#2f6df0]',
  flat: 'text-muted-foreground',
};

/** 대표가 배지(점 배경) 톤 — 상승 연빨강 / 하락 연파랑 / 변동없음 회색. */
export const TONE_BADGE: Record<PriceDeltaTone, string> = {
  up: 'bg-[#fde7e3] text-[#c2503f]',
  down: 'bg-[#e6effd] text-[#2f6df0]',
  flat: 'bg-muted text-muted-foreground',
};

/** 드릴다운: 품종·등급 한 줄 (label · avg · changeRate). */
export function VariantPriceRow({price}: {price: AuctionPrice}) {
  const tone = priceDeltaTone(price.change_rate);
  const deltaLabel = formatPriceDeltaTight(price.change_rate);
  const ariaDir = tone === 'up' ? '상승' : tone === 'down' ? '하락' : '변동 없음';

  const label = [price.good_name, price.lv_nm].filter(Boolean).join(' · ') || price.pum_name;

  return (
    <div className="flex items-center px-4 py-2 pl-16 text-[13px]">
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      <span className="w-16 text-right font-medium tabular-nums text-foreground">
        {price.avg_amt.toLocaleString()}
      </span>
      <span
        className={`w-16 text-right tabular-nums ${TONE_TEXT[tone]}`}
        aria-label={price.change_rate == null ? '등락 정보 없음' : `${ariaDir} ${deltaLabel}`}
      >
        {deltaLabel}
      </span>
    </div>
  );
}
