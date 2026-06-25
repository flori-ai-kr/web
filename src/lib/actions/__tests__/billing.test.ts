import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth-guard', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { apiFetch } from '@/lib/api/client';
import {
  prepareBilling,
  subscribe,
  getMyBilling,
  cancelSubscription,
  resumeSubscription,
  changeCard,
  redeemCoupon,
} from '../billing';

const mockApiFetch = vi.mocked(apiFetch);
const mockRequireAuth = vi.mocked(requireAuth);
const mockRevalidate = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockRequireAuth.mockResolvedValue(undefined as never);
});

describe('prepareBilling', () => {
  it('GET /billing/prepare 호출', async () => {
    mockApiFetch.mockResolvedValue({ customerKey: 'ck_test_123' });
    const res = await prepareBilling();
    expect(mockApiFetch).toHaveBeenCalledWith('/billing/prepare');
    expect(res).toEqual({ customerKey: 'ck_test_123' });
  });
});

describe('subscribe', () => {
  it('POST /billing/subscribe + revalidate /admin/settings', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await subscribe('MONTHLY', 'auth_key_abc', 'ck_test_123');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/billing/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ plan: 'MONTHLY', authKey: 'auth_key_abc', customerKey: 'ck_test_123' }),
      }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/settings');
  });

  it('YEARLY 플랜도 올바른 body로 호출', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await subscribe('YEARLY', 'auth_key_xyz', 'ck_test_456');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/billing/subscribe',
      expect.objectContaining({
        body: JSON.stringify({ plan: 'YEARLY', authKey: 'auth_key_xyz', customerKey: 'ck_test_456' }),
      }),
    );
  });
});

describe('getMyBilling', () => {
  it('GET /billing/me 호출하고 MeResponse 반환', async () => {
    const mockResponse = {
      subscription: {
        plan: 'MONTHLY',
        status: 'ACTIVE',
        currentPeriodEnd: '2026-07-25T00:00:00Z',
        nextBillingAt: '2026-07-25T00:00:00Z',
        cancelAtPeriodEnd: false,
        card: { company: '신한', numberMasked: '1234****5678', cardType: 'CREDIT' },
      },
      recentPayments: [],
    };
    mockApiFetch.mockResolvedValue(mockResponse);
    const res = await getMyBilling();
    expect(mockApiFetch).toHaveBeenCalledWith('/billing/me');
    expect(res).toEqual(mockResponse);
  });

  it('subscription이 null인 경우도 처리', async () => {
    mockApiFetch.mockResolvedValue({ subscription: null, recentPayments: [] });
    const res = await getMyBilling();
    expect(res.subscription).toBeNull();
    expect(res.recentPayments).toEqual([]);
  });
});

describe('cancelSubscription', () => {
  it('POST /billing/cancel + revalidate /admin/settings', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await cancelSubscription();
    expect(mockApiFetch).toHaveBeenCalledWith('/billing/cancel', { method: 'POST' });
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/settings');
  });
});

describe('resumeSubscription', () => {
  it('POST /billing/resume + revalidate /admin/settings', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await resumeSubscription();
    expect(mockApiFetch).toHaveBeenCalledWith('/billing/resume', { method: 'POST' });
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/settings');
  });
});

describe('changeCard', () => {
  it('POST /billing/card + revalidate /admin/settings', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await changeCard('auth_key_new', 'ck_test_789');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/billing/card',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ authKey: 'auth_key_new', customerKey: 'ck_test_789' }),
      }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/settings');
  });
});

describe('redeemCoupon', () => {
  it('POST /coupons/redeem + revalidate /admin/settings', async () => {
    const mockRedeemRes = { grantedDays: 30, nextBillingAt: '2026-07-25T00:00:00Z', pending: false };
    mockApiFetch.mockResolvedValue(mockRedeemRes);
    const res = await redeemCoupon('PROMO2026');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/coupons/redeem',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'PROMO2026' }),
      }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('/admin/settings');
    expect(res).toEqual(mockRedeemRes);
  });

  it('pending 쿠폰 응답도 올바르게 반환', async () => {
    const mockPendingRes = { grantedDays: 0, nextBillingAt: null, pending: true };
    mockApiFetch.mockResolvedValue(mockPendingRes);
    const res = await redeemCoupon('PENDING_CODE');
    expect(res.pending).toBe(true);
    expect(res.nextBillingAt).toBeNull();
  });
});
