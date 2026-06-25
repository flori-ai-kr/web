'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/console/status-badge';
import {
  getJobRunSummary,
  listJobRuns,
  triggerJob,
  type JobRunFilters,
} from '@/lib/actions/admin-job-runs';
import type { JobRunLog, JobRunStatus, JobRunSummary } from '@/types/admin';

const PAGE_SIZE = 50;
const ALL = 'all';

// 작업명 → 한글 라벨·주기·설명 (백엔드 JobNames 상수와 1:1).
const JOB_META: Record<string, { label: string; schedule: string; desc: string }> = {
  flower_auction_ingest: { label: '경매시세 적재', schedule: '매일 06:30', desc: 'aT 화훼공판장 경락가' },
  support_program_ingest: { label: 'K-Startup 적재', schedule: '매일 06:31', desc: 'K-Startup 공고' },
  bizinfo_ingest: { label: '비즈인포 적재', schedule: '매일 06:32', desc: '기업마당(비즈인포) 공고' },
  reservation_reminder: { label: '픽업 리마인더', schedule: '5분마다', desc: '예약 리마인더 푸시' },
  daily_pickup_summary: { label: '일일 픽업 요약', schedule: '매일 08:00', desc: '당일 예약 요약 푸시' },
  recurring_expense_generate: { label: '고정비 자동생성', schedule: '매일 00:30', desc: '반복 지출 생성' },
};

function jobLabel(jobName: string) {
  return JOB_META[jobName]?.label ?? jobName;
}

const STATUS_META: Record<JobRunStatus, { tone: 'success' | 'danger' | 'warning'; label: string }> = {
  success: { tone: 'success', label: '성공' },
  failed: { tone: 'danger', label: '실패' },
  skipped: { tone: 'warning', label: '건너뜀' },
};

const STATUS_DOT: Record<string, string> = {
  success: 'bg-emerald-500',
  failed: 'bg-red-500',
  skipped: 'bg-amber-500',
};

const STATUS_OPTIONS = [
  { value: ALL, label: '상태 전체' },
  { value: 'success', label: '성공' },
  { value: 'failed', label: '실패' },
  { value: 'skipped', label: '건너뜀' },
];

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  // 고정 timeZone(KST) + formatToParts 로 서버/클라 동일 출력(하이드레이션 불일치 방지).
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
}

function formatDuration(ms: number | null) {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function JobRunsClient({
  initialSummary,
  initialLogs,
}: {
  initialSummary: JobRunSummary[];
  initialLogs: JobRunLog[];
}) {
  const [summary, setSummary] = useState<JobRunSummary[]>(initialSummary);
  const [rows, setRows] = useState<JobRunLog[]>(initialLogs);
  const [jobFilter, setJobFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialLogs.length >= PAGE_SIZE);
  const [pending, startTransition] = useTransition();
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const buildFilters = (job: string, status: string): JobRunFilters => ({
    jobName: job === ALL ? undefined : job,
    status: status === ALL ? undefined : status,
  });

  const reload = (job: string, status: string) => {
    startTransition(async () => {
      const next = await listJobRuns(buildFilters(job, status), 0);
      setRows(next);
      setPage(0);
      setHasMore(next.length >= PAGE_SIZE);
    });
  };

  const onJobChange = (v: string) => {
    setJobFilter(v);
    reload(v, statusFilter);
  };
  const onStatusChange = (v: string) => {
    setStatusFilter(v);
    reload(jobFilter, v);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    startTransition(async () => {
      const more = await listJobRuns(buildFilters(jobFilter, statusFilter), nextPage);
      setRows((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(more.length >= PAGE_SIZE);
    });
  };

  const handleRun = (jobName: string) => {
    setRunningJob(jobName);
    startTransition(async () => {
      try {
        const updated = await triggerJob(jobName);
        setSummary((prev) => prev.map((s) => (s.jobName === jobName ? updated : s)));
        toast.success(`${jobLabel(jobName)} 실행 완료`);
        // 방금 실행이 이력에 반영되도록 현재 필터로 갱신
        const next = await listJobRuns(buildFilters(jobFilter, statusFilter), 0);
        setRows(next);
        setPage(0);
        setHasMore(next.length >= PAGE_SIZE);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '실행 실패');
      } finally {
        setRunningJob(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">작업 로그</h1>

      {/* 작업별 상태 카드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((s) => {
          const meta = JOB_META[s.jobName];
          const isRunning = runningJob === s.jobName;
          return (
            <div key={s.jobName} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${s.lastStatus ? STATUS_DOT[s.lastStatus] : 'bg-muted-foreground/40'}`}
                      aria-hidden
                    />
                    <p className="truncate text-sm font-medium text-foreground">
                      {meta?.label ?? s.jobName}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta?.schedule ?? '-'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRun(s.jobName)}
                >
                  {isRunning ? '실행 중…' : '지금 실행'}
                </Button>
              </div>
              <dl className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">마지막 실행</dt>
                  <dd className="tabular-nums text-foreground">{formatDateTime(s.lastRunAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">처리 / 소요</dt>
                  <dd className="tabular-nums text-foreground">
                    {s.lastRunAt ? `${s.lastProcessedCount}건 · ${formatDuration(s.lastDurationMs)}` : '실행 이력 없음'}
                  </dd>
                </div>
                {s.lastStatus === 'failed' && s.lastErrorMessage ? (
                  <p className="truncate pt-0.5 text-red-500" title={s.lastErrorMessage}>
                    {s.lastErrorMessage}
                  </p>
                ) : null}
              </dl>
            </div>
          );
        })}
      </div>

      {/* 실행 이력 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={jobFilter} onValueChange={onJobChange}>
            <SelectTrigger className="w-44 bg-card">
              <SelectValue placeholder="작업" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>작업 전체</SelectItem>
              {summary.map((s) => (
                <SelectItem key={s.jobName} value={s.jobName}>
                  {jobLabel(s.jobName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-36 bg-card">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>작업</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>트리거</TableHead>
                <TableHead className="text-right">처리</TableHead>
                <TableHead className="text-right">소요</TableHead>
                <TableHead>시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    실행 이력이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((log) => (
                  <TableRow key={log.id} className="align-top">
                    <TableCell className="text-foreground">{jobLabel(log.jobName)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_META[log.status]?.tone ?? 'muted'}>
                        {STATUS_META[log.status]?.label ?? log.status}
                      </StatusBadge>
                      {log.status === 'failed' && log.errorMessage ? (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-destructive" title={log.errorMessage}>
                          {log.errorMessage}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={log.trigger === 'manual' ? 'info' : 'muted'}>
                        {log.trigger === 'manual' ? '수동' : '스케줄'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">{log.processedCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatDuration(log.durationMs)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {hasMore && rows.length > 0 ? (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" disabled={pending} onClick={loadMore}>
              {pending ? '불러오는 중…' : '더 보기'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
