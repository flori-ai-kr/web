import {AppLayout} from '@/components/layout';
import {requireAuth} from '@/lib/auth-guard';
import {getUserPreferences} from '@/lib/actions/insights';

// @MX:NOTE: [AUTO] Entry point for the (admin)/admin/* route group; wraps every admin page in AppLayout (Sidebar + BottomNav) and enforces requireAuth().
// @MX:SPEC: SPEC-ROUTE-ADMIN-001
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
