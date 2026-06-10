// 사업자 인증 공용 타입·상수 (서버 액션이 아닌 곳에서도 import 가능).
// 서버 액션은 lib/actions/business-verification.ts ('use server') 에 있다.

export type BusinessVerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BusinessVerification {
  status: BusinessVerificationStatus;
  rejectReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface BusinessVerificationInput {
  businessNumber: string; // 하이픈 포함/제거 무관 — 전송 시 숫자 10자리로 정규화
  businessName: string;
  representativeName: string;
  businessLicenseUrl: string;
}

// 등록증 허용 형식 (서버 INVALID_LICENSE_TYPE과 동기화)
export const BUSINESS_LICENSE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
