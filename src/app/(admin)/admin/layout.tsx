import type {Metadata} from 'next';
import {AppLayout} from '@/components/layout';
import {requireAuth} from '@/lib/auth-guard';
import {getUserPreferences} from '@/lib/actions/insights';
import {AiChatLauncher} from '@/components/ai/ai-chat-launcher';

// 어드민 페이지 탭 타이틀: 페이지가 title을 주면 "<title> · flori", 없으면 default.
export const metadata: Metadata = {
  title: {template: '%s · flori', default: 'flori 어드민'},
};

// @MX:NOTE: [AUTO] Entry point for the (admin)/admin/* route group; wraps every admin page in AppLayout (Sidebar + BottomNav) and enforces requireAuth().
// @MX:SPEC: SPEC-ROUTE-ADMIN-001
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 두 조회는 독립적이므로 병렬화(워터폴 제거).
  const [user, prefs] = await Promise.all([requireAuth(), getUserPreferences()]);
  return (
    <AppLayout userEmail={user.email || ''} bottomNavItems={prefs.bottom_nav_items}>
      {children}
      {/* 전역 flori AI 채팅 드로어 (플로팅 진입) */}
      <AiChatLauncher />
    </AppLayout>
  );
}
