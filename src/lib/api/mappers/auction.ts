import type {
  AuctionPrice,
  AuctionPriceResult,
  AuctionSummary,
  AuctionSummaryItem,
} from '@/types/auction';
import {AUCTION_SOURCE} from '@/types/auction';

export interface KotlinAuctionSummaryItem {
  pumName: string;
  repAvg: number;
  repChangeRate: number | null;
  variantCount: number;
}

export interface KotlinAuctionSummary {
  date: string | null;
  source: string | null;
  items: KotlinAuctionSummaryItem[];
}

export function mapAuctionSummaryItem(i: KotlinAuctionSummaryItem): AuctionSummaryItem {
  return {
    pum_name: i.pumName,
    rep_avg: i.repAvg ?? 0,
    rep_change_rate: i.repChangeRate ?? null,
    variant_count: i.variantCount ?? 0,
  };
}

export function mapAuctionSummary(r: KotlinAuctionSummary): AuctionSummary {
  return {
    date: r?.date ?? null,
    source: r?.source ?? AUCTION_SOURCE,
    items: (r?.items ?? []).map(mapAuctionSummaryItem),
  };
}

export interface KotlinAuctionPrice {
  flowerGubn: string;
  pumName: string;
  goodName: string | null;
  lvNm: string | null;
  avgAmt: number;
  maxAmt: number;
  minAmt: number;
  totQty: number;
  totAmt: number;
  prevAvgAmt: number | null;
  changeRate: number | null;
}

export interface KotlinAuctionPriceResult {
  date: string | null;
  source: string | null;
  prices: KotlinAuctionPrice[];
}

export function mapAuctionPrice(p: KotlinAuctionPrice): AuctionPrice {
  return {
    flower_gubn: p.flowerGubn,
    pum_name: p.pumName,
    good_name: p.goodName ?? null,
    lv_nm: p.lvNm ?? null,
    avg_amt: p.avgAmt ?? 0,
    max_amt: p.maxAmt ?? 0,
    min_amt: p.minAmt ?? 0,
    tot_qty: p.totQty ?? 0,
    tot_amt: p.totAmt ?? 0,
    prev_avg_amt: p.prevAvgAmt ?? null,
    change_rate: p.changeRate ?? null,
  };
}

export function mapAuctionPriceResult(r: KotlinAuctionPriceResult): AuctionPriceResult {
  return {
    date: r?.date ?? null,
    source: r?.source ?? AUCTION_SOURCE,
    prices: (r?.prices ?? []).map(mapAuctionPrice),
  };
}
