'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {toast} from 'sonner';
import {getAuctionDates, getAuctionSummary, toggleAuctionItemScrap} from '@/lib/actions/auction';
import type {AuctionSummary, AuctionSummaryItem} from '@/types/auction';
import {AUCTION_DEFAULT_GUBN} from '@/types/auction';

interface Options {
  initialSummary: AuctionSummary;
  initialDates: string[];
  initialScraps: string[];
}

interface UseAuctionResult {
  gubn: string;
  setGubn: (g: string) => void;
  date: string | null;
  setDate: (d: string) => void;
  summary: AuctionSummary;
  dates: string[];
  loading: boolean;
  error: boolean;
  scrappedNames: Set<string>;
  toggleItemScrap: (pumName: string) => void;
}

/**
 * 경매 요약 상태: 화훼구분 칩 + 날짜 선택에 따라 /summary 와 /dates 를 재조회한다.
 * 최초 마운트는 SSR 데이터(initialSummary/initialDates)를 사용하고,
 * gubn 변경 시 보유 일자 목록도 갱신한다(절화/관엽 등에 따라 달라질 수 있음).
 */
export function useAuction({initialSummary, initialDates, initialScraps}: Options): UseAuctionResult {
  const [gubn, setGubnState] = useState(AUCTION_DEFAULT_GUBN);
  const [date, setDateState] = useState<string | null>(initialSummary.date);
  const [summary, setSummary] = useState<AuctionSummary>(initialSummary);
  const [dates, setDates] = useState<string[]>(initialDates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [scrappedNames, setScrappedNames] = useState<Set<string>>(() => new Set(initialScraps));

  const reqRef = useRef(0);
  const didMount = useRef(false);

  const fetchSummary = useCallback(async (g: string, d: string | null) => {
    const version = ++reqRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await getAuctionSummary({gubn: g || undefined, date: d ?? undefined});
      if (version !== reqRef.current) return;
      setSummary(res);
      // 서버가 보정한 실제 데이터 날짜로 동기화
      if (res.date) setDateState(res.date);
    } catch {
      if (version !== reqRef.current) return;
      setError(true);
      setSummary((prev) => ({date: null, source: prev.source, items: []}));
    } finally {
      if (version === reqRef.current) setLoading(false);
    }
  }, []);

  // 화훼구분/날짜 변경 시 요약 재조회 (최초 마운트는 SSR 데이터 사용)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    void fetchSummary(gubn, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gubn, date]);

  // 화훼구분 변경 시 보유 일자 목록 갱신
  useEffect(() => {
    if (!didMount.current) return;
    let active = true;
    getAuctionDates(gubn || undefined)
      .then((d) => {
        if (active) setDates(d);
      })
      .catch(() => {
        /* 기존 목록 유지 */
      });
    return () => {
      active = false;
    };
  }, [gubn]);

  // gubn 변경 시 날짜는 서버 보정(최신 완전일자)에 맡기기 위해 비움
  const setGubn = useCallback((g: string) => {
    setGubnState(g);
    setDateState(null);
  }, []);

  const setDate = useCallback((d: string) => setDateState(d), []);

  // 품목 스크랩 낙관적 토글 — 서버 결과로 동기화, 실패 시 롤백.
  const toggleItemScrap = useCallback((pumName: string) => {
    setScrappedNames((prev) => toggled(prev, pumName));
    void toggleAuctionItemScrap(pumName)
      .then((scraped) => {
        setScrappedNames((prev) => {
          const next = new Set(prev);
          if (scraped) next.add(pumName);
          else next.delete(pumName);
          return next;
        });
      })
      .catch(() => {
        setScrappedNames((prev) => toggled(prev, pumName));
        toast.error('스크랩 처리에 실패했어요');
      });
  }, []);

  return {gubn, setGubn, date, setDate, summary, dates, loading, error, scrappedNames, toggleItemScrap};
}

/** Set 에서 name 을 토글한 새 Set 을 반환(불변 갱신). */
function toggled(set: Set<string>, name: string): Set<string> {
  const next = new Set(set);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  return next;
}

/**
 * 품목 요약 목록을 검색어로 좁힌다 (pum_name 부분일치, 대소문자 무시).
 * 빈 쿼리(공백 포함)는 전체를 그대로 반환한다. KPI 산정과 무관한 표시용 필터.
 */
export function filterAuctionItems(
  items: AuctionSummaryItem[],
  query: string,
): AuctionSummaryItem[] {
  const q = query.trim().toLowerCase();
  if (q === '') return items;
  return items.filter((it) => it.pum_name.toLowerCase().includes(q));
}

/** 신뢰 가능한 헤드라인 후보로 보는 최소 품종·등급 수. 단발성 1건 품목을 배제한다. */
const MIN_CONFIDENT_VARIANTS = 3;

function pickExtremesFrom(items: AuctionSummaryItem[]): {
  strongest: AuctionSummaryItem | null;
  weakest: AuctionSummaryItem | null;
} {
  let strongest: AuctionSummaryItem | null = null;
  let weakest: AuctionSummaryItem | null = null;
  for (const it of items) {
    if (it.rep_change_rate == null) continue;
    if (it.rep_change_rate > 0 && (!strongest || it.rep_change_rate > (strongest.rep_change_rate ?? 0))) {
      strongest = it;
    }
    if (it.rep_change_rate < 0 && (!weakest || it.rep_change_rate < (weakest.rep_change_rate ?? 0))) {
      weakest = it;
    }
  }
  return {strongest, weakest};
}

/**
 * 등락률 기준 최고 강세/약세 품목을 고른다(변동 없는 항목은 제외).
 * 신뢰도 필터: 품종·등급이 3개 이상인 품목만 1차 후보로 삼아, 단일 거래로 ±수십%가
 * 찍히는 마이너 품목(예: 치자 +84% / 돈나무 −47%)이 헤드라인을 차지하는 걸 막는다.
 * 신뢰 후보가 없으면(전부 thin) 등락 있는 전 품목으로 폴백한다.
 */
export function pickAuctionExtremes(items: AuctionSummaryItem[]): {
  strongest: AuctionSummaryItem | null;
  weakest: AuctionSummaryItem | null;
} {
  const confident = items.filter(
    (it) => it.rep_change_rate != null && it.variant_count >= MIN_CONFIDENT_VARIANTS,
  );

  const {strongest, weakest} = pickExtremesFrom(confident);
  if (strongest && weakest) return {strongest, weakest};

  // 한쪽이라도 신뢰 후보로 못 채우면, 그 칸만 전 품목 폴백으로 보강한다.
  const fallback = pickExtremesFrom(items);
  return {
    strongest: strongest ?? fallback.strongest,
    weakest: weakest ?? fallback.weakest,
  };
}
