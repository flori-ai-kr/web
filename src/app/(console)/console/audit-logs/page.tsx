import { listAuditLogs } from '@/lib/actions/admin-audit-logs';
import { AuditLogsClient } from './audit-logs-client';

export default async function AuditLogsPage() {
  const logs = await listAuditLogs();
  return <AuditLogsClient initial={logs} />;
}
