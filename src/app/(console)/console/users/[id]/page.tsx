import { notFound } from 'next/navigation';
import { getAdminUserDetail } from '@/lib/actions/admin-users';
import { UserDetailClient } from './user-detail-client';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  const detail = await getAdminUserDetail(userId);
  return <UserDetailClient detail={detail} />;
}
