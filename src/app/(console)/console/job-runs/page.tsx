import { getJobRunSummary, listJobRuns } from '@/lib/actions/admin-job-runs';
import { listNotificationLogs } from '@/lib/actions/admin-notification-logs';
import { JobRunsTabs } from './job-runs-tabs';

export default async function JobRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [summary, logs, notifLogs] = await Promise.all([
    getJobRunSummary(),
    listJobRuns(),
    listNotificationLogs(),
  ]);
  return (
    <JobRunsTabs
      defaultTab={tab === 'notifications' ? 'notifications' : 'runs'}
      summary={summary}
      logs={logs}
      notifLogs={notifLogs}
    />
  );
}
