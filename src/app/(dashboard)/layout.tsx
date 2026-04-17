import {AppLayout} from '@/components/layout';
import {requireAuth} from '@/lib/auth-guard';
import {getUserPreferences} from '@/lib/actions/insights';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const prefs = await getUserPreferences();
  return (
    <AppLayout userEmail={user.email || ''} bottomNavItems={prefs.bottom_nav_items}>
      {children}
    </AppLayout>
  );
}
