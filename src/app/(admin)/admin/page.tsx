import {DashboardClient} from './dashboard-client';
import {getDashboardTodayData, getDashboardMonthData, type DashboardTodayData, type DashboardMonthData} from '@/lib/actions/dashboard';
import {getLatestCommunityPosts, type LatestCommunityPost} from '@/lib/actions/community';
import {getCurrentMonthKST} from '@/lib/utils';
import {requireAuth} from '@/lib/auth-guard';
import {getDashboardGreeting} from '@/lib/greeting';
import {safe} from '@/lib/server-safe';

export default async function DashboardPage() {
  const currentMonth = getCurrentMonthKST();

  // 인사말은 닉네임(없으면 이름) 기준 + KST 시간대로 서버에서 계산해 하이드레이션 불일치를 피한다.
  // requireAuth()는 cache()로 디듀프되므로, 아래 액션들이 내부에서 다시 호출해도 /me는 1회.
  const user = await requireAuth();
  const greeting = getDashboardGreeting(user.nickname?.trim() || user.name);

  // 서로 독립적인 3개 조회를 병렬화(기존 3연속 await 워터폴 제거). 각 결과는 개별 폴백 유지.
  // 오늘 데이터는 서버에서 미리 채워 첫 페인트에 바로 보이게 한다(LCP). 실패 시 undefined → 클라가 재시도.
  const [initialToday, initialMonth, initialCommunityPosts] = await Promise.all([
    safe<DashboardTodayData | undefined>(() => getDashboardTodayData(), undefined),
    safe<DashboardMonthData | undefined>(() => getDashboardMonthData(currentMonth), undefined),
    // 커뮤니티 게이트(미인증/미배포) 실패 시 대시보드 크래시 방지 — 빈 배열로 폴백
    safe<LatestCommunityPost[]>(() => getLatestCommunityPosts(8), []),
  ]);

  return (
    <DashboardClient
      greeting={greeting}
      nowISO={new Date().toISOString()}
      initialToday={initialToday}
      initialMonth={initialMonth}
      initialCommunityPosts={initialCommunityPosts}
    />
  );
}
