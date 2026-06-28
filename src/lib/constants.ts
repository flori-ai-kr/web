import type { PaymentMethod, ReservationChannel, ExpenseCategory } from '@/types/database';

// ─── 정책 문서 링크 (admin 내부 페이지) ────────────────────────
// 가입 동의·푸터의 "보기"가 홈페이지(flori.ai.kr)로 튕기지 않고 admin 안에서 바로 열리도록
// 내부 라우트(/policy/*)로 보유한다. 내용은 홈페이지 정책과 동일하게 동기화한다(legal SSOT).
export const HOMEPAGE_URL = 'https://flori.ai.kr';
export const PRIVACY_POLICY_URL = '/policy/privacy';
export const TERMS_URL = '/policy/terms';
export const MARKETING_CONSENT_URL = '/policy/marketing';

// 동의 약관/처리방침 버전(시행일). api DEFAULT_POLICY_VERSION 과 일치시킨다.
export const POLICY_VERSION = '2026-06-19';

// ─── 결제방식 라벨 ─────────────────────────────────────────────
export const PAYMENT_LABELS: Record<string, string> = {
  cash: '현금',
  card: '카드',
  transfer: '계좌이체',
  naverpay: '네이버페이',
  kakaopay: '카카오페이',
  unpaid: '미수',
} satisfies Record<PaymentMethod | 'kakaopay', string>;

// ─── 채널 라벨 ─────────────────────────────────────────────────
export const CHANNEL_LABELS: Record<string, string> = {
  phone: '전화',
  kakaotalk: '카카오톡',
  naver_booking: '네이버예약',
  road: '로드',
  other: '기타',
} satisfies Record<ReservationChannel, string>;

// ─── "오늘만" 활성 필터 칩 스타일 (매출/지출 공용, 다크 세이프) ──────
export const TODAY_FILTER_ACTIVE_CLASS =
  'h-9 shrink-0 bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background';

// ─── 지출 카테고리 라벨 ────────────────────────────────────────
export const EXPENSE_LABELS: Record<string, string> = {
  flower_purchase: '꽃 사입',
  delivery: '배송비',
  advertising: '광고비',
  rent: '임대료',
  utilities: '공과금',
  supplies: '소모품',
  other: '기타',
} satisfies Record<ExpenseCategory, string>;
