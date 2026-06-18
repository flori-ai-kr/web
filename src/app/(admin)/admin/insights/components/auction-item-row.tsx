'use client';

import {useId, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {getAuctionPrices} from '@/lib/actions/auction';
import type {AuctionPrice, AuctionSummaryItem} from '@/types/auction';
import {
  VariantPriceRow,
  formatPriceDelta,
  priceDeltaTone,
  TONE_BADGE,
} from './price-row';

interface AuctionItemRowProps {
  item: AuctionSummaryItem;
  /** 드릴다운 조회용 컨텍스트 (요약과 동기화). */
  date: string | null;
  gubn: string;
}

type DrillState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'loaded'; prices: AuctionPrice[]}
  | {status: 'error'};

/**
 * 품목 대표 한 줄 + 탭하면 품종·등급 펼침(드릴다운).
 * 드릴다운은 펼칠 때 한 번만 지연 로드하고 이후 캐시한다.
 */
export function AuctionItemRow({item, date, gubn}: AuctionItemRowProps) {
  const [open, setOpen] = useState(false);
  const [drill, setDrill] = useState<DrillState>({status: 'idle'});
  const panelId = useId();

  const tone = priceDeltaTone(item.rep_change_rate);
  const deltaLabel = formatPriceDelta(item.rep_change_rate);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && drill.status === 'idle') void load();
  };

  const load = async () => {
    setDrill({status: 'loading'});
    try {
      const res = await getAuctionPrices({
        date: date ?? undefined,
        gubn: gubn || undefined,
        item: item.pum_name,
      });
      setDrill({status: 'loaded', prices: res.prices});
    } catch {
      setDrill({status: 'error'});
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{item.pum_name}</span>
          <span className="block text-[12px] text-muted-foreground tabular-nums">
            {item.variant_count}개 품종·등급
          </span>
        </span>
        <span className="text-right">
          <span className="block text-sm font-bold text-foreground tabular-nums">
            {item.rep_avg.toLocaleString()}원
          </span>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${TONE_BADGE[tone]}`}
          >
            {deltaLabel}
          </span>
        </span>
      </button>

      {open && (
        <div id={panelId} className="divide-y divide-border bg-muted/30">
          {drill.status === 'loading' && (
            <p className="px-4 py-3 pl-16 text-[12px] text-muted-foreground">불러오는 중…</p>
          )}
          {drill.status === 'error' && (
            <p className="px-4 py-3 pl-16 text-[12px] text-muted-foreground">
              품종·등급을 불러오지 못했어요.
            </p>
          )}
          {drill.status === 'loaded' && drill.prices.length === 0 && (
            <p className="px-4 py-3 pl-16 text-[12px] text-muted-foreground">
              품종·등급 상세가 없어요.
            </p>
          )}
          {drill.status === 'loaded' &&
            drill.prices.map((p, i) => (
              <VariantPriceRow key={`${p.good_name}-${p.lv_nm}-${i}`} price={p} />
            ))}
        </div>
      )}
    </div>
  );
}
