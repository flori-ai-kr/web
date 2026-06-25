'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type {
  MeResponse,
  PrepareResponse,
  RedeemResponse,
} from '@/types/billing';
import type { BillingPlan } from '@/types/billing';

// ─── 점주 빌링 Server Actions ────────────────────────────────────────
// BFF /billing/*, /coupons/redeem

const SETTINGS_PATH = '/admin/settings';

// BFF: GET /billing/prepare
async function _prepareBilling(): Promise<PrepareResponse> {
  await requireAuth();
  return apiFetch<PrepareResponse>('/billing/prepare');
}
export const prepareBilling = withErrorLogging('prepareBilling', _prepareBilling);

// BFF: POST /billing/subscribe
async function _subscribe(
  plan: BillingPlan,
  authKey: string,
  customerKey: string,
): Promise<void> {
  await requireAuth();
  await apiFetch('/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify({ plan, authKey, customerKey }),
  });
  revalidatePath(SETTINGS_PATH);
}
export const subscribe = withErrorLogging('subscribe', _subscribe);

// BFF: GET /billing/me
async function _getMyBilling(): Promise<MeResponse> {
  await requireAuth();
  return apiFetch<MeResponse>('/billing/me');
}
export const getMyBilling = withErrorLogging('getMyBilling', _getMyBilling);

// BFF: POST /billing/cancel
async function _cancelSubscription(): Promise<void> {
  await requireAuth();
  await apiFetch('/billing/cancel', { method: 'POST' });
  revalidatePath(SETTINGS_PATH);
}
export const cancelSubscription = withErrorLogging('cancelSubscription', _cancelSubscription);

// BFF: POST /billing/resume
async function _resumeSubscription(): Promise<void> {
  await requireAuth();
  await apiFetch('/billing/resume', { method: 'POST' });
  revalidatePath(SETTINGS_PATH);
}
export const resumeSubscription = withErrorLogging('resumeSubscription', _resumeSubscription);

// BFF: POST /billing/card
async function _changeCard(authKey: string, customerKey: string): Promise<void> {
  await requireAuth();
  await apiFetch('/billing/card', {
    method: 'POST',
    body: JSON.stringify({ authKey, customerKey }),
  });
  revalidatePath(SETTINGS_PATH);
}
export const changeCard = withErrorLogging('changeCard', _changeCard);

// BFF: POST /coupons/redeem
async function _redeemCoupon(code: string): Promise<RedeemResponse> {
  await requireAuth();
  const res = await apiFetch<RedeemResponse>('/coupons/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  revalidatePath(SETTINGS_PATH);
  return res;
}
export const redeemCoupon = withErrorLogging('redeemCoupon', _redeemCoupon);
