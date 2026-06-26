import type {Metadata} from 'next';
import {AppLayout} from '@/components/layout';
import {requireAuth} from '@/lib/auth-guard';
import {getUserPreferences} from '@/lib/actions/insights';
import {getMyBusinessVerification} from '@/lib/actions/business-verification';
import {getMyBilling} from '@/lib/actions/billing';
import {BusinessVerificationGate} from '@/app/(admin)/admin/community/components/business-verification-gate';
import {SubscriptionGate} from '@/app/(admin)/admin/billing/components/subscription-gate';
import {TrialStartGate} from '@/app/(admin)/admin/billing/components/trial-start-gate';
import {SubscriptionGraceBanner} from '@/app/(admin)/admin/components/subscription-grace-banner';
import {WelcomeGuideModal} from '@/components/onboarding/welcome-guide-modal';
import type {MeResponse} from '@/types/billing';
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
  // 빌링 조회는 fail-open: api 일시 장애로 전 점주가 잠기지 않도록 실패 시 null(=게이트 미적용)로 처리.
  const [user, prefs, verification, billing] = await Promise.all([
    requireAuth(),
    getUserPreferences(),
    getMyBusinessVerification(),
    getMyBilling().catch((): MeResponse | null => null),
  ]);

  // 사업자 인증 하드락: APPROVED 전에는 AppLayout(사이드바·헤더·하단탭) 없이
  // 풀스크린 게이트만 렌더 → 어떤 /admin 페이지로 가도 네비 없이 전체 블락된다.
  if (verification.status !== 'APPROVED') {
    return <BusinessVerificationGate initial={verification} />;
  }

  // 구독 게이트: 사업자 인증(APPROVED) 통과 후 구독 상태로 분기.
  // - billing 조회 실패(billing == null)는 fail-open → 게이트 적용하지 않고 통과.
  // - 구독 없음: 체험 가능(trialEligible)하면 무카드 체험 진입 게이트(TrialStartGate),
  //   체험 소진(trialEligible === false)이면 결제벽(SubscriptionGate). 토스 PG 미준비라 첫 진입은 무카드 체험.
  //   방어: 구 api가 trialEligible를 안 줄 수 있음 → undefined면 우선 체험 게이트(=== false일 때만 결제벽).
  // - EXPIRED: 체험 종료 후 결제벽(SubscriptionGate, 토스 카드).
  // - TRIALING·ACTIVE·IN_GRACE 는 모두 정상 진입(IN_GRACE는 상단 배너만 추가).
  const subscription = billing?.subscription ?? null;
  if (billing !== null) {
    if (subscription === null) {
      return billing.trialEligible !== false
        ? <TrialStartGate />
        : <SubscriptionGate status="NONE" />;
    }
    if (subscription.status === 'EXPIRED') {
      return <SubscriptionGate status="EXPIRED" />;
    }
  }

  return (
    <AppLayout userEmail={user.email || ''} userName={user.nickname || user.name || ''} userImage={user.profile?.profileImageUrl ?? undefined} bottomNavItems={prefs.bottom_nav_items}>
      {subscription?.status === 'IN_GRACE' && <SubscriptionGraceBanner />}
      {children}
      <WelcomeGuideModal />
      {/* [AI 기능 비활성화] 전역 flori AI 채팅 드로어 (플로팅 진입)
      <AiChatLauncher /> */}
    </AppLayout>
  );
}
