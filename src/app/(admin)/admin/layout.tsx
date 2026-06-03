import {AppLayout} from '@/components/layout';
import {requireAuth} from '@/lib/auth-guard';
import {getUserPreferences} from '@/lib/actions/insights';
import {AiChatLauncher} from '@/components/ai/ai-chat-launcher';

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
      {/* 전역 flori AI 채팅 드로어 (플로팅 진입) */}
      <AiChatLauncher />
    </AppLayout>
  );
}
