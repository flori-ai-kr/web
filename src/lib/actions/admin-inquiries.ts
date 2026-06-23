'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { InquiryStatus, SupportInquiry } from '@/types/admin';

function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 ID입니다');
  }
}

// BFF: GET /admin/inquiries?status=&page=&size=
async function _listInquiries(status?: InquiryStatus): Promise<SupportInquiry[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: '0', size: '50' });
  if (status) qs.set('status', status);
  return apiFetch<SupportInquiry[]>(`/admin/inquiries?${qs.toString()}`);
}
export const listInquiries = withErrorLogging('listInquiries', _listInquiries);

// BFF: GET /admin/inquiries/{id}
async function _getInquiry(id: number): Promise<SupportInquiry> {
  await requireAdmin();
  assertValidId(id);
  return apiFetch<SupportInquiry>(`/admin/inquiries/${id}`);
}
export const getInquiry = withErrorLogging('getInquiry', _getInquiry);

// BFF: POST /admin/inquiries/{id}/answer
async function _answerInquiry(
  id: number,
  answer: string,
  status?: InquiryStatus,
): Promise<SupportInquiry> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<SupportInquiry>(`/admin/inquiries/${id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer, status }),
  });
  revalidatePath('/console/inquiries');
  return res;
}
export const answerInquiry = withErrorLogging('answerInquiry', _answerInquiry);

// BFF: POST /admin/inquiries/{id}/status
async function _setInquiryStatus(id: number, status: InquiryStatus): Promise<SupportInquiry> {
  await requireAdmin();
  assertValidId(id);
  const res = await apiFetch<SupportInquiry>(`/admin/inquiries/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  revalidatePath('/console/inquiries');
  return res;
}
export const setInquiryStatus = withErrorLogging('setInquiryStatus', _setInquiryStatus);
