import {DashboardClient} from './dashboard-client';
import {getDashboardTodayData, type DashboardTodayData} from '@/lib/actions/dashboard';

export default async function DashboardPage() {
  // 오늘 데이터는 서버에서 미리 채워 첫 페인트에 바로 보이게 한다(빈 스켈레톤 → 즉시 표시, LCP 개선).
  // 월별 데이터는 선택에 따라 바뀌므로 기존대로 클라이언트에서 조회한다.
  // 서버 조회 실패 시 undefined로 두면 클라이언트가 기존 방식으로 다시 시도한다.
  let initialToday: DashboardTodayData | undefined;
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
  return <DashboardClient initialToday={initialToday} />;
}
