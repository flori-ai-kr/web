// 경매 시세 — aT 양재 화훼공판장 단일 시장의 일별 경락가.
// BFF GET /insights/auction/{categories,dates,summary,prices} 응답을 미러링한다.
// 출처: 화훼유통정보(aT) — 이용허락범위 '제작자표시' 의무.

/** 화훼구분 필터 옵션 (절화/관엽/난/춘란). */
export interface AuctionCategory {
  code: string;
  label: string;
}

/** 품목 단위 대표 시세 (목록 한 줄). BFF /summary items 미러. */
export interface AuctionSummaryItem {
  /** 품목명 (예: 장미) */
  pum_name: string;
  /** 대표가 = 거래량 가중평균(원) */
  rep_avg: number;
  /** 대표 등락률 — 비율(0.12 = +12%). 매칭 품종 없으면 null */
  rep_change_rate: number | null;
  /** 이 품목에 속한 품종·등급 수 */
  variant_count: number;
}

/** 품목별 요약 결과. BFF /insights/auction/summary 미러. */
export interface AuctionSummary {
  /** 데이터 없으면 null */
  date: string | null;
  /** 출처 표기 문자열 (예: '화훼유통정보(aT)') */
  source: string;
  items: AuctionSummaryItem[];
}

export interface AuctionPrice {
  /** 화훼구분명 (절화/관엽/난/춘란) */
  flower_gubn: string;
  /** 품목명 (예: 거베라) */
  pum_name: string;
  /** 품종/상품명 (예: 미니(혼합)) */
  good_name: string | null;
  /** 등급명 (예: 특2) */
  lv_nm: string | null;
  /** 평균단가(원) */
  avg_amt: number;
  /** 최고가(원) */
  max_amt: number;
  /** 최저가(원) */
  min_amt: number;
  /** 총 거래량 */
  tot_qty: number;
  /** 총 거래금액(원) */
  tot_amt: number;
  /** 전일 평균단가. 전일 데이터 없으면 null */
  prev_avg_amt: number | null;
  /** 등락률 — 비율(0.046 = +4.6%). 전일 데이터 없으면 null */
  change_rate: number | null;
}

export interface AuctionPriceResult {
  /** 데이터 없으면 null */
  date: string | null;
  /** 출처 표기 문자열 (예: '화훼유통정보(aT)') */
  source: string;
  prices: AuctionPrice[];
}

/** 화훼구분 필터 옵션 (BFF /insights/auction/categories 미러). */
export const AUCTION_CATEGORIES: readonly AuctionCategory[] = [
  {code: '1', label: '절화'},
  {code: '2', label: '관엽'},
  {code: '3', label: '난'},
  // 춘란(code 4)은 f001에 데이터가 없어(비철·제철 모두 0건 확인) 노출 제외.
] as const;

/** 출처 표기 기본값 (응답 source 없을 때 폴백). */
export const AUCTION_SOURCE = '화훼유통정보(aT)';

/**
 * 기본 화훼구분 = 전체('') — 세 구분(절화/관엽/난)을 모두 보여준다.
 * (거래단위가 절화=속 / 관엽·난=분 으로 섞이지만, 대표가 메타에 '단위는 구분별 상이'로 안내한다.)
 */
export const AUCTION_DEFAULT_GUBN = '';
