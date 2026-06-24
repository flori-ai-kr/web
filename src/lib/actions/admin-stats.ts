'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type {
  AdminOverview,
  ChurnReasonSlice,
  FunnelStage,
  RetentionCohortRow,
  StatRange,
  TimeseriesPoint,
} from '@/types/admin';

// 새 통계 엔드포인트 미배포(404) 시 빈 데이터로 graceful degrade.
async function degradeOn404<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError && e.code === ErrorCode.NOT_FOUND) return fallback;
    throw e;
  }
}

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

// BFF: GET /admin/stats/funnel (가입→온보딩→인증→승인→첫매출→활성)
async function _getAdminFunnel(): Promise<FunnelStage[]> {
  await requireAdmin();
  return degradeOn404(() => apiFetch<FunnelStage[]>('/admin/stats/funnel'), []);
}
export const getAdminFunnel = withErrorLogging('getAdminFunnel', _getAdminFunnel);

// BFF: GET /admin/stats/churn-reasons?days=
async function _getChurnReasons(days = 30): Promise<ChurnReasonSlice[]> {
  await requireAdmin();
  return degradeOn404(
    () => apiFetch<ChurnReasonSlice[]>(`/admin/stats/churn-reasons?days=${days}`),
    [],
  );
}
export const getChurnReasons = withErrorLogging('getChurnReasons', _getChurnReasons);

// BFF: GET /admin/stats/retention (주간 코호트)
async function _getRetention(): Promise<RetentionCohortRow[]> {
  await requireAdmin();
  return degradeOn404(() => apiFetch<RetentionCohortRow[]>('/admin/stats/retention'), []);
}
export const getRetention = withErrorLogging('getRetention', _getRetention);
