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
// 수집 항목: 이메일 + 가게명 (둘 다 필수). 중복 이메일·마감 판정은 BFF가 수행.
async function _submitWaitlist(input: {email: string; shopName: string}): Promise<WaitlistCount> {
  const parsed = waitlistSchema.safeParse({email: input.email.trim(), shop_name: input.shopName.trim()});
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요');
  }
  return apiFetch<WaitlistCount>('/waitlist', {
    method: 'POST',
    body: JSON.stringify({email: parsed.data.email, shopName: parsed.data.shop_name}),
  });
}
export const submitWaitlist = withErrorLogging('submitWaitlist', _submitWaitlist);
