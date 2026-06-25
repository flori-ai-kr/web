'use server';

import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { JobRunLog, JobRunSummary } from '@/types/admin';

// BFF: GET /admin/job-runs/summary — 작업별 최신 상태(카드).
async function _getJobRunSummary(): Promise<JobRunSummary[]> {
  await requireAdmin();
  return apiFetch<JobRunSummary[]>('/admin/job-runs/summary');
}
export const getJobRunSummary = withErrorLogging('getJobRunSummary', _getJobRunSummary);

export interface JobRunFilters {
  jobName?: string;
  status?: string;
}

// BFF: GET /admin/job-runs?jobName=&status=&page=&size=
async function _listJobRuns(filters: JobRunFilters = {}, page = 0): Promise<JobRunLog[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: String(page), size: '50' });
  if (filters.jobName) qs.set('jobName', filters.jobName);
  if (filters.status) qs.set('status', filters.status);
  return apiFetch<JobRunLog[]>(`/admin/job-runs?${qs.toString()}`);
}
export const listJobRuns = withErrorLogging('listJobRuns', _listJobRuns);

// BFF: POST /admin/job-runs/{jobName}/trigger — 즉시 실행 후 최신 상태 반환.
async function _triggerJob(jobName: string): Promise<JobRunSummary> {
  await requireAdmin();
  return apiFetch<JobRunSummary>(`/admin/job-runs/${encodeURIComponent(jobName)}/trigger`, {
    method: 'POST',
  });
}
export const triggerJob = withErrorLogging('triggerJob', _triggerJob);
