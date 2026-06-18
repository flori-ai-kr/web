'use server';

import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';
import type {AuctionCategory, AuctionPriceResult, AuctionSummary} from '@/types/auction';
import {AUCTION_CATEGORIES, AUCTION_SOURCE} from '@/types/auction';
import {
    type KotlinAuctionPriceResult,
    type KotlinAuctionSummary,
    mapAuctionPriceResult,
    mapAuctionSummary,
} from '@/lib/api/mappers/auction';

// ─── 화훼구분 목록 ────────────────────────────────────────
// 사실상 정적(절화/관엽/난/춘란)이지만 BFF가 권위 소스이므로 조회하고,
// 실패 시 정적 폴백을 반환한다.

async function _getAuctionCategories(): Promise<AuctionCategory[]> {
  await requireAuth();

  // 춘란은 f001 데이터가 없어 항상 빈 옵션 → api가 반환하더라도 노출에서 거른다.
  try {
    const data = await apiFetch<AuctionCategory[]>('/insights/auction/categories');
    if (data && data.length > 0) return data.filter((c) => c.label !== '춘란');
  } catch {
    // 폴백으로 진행
  }
  return [...AUCTION_CATEGORIES];
}

export const getAuctionCategories = withErrorLogging('getAuctionCategories', _getAuctionCategories);

// ─── 시세 보유 일자 목록 (sale_dates desc) ────────────────
// 날짜 네비/피커에서 빈 날을 건너뛰기 위해 사용. gubn 선택 필터.

async function _getAuctionDates(gubn?: string): Promise<string[]> {
  await requireAuth();

  const qs = gubn ? `?gubn=${encodeURIComponent(gubn)}` : '';
  const data = await apiFetch<string[]>(`/insights/auction/dates${qs}`);
  return data ?? [];
}

export const getAuctionDates = withErrorLogging('getAuctionDates', _getAuctionDates);

// ─── 품목별 대표 시세 요약 ────────────────────────────────
// date 미지정 시 BFF가 '최신 완전일자'로 보정. gubn: 화훼구분 코드(절화/관엽/난/춘란).

async function _getAuctionSummary(options: {
  date?: string;
  gubn?: string;
} = {}): Promise<AuctionSummary> {
  await requireAuth();

  const params = new URLSearchParams();
  if (options.date) params.set('date', options.date);
  if (options.gubn) params.set('gubn', options.gubn);

  const qs = params.toString();
  const data = await apiFetch<KotlinAuctionSummary>(
    `/insights/auction/summary${qs ? `?${qs}` : ''}`,
  );
  return mapAuctionSummary(data ?? {date: null, source: AUCTION_SOURCE, items: []});
}

export const getAuctionSummary = withErrorLogging('getAuctionSummary', _getAuctionSummary);

// ─── 품목 드릴다운: 품종·등급 경락가 ──────────────────────
// 한 품목(item = pumName)의 품종·등급 행을 조회한다. date/gubn으로 요약과 동기화.

async function _getAuctionPrices(options: {
  date?: string;
  gubn?: string;
  item: string;
}): Promise<AuctionPriceResult> {
  await requireAuth();

  const params = new URLSearchParams();
  if (options.date) params.set('date', options.date);
  if (options.gubn) params.set('gubn', options.gubn);
  params.set('item', options.item);

  const data = await apiFetch<KotlinAuctionPriceResult>(
    `/insights/auction/prices?${params.toString()}`,
  );
  return mapAuctionPriceResult(data ?? {date: null, source: AUCTION_SOURCE, prices: []});
}

export const getAuctionPrices = withErrorLogging('getAuctionPrices', _getAuctionPrices);
