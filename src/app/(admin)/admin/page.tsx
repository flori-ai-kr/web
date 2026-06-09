import {DashboardClient} from './dashboard-client';
import {getDashboardTodayData, getDashboardMonthData, type DashboardTodayData, type DashboardMonthData} from '@/lib/actions/dashboard';
import {getLatestCommunityPosts, type LatestCommunityPost} from '@/lib/actions/community';
import {getCurrentMonthKST} from '@/lib/utils';
import {requireAuth} from '@/lib/auth-guard';
import {getDashboardGreeting} from '@/lib/greeting';

export default async function DashboardPage() {
  // 오늘 데이터는 서버에서 미리 채워 첫 페인트에 바로 보이게 한다(빈 스켈레톤 → 즉시 표시, LCP 개선).
  // 서버 조회 실패 시 undefined로 두면 클라이언트가 기존 방식으로 다시 시도한다.
  let initialToday: DashboardTodayData | undefined;
  let initialMonth: DashboardMonthData | undefined;
  let initialCommunityPosts: LatestCommunityPost[] = [];

  const currentMonth = getCurrentMonthKST();

  // 인사말은 닉네임(없으면 이름) 기준 + KST 시간대로 서버에서 계산해 하이드레이션 불일치를 피한다.
  const user = await requireAuth();
  const {greeting, quote} = getDashboardGreeting(user.nickname?.trim() || user.name);

  try {
    initialToday = await getDashboardTodayData();
  } catch (e) {
    // redirect()/notFound() 등 Next 내부 제어 에러는 삼키지 말고 전파(인증 리다이렉트 보존).
    if (
      e &&
      typeof e === 'object' &&
      'digest' in e &&
      typeof (e as { digest: unknown }).digest === 'string' &&
      (e as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw e;
    }
    initialToday = undefined;
  }

  try {
    initialMonth = await getDashboardMonthData(currentMonth);
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'digest' in e &&
      typeof (e as { digest: unknown }).digest === 'string' &&
      (e as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw e;
    }
    initialMonth = undefined;
  }

  try {
    initialCommunityPosts = await getLatestCommunityPosts(4);
  } catch {
    // 커뮤니티 게이트(미인증/미배포) 실패 시 대시보드 크래시 방지 — 빈 배열로 폴백
    initialCommunityPosts = [];
  }

  return (
    <DashboardClient
      greeting={greeting}
      quote={quote}
      initialToday={initialToday}
      initialMonth={initialMonth}
      initialCommunityPosts={initialCommunityPosts}
    />
  );
}
