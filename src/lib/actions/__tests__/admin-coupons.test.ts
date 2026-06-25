import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import {
  listCoupons,
  issueCoupon,
  couponDetail,
  disableCoupon,
} from '../admin-coupons';
import type { CouponResponse } from '@/types/billing';

const mockApiFetch = vi.mocked(apiFetch);
const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRevalidate = vi.mocked(revalidatePath);

const mockCoupon: CouponResponse = {
  id: 1,
  code: 'PROMO2026',
  days: 30,
  status: 'ACTIVE',
  effectiveStatus: 'ACTIVE',
  redeemedCount: 0,
  maxRedemptions: null,
  perUserLimit: 1,
  validFrom: null,
  validUntil: null,
  source: 'PROMO',
  memo: null,
  createdAt: '2026-06-25T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockRequireAdmin.mockResolvedValue(undefined as never);
});

describe('listCoupons', () => {
  it('GET /admin/coupons 호출', async () => {
    mockApiFetch.mockResolvedValue([mockCoupon]);
    const res = await listCoupons();
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/coupons');
    expect(res).toHaveLength(1);
  });
});

describe('issueCoupon', () => {
  it('POST /admin/coupons + revalidate /console/coupons', async () => {
    mockApiFetch.mockResolvedValue(mockCoupon);
    const input = { days: 30, perUserLimit: 1, source: 'PROMO' };
    await issueCoupon(input);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/admin/coupons',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('/console/coupons');
  });

  it('code/memo/validUntil 포함 발급', async () => {
    mockApiFetch.mockResolvedValue(mockCoupon);
    const input = {
      code: 'SPECIAL',
      days: 14,
      validFrom: '2026-07-01T00:00:00Z',
      validUntil: '2026-07-31T23:59:59Z',
      maxRedemptions: 100,
      perUserLimit: 1,
      source: 'PROMO',
      memo: '특별 프로모션',
    };
    await issueCoupon(input);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/admin/coupons',
      expect.objectContaining({ body: JSON.stringify(input) }),
    );
  });
});

describe('couponDetail', () => {
  it('GET /admin/coupons/{id} 호출', async () => {
    const mockDetail = { coupon: mockCoupon, redemptions: [] };
    mockApiFetch.mockResolvedValue(mockDetail);
    const res = await couponDetail(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/coupons/1');
    expect(res.coupon).toEqual(mockCoupon);
    expect(res.redemptions).toEqual([]);
  });

  it('환급 기록 포함 응답', async () => {
    const mockDetail = {
      coupon: mockCoupon,
      redemptions: [{ userId: 42, grantedDays: 30, redeemedAt: '2026-06-25T10:00:00Z' }],
    };
    mockApiFetch.mockResolvedValue(mockDetail);
    const res = await couponDetail(1);
    expect(res.redemptions).toHaveLength(1);
    expect(res.redemptions[0].userId).toBe(42);
  });
});

describe('disableCoupon', () => {
  it('POST /admin/coupons/{id}/disable + revalidate /console/coupons', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await disableCoupon(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/coupons/1/disable', { method: 'POST' });
    expect(mockRevalidate).toHaveBeenCalledWith('/console/coupons');
  });
});
