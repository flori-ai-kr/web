import { notFound } from 'next/navigation';
import { couponDetail } from '@/lib/actions/admin-coupons';
import { AppError, ErrorCode } from '@/lib/errors';
import type { CouponDetailResponse } from '@/types/billing';
import { CouponDetailClient } from './coupon-detail-client';

export default async function CouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const couponId = Number(id);
  if (!Number.isInteger(couponId) || couponId <= 0) notFound();

  let detail: CouponDetailResponse;
  try {
    detail = await couponDetail(couponId);
  } catch (e) {
    if (e instanceof AppError && (e.code === ErrorCode.NOT_FOUND || e.code === ErrorCode.VALIDATION)) {
      notFound();
    }
    throw e;
  }

  return <CouponDetailClient detail={detail} />;
}
