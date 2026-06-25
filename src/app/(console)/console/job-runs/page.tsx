import { getJobRunSummary, listJobRuns } from '@/lib/actions/admin-job-runs';
import { JobRunsClient } from './job-runs-client';

export default async function JobRunsPage() {
  const [summary, logs] = await Promise.all([getJobRunSummary(), listJobRuns()]);
  return <JobRunsClient initialSummary={summary} initialLogs={logs} />;
}
