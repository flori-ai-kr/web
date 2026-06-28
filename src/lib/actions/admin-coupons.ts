'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type {
  CouponDetailResponse,
  CouponIssueInput,
  CouponResponse,
  CouponUpdateInput,
} from '@/types/billing';

// ─── 콘솔 쿠폰 Server Actions ────────────────────────────────────────
// BFF /admin/coupons/*

const COUPONS_PATH = '/console/coupons';

// BFF: GET /admin/coupons
async function _listCoupons(): Promise<CouponResponse[]> {
  await requireAdmin();
  return apiFetch<CouponResponse[]>('/admin/coupons');
}
export const listCoupons = withErrorLogging('listCoupons', _listCoupons);

// BFF: POST /admin/coupons
async function _issueCoupon(input: CouponIssueInput): Promise<CouponResponse> {
  await requireAdmin();
  const res = await apiFetch<CouponResponse>('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(COUPONS_PATH);
  return res;
}
export const issueCoupon = withErrorLogging('issueCoupon', _issueCoupon);

// BFF: PATCH /admin/coupons/{id} (code·source는 수정 불가 — 바디에 포함하지 않음)
async function _updateCoupon(
  id: number,
  input: CouponUpdateInput,
): Promise<CouponResponse> {
  await requireAdmin();
  const res = await apiFetch<CouponResponse>(`/admin/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath(COUPONS_PATH);
  revalidatePath(`${COUPONS_PATH}/${id}`);
  return res;
}
export const updateCoupon = withErrorLogging('updateCoupon', _updateCoupon);

// BFF: GET /admin/coupons/{id}
async function _couponDetail(id: number): Promise<CouponDetailResponse> {
  await requireAdmin();
  return apiFetch<CouponDetailResponse>(`/admin/coupons/${id}`);
}
export const couponDetail = withErrorLogging('couponDetail', _couponDetail);

// BFF: POST /admin/coupons/{id}/disable
async function _disableCoupon(id: number): Promise<void> {
  await requireAdmin();
  await apiFetch(`/admin/coupons/${id}/disable`, { method: 'POST' });
  revalidatePath(COUPONS_PATH);
}
export const disableCoupon = withErrorLogging('disableCoupon', _disableCoupon);
