'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AiHealthResponse } from '@/types/admin';

// BFF: GET /admin/health/ai (ai-server/litellm 헬스 프록시)
async function _getAiHealth(): Promise<AiHealthResponse> {
  await requireAdmin();
  return apiFetch<AiHealthResponse>('/admin/health/ai');
}
export const getAiHealth = withErrorLogging('getAiHealth', _getAiHealth);
