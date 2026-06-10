'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { AdminOverview, StatRange, TimeseriesPoint } from '@/types/admin';

// BFF: GET /admin/stats/overview?range= (cross-tenant 집계 + 기간대비 비교)
// 서버가 range/comparison 미지원이면 무시되고 기본 집계만 반환된다(하위호환).
async function _getAdminOverview(range: StatRange = '30d'): Promise<AdminOverview> {
  await requireAdmin();
  return apiFetch<AdminOverview>(`/admin/stats/overview?range=${range}`);
}
export const getAdminOverview = withErrorLogging('getAdminOverview', _getAdminOverview);

// BFF: GET /admin/stats/timeseries?metric=&range=
// 서버 보강 전(엔드포인트 부재)이면 빈 배열로 graceful degrade → 차트가 "데이터 없음"을 표시.
async function _getTimeseries(metric: 'signups' | 'sales', range: StatRange = '30d'): Promise<TimeseriesPoint[]> {
  await requireAdmin();
  try {
    return await apiFetch<TimeseriesPoint[]>(`/admin/stats/timeseries?metric=${metric}&range=${range}`);
  } catch (e) {
    // 엔드포인트 미배포(404)만 빈 차트로 degrade. 인증실패/5xx는 전파해 에러로깅·바운더리로.
    if (e instanceof AppError && e.code === ErrorCode.NOT_FOUND) return [];
    throw e;
  }
}
export const getTimeseries = withErrorLogging('getTimeseries', _getTimeseries);
