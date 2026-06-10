/**
 * flori 서비스 운영사 법적 정보 SSOT.
 *
 * 정책 페이지(개인정보 처리방침 · 이용약관)와 정책 레이아웃은 이 상수만 참조한다.
 * 회사 특정값(상호·대표·등록번호·주소·보호책임자·문의처)은 실제 값 확정 전까지 [TODO]
 * placeholder로 유지하며, 페이지 본문에 절대 임의의 값을 하드코딩하지 않는다.
 */
export const FLORI_LEGAL = {
  /** 서비스 명칭 */
  serviceName: 'flori',
  /** 운영사 상호 (법인/사업자명) */
  companyName: '[TODO: 운영사 상호]',
  /** 대표자명 */
  ceo: '[TODO: 대표자명]',
  /** 사업자등록번호 */
  bizRegNo: '[TODO: 사업자등록번호]',
  /** 사업장 주소 */
  address: '[TODO: 사업장 주소]',
  /** 개인정보 보호책임자 */
  privacyOfficer: {
    name: '[TODO: 개인정보 보호책임자명]',
    title: '[TODO: 직책]',
    email: '[TODO: 이메일]',
  },
  /** 일반 문의 이메일 */
  contactEmail: '[TODO: 문의 이메일]',
  /** 개인정보 처리방침 시행일 (YYYY-MM-DD) */
  privacyEffectiveDate: '2026-05-27',
  /** 서비스 이용약관 시행일 (YYYY-MM-DD) */
  termsEffectiveDate: '2026-05-27',
} as const

/** 분쟁/관할 관련 placeholder (이용약관에서 사용). */
export const FLORI_LEGAL_JURISDICTION = {
  /** 분쟁 발생 시 관할 법원 */
  court: '[TODO: 관할법원]',
} as const
