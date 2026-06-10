/**
 * flori 서비스 운영사 법적 정보 SSOT.
 *
 * 정책 페이지(개인정보 처리방침 · 이용약관)와 정책 레이아웃은 이 상수만 참조한다.
 * 현재는 출시 전 개인 운영자(한상호) 기준 임시값. 사업자등록 완료 시
 * companyName·bizRegNo·address 를 법인/사업자 정보로 교체한다.
 * 페이지 본문에 절대 임의의 값을 하드코딩하지 않고 이 상수만 사용한다.
 */
export const FLORI_LEGAL = {
  /** 서비스 명칭 */
  serviceName: 'flori',
  /** 운영사 상호 (개인 운영 — 사업자등록 시 법인/사업자명으로 교체) */
  companyName: 'flori',
  /** 대표자명(운영자) */
  ceo: '한상호',
  /** 사업자등록번호 (사업자등록 후 기입) */
  bizRegNo: '개인 운영 (사업자등록 준비 중)',
  /** 운영자 소재지 (사업자등록 후 사업장 주소로 교체) */
  address: '서울특별시 강북구',
  /** 개인정보 보호책임자 */
  privacyOfficer: {
    name: '한상호',
    title: '운영자',
    email: 'support@flori.ai.kr',
  },
  /** 일반 문의 이메일 */
  contactEmail: 'support@flori.ai.kr',
  /** 개인정보 처리방침 시행일 (YYYY-MM-DD) — 문서 공개(개인정보 수집 시작)일 */
  privacyEffectiveDate: '2026-06-10',
  /** 서비스 이용약관 시행일 (YYYY-MM-DD) */
  termsEffectiveDate: '2026-06-10',
} as const

/** 분쟁/관할 관련 (이용약관에서 사용). */
export const FLORI_LEGAL_JURISDICTION = {
  /** 분쟁 발생 시 관할 법원 (운영자 소재지 기준 — 서울 강북구 → 서울북부지방법원) */
  court: '서울북부지방법원',
} as const
