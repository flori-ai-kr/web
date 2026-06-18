import type {Metadata} from 'next';
import {AppLayout} from '@/components/layout';
import {requireAuth} from '@/lib/auth-guard';
import {getUserPreferences} from '@/lib/actions/insights';
import {getMyBusinessVerification} from '@/lib/actions/business-verification';
import {BusinessVerificationGate} from '@/app/(admin)/admin/community/components/business-verification-gate';
import {WelcomeGuideModal} from '@/components/onboarding/welcome-guide-modal';
// [AI 기능 비활성화] import {AiChatLauncher} from '@/components/ai/ai-chat-launcher';

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
  // 조회들은 독립적이므로 병렬화(워터폴 제거). requireAuth가 온보딩 게이트(→/onboarding)도 수행.
  const [user, prefs, verification] = await Promise.all([
    requireAuth(),
    getUserPreferences(),
    getMyBusinessVerification(),
  ]);

  // 사업자 인증 하드락: APPROVED 전에는 AppLayout(사이드바·헤더·하단탭) 없이
  // 풀스크린 게이트만 렌더 → 어떤 /admin 페이지로 가도 네비 없이 전체 블락된다.
  if (verification.status !== 'APPROVED') {
    return <BusinessVerificationGate initial={verification} />;
  }

  return (
    <AppLayout userEmail={user.email || ''} userName={user.nickname || user.name || ''} userImage={user.profile?.profileImageUrl ?? undefined} bottomNavItems={prefs.bottom_nav_items}>
      {children}
      <WelcomeGuideModal />
      {/* [AI 기능 비활성화] 전역 flori AI 채팅 드로어 (플로팅 진입)
      <AiChatLauncher /> */}
    </AppLayout>
  );
}
