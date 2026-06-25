'use server';

import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import { requireAuth } from '@/lib/auth-guard';
import type { InquiryCategory, InquiryUploadTarget, MyInquiry } from '@/types/support';

async function _listMyInquiries(page = 0, size = 20): Promise<MyInquiry[]> {
  await requireAuth();
  return apiFetch<MyInquiry[]>(`/inquiries?page=${page}&size=${size}`);
}
export const listMyInquiries = withErrorLogging('listMyInquiries', _listMyInquiries);

async function _createInquiry(data: {
  category: InquiryCategory;
  title: string;
  body: string;
  imageUrls: string[];
}): Promise<MyInquiry> {
  await requireAuth();
  return apiFetch<MyInquiry>('/inquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export const createInquiry = withErrorLogging('createInquiry', _createInquiry);

async function _createInquiryUploadTargets(
  files: { name: string; type: string; size: number }[],
): Promise<InquiryUploadTarget[]> {
  await requireAuth();
  return apiFetch<InquiryUploadTarget[]>('/inquiries/upload-targets', {
    method: 'POST',
    body: JSON.stringify({ files }),
  });
}
export const createInquiryUploadTargets = withErrorLogging(
  'createInquiryUploadTargets',
  _createInquiryUploadTargets,
);
