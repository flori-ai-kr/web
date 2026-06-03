import { notFound } from 'next/navigation';
import { getAdminUserDetail } from '@/lib/actions/admin-users';
import { AppError, ErrorCode } from '@/lib/errors';
import type { AdminUserDetail } from '@/types/admin';
import { UserDetailClient } from './user-detail-client';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  let detail: AdminUserDetail;
  try {
    detail = await getAdminUserDetail(userId);
  } catch (e) {
    if (e instanceof AppError && (e.code === ErrorCode.NOT_FOUND || e.code === ErrorCode.VALIDATION)) {
      notFound();
    }
    throw e;
  }
  return <UserDetailClient detail={detail} />;
}
