'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobRunsClient } from './job-runs-client';
import { NotificationLogsClient } from '../notification-logs/notification-logs-client';
import type { JobRunLog, JobRunSummary, NotificationLog } from '@/types/admin';

export function JobRunsTabs({
  defaultTab,
  summary,
  logs,
  notifLogs,
}: {
  defaultTab: 'runs' | 'notifications';
  summary: JobRunSummary[];
  logs: JobRunLog[];
  notifLogs: NotificationLog[];
}) {
  const [tab, setTab] = useState<string>(defaultTab);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="runs">작업 실행</TabsTrigger>
        <TabsTrigger value="notifications">알림 발송</TabsTrigger>
      </TabsList>
      <TabsContent value="runs">
        <JobRunsClient initialSummary={summary} initialLogs={logs} />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationLogsClient initial={notifLogs} />
      </TabsContent>
    </Tabs>
  );
}
