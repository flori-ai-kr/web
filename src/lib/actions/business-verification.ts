'use server';

import {requireAuth} from '@/lib/auth-guard';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';
import {
  BUSINESS_LICENSE_TYPES,
  type BusinessVerification,
  type BusinessVerificationInput,
  type BusinessVerificationStatus,
} from '@/lib/business-verification';

// ─── 사업자 인증 Server Actions ─────────────────────────────────
// 서버: flori-ai/server BusinessVerificationController (/verification/business).
// 커뮤니티는 사업자 인증(APPROVED)된 사용자만 이용 가능. 1차 수동 검토.
// 공용 타입·상수는 lib/business-verification.ts 참조.

interface VerificationDto {
  status: string;
  rejectReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

interface UploadTargetDto {
  uploadUrl: string;
  fileUrl: string;
  expiresInSeconds: number;
}

function toVerification(dto: VerificationDto): BusinessVerification {
  return {
    status: (dto.status as BusinessVerificationStatus) || 'NONE',
    rejectReason: dto.rejectReason ?? null,
    submittedAt: dto.submittedAt ?? null,
    reviewedAt: dto.reviewedAt ?? null,
  };
}

// BFF: GET /verification/business/me
async function _getMyBusinessVerification(): Promise<BusinessVerification> {
  await requireAuth();
  const dto = await apiFetch<VerificationDto>('/verification/business/me');
  return toVerification(dto);
}

export const getMyBusinessVerification = withErrorLogging('getMyBusinessVerification', _getMyBusinessVerification);

// BFF: POST /verification/business/upload-target → presigned PUT 발급
async function _createBusinessLicenseUploadTarget(
  contentType: string,
): Promise<{ uploadUrl: string; fileUrl: string }> {
  await requireAuth();
  if (!BUSINESS_LICENSE_TYPES.includes(contentType)) {
    throw new AppError(ErrorCode.VALIDATION, '허용되지 않는 파일 형식입니다 (JPG/PNG/WEBP/PDF)');
  }
  const dto = await apiFetch<UploadTargetDto>('/verification/business/upload-target', {
    method: 'POST',
    body: JSON.stringify({ contentType }),
  });
  return { uploadUrl: dto.uploadUrl, fileUrl: dto.fileUrl };
}

export const createBusinessLicenseUploadTarget = withErrorLogging(
  'createBusinessLicenseUploadTarget',
  _createBusinessLicenseUploadTarget,
);

// BFF: POST /verification/business — 이미 PENDING/APPROVED면 409(E-VRF-002)
async function _submitBusinessVerification(input: BusinessVerificationInput): Promise<BusinessVerification> {
  await requireAuth();

  const businessNumber = input.businessNumber.replace(/\D/g, '');
  if (!/^\d{10}$/.test(businessNumber)) {
    throw new AppError(ErrorCode.VALIDATION, '사업자번호는 숫자 10자리여야 합니다');
  }
  if (!input.businessName.trim()) throw new AppError(ErrorCode.VALIDATION, '상호를 입력해주세요');
  if (!input.representativeName.trim()) throw new AppError(ErrorCode.VALIDATION, '대표자명을 입력해주세요');
  if (!input.businessLicenseUrl) throw new AppError(ErrorCode.VALIDATION, '사업자등록증을 업로드해주세요');
  // 발급받은 스토리지 URL만 허용(임의 URL 주입 방지). 서버도 E-VRF-003으로 소유권 재검증.
  const storageBase = process.env.STORAGE_PUBLIC_URL;
  if (storageBase && !input.businessLicenseUrl.startsWith(storageBase)) {
    throw new AppError(ErrorCode.VALIDATION, '허용되지 않은 등록증 URL입니다');
  }

  const dto = await apiFetch<VerificationDto>('/verification/business', {
    method: 'POST',
    body: JSON.stringify({
      businessNumber,
      businessName: input.businessName.trim(),
      representativeName: input.representativeName.trim(),
      businessLicenseUrl: input.businessLicenseUrl,
    }),
  });
  return toVerification(dto);
}

export const submitBusinessVerification = withErrorLogging('submitBusinessVerification', _submitBusinessVerification);
