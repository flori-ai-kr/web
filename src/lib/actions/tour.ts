'use server';

import {requireAuth} from '@/lib/auth-guard';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// ─── 제품 투어 완료 처리 ───────────────────────────────────────

async function _completeTour(): Promise<void> {
  await requireAuth();

  // 서버가 현재 사용자의 tour_completed 플래그를 true로 마킹한다 (204 No Content).
  await apiFetch<void>('/me/tour/complete', {method: 'POST'});
}

export const completeTour = withErrorLogging('completeTour', _completeTour);
