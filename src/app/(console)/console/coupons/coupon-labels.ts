/**
 * 쿠폰 용도(source) 라벨 SSOT.
 * 값은 영문 enum(PROMO/REFERRAL/EVENT/MANUAL — BFF 계약)을 그대로 쓰고, 화면 표시만 한글로 한다.
 * 발행 폼·목록 테이블·상세에서 공유.
 */
export const COUPON_SOURCES = ['PROMO', 'REFERRAL', 'EVENT', 'MANUAL'] as const;

export type CouponSource = (typeof COUPON_SOURCES)[number];

export const COUPON_SOURCE_LABELS: Record<CouponSource, string> = {
  PROMO: '프로모션',
  REFERRAL: '추천',
  EVENT: '이벤트',
  MANUAL: '수동 발급',
};

/** 알 수 없는 값(BFF가 새 용도 추가 등)도 안전하게 — 매핑 없으면 원문 노출. */
export function couponSourceLabel(source: string): string {
  return (COUPON_SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

/**
 * 쿠폰 유효 상태(effectiveStatus) 라벨 SSOT.
 * CouponEffectiveStatus(ACTIVE/DISABLED/EXPIRED/EXHAUSTED) 영문 enum → 화면 한글.
 * 목록 StatusBadge·상세 배지에서 공유. 배지 색/톤은 호출부(STATUS_TONE)가 유지.
 */
export const COUPON_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '사용 가능',
  DISABLED: '중지됨',
  EXPIRED: '기간 만료',
  EXHAUSTED: '소진',
};

/** 매핑 없으면 원문 노출(계약 회귀 안전). */
export function couponStatusLabel(status: string): string {
  return COUPON_STATUS_LABELS[status] ?? status;
}
