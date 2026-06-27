import { listCoupons } from '@/lib/actions/admin-coupons';
import { CouponsClient } from './coupons-client';

export default async function CouponsPage() {
  const coupons = await listCoupons();
  return <CouponsClient initial={coupons} />;
}
