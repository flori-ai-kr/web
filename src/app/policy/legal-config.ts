/**
 * flori 서비스 운영사 법적 정보 SSOT (admin 정책 페이지 전용).
 *
 * 홈페이지(flori.ai.kr) `src/lib/legal-config.ts` 와 값이 동일해야 한다(legal SSOT).
 * admin 정책 페이지(이용약관 · 개인정보 처리방침 · 마케팅 수신 동의)는 이 상수만 참조한다.
 * 페이지 본문에 절대 임의의 값을 하드코딩하지 않고 이 상수만 사용한다.
 */
export const FLORI_LEGAL = {
  /** 서비스 명칭 */
  serviceName: 'flori',
  /** 운영사 상호 (사업자등록상) */
  companyName: '플로리',
  /** 대표자명 */
  ceo: '한상호',
  /** 사업자등록번호 */
  bizRegNo: '315-50-00964',
  /** 통신판매업 신고번호 — PG 가맹 승인 후 발급되면 기입. 빈 값이면 표기 자동 숨김 */
  mailOrderNo: '',
  /** 사업장 소재지 */
  address: '서울특별시 강북구 월계로21가길 41, 102동 901호',
  /** 대표 연락처 */
  phone: '010-5892-6693',
  /** 개인정보 보호책임자 */
  privacyOfficer: {
    name: '한상호',
    title: '운영자',
    email: 'support@flori.ai.kr',
  },
  /** 일반 문의 이메일 */
  contactEmail: 'support@flori.ai.kr',
  /** 공식 인스타그램 */
  instagram: 'https://www.instagram.com/flori.ai.official/',
  /** 개인정보 처리방침 시행일 (YYYY-MM-DD) */
  privacyEffectiveDate: '2026-06-19',
  /** 서비스 이용약관 시행일 (YYYY-MM-DD) */
  termsEffectiveDate: '2026-06-19',
  /** 환불정책 시행일 (YYYY-MM-DD) */
  refundEffectiveDate: '2026-06-19',
  /** 마케팅·혜택 정보 수신 동의 시행일 (YYYY-MM-DD) */
  marketingEffectiveDate: '2026-06-19',
} as const

/** 분쟁/관할 관련 (이용약관에서 사용). */
export const FLORI_LEGAL_JURISDICTION = {
  /** 분쟁 발생 시 관할 법원 (운영자 소재지 기준 — 서울 강북구 → 서울북부지방법원) */
  court: '서울북부지방법원',
} as const
