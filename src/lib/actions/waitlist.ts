'use server';

import {apiFetch} from '@/lib/api/client';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {waitlistSchema} from '@/lib/validations';

// ─── 사전등록 Server Actions ─────────────────────────────────
// BFF WaitlistController (/waitlist) — 공개 엔드포인트(JWT 불필요).
// apiFetch는 토큰이 없으면 Authorization 없이 호출하며, 공개 엔드포인트는 401을 내지 않는다.

export interface WaitlistCount {
  count: number;
  capacity: number;
  closed: boolean;
}

// BFF: GET /waitlist/count
async function _getWaitlistCount(): Promise<WaitlistCount> {
  return apiFetch<WaitlistCount>('/waitlist/count');
}
export const getWaitlistCount = withErrorLogging('getWaitlistCount', _getWaitlistCount);

// BFF: POST /waitlist
async function _submitWaitlist(input: {shopName: string; phone: string}): Promise<WaitlistCount> {
  const parsed = waitlistSchema.safeParse({shop_name: input.shopName, phone: input.phone});
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요');
  }
  return apiFetch<WaitlistCount>('/waitlist', {
    method: 'POST',
    body: JSON.stringify({shopName: parsed.data.shop_name, phone: parsed.data.phone}),
  });
}
export const submitWaitlist = withErrorLogging('submitWaitlist', _submitWaitlist);
