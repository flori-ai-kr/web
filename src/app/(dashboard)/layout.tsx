import { AppLayout } from '@/components/layout';
import { requireAuth } from '@/lib/auth-guard';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  return <AppLayout userEmail={user.email || ''}>{children}</AppLayout>;
}
