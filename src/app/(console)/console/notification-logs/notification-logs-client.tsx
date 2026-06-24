'use client';

import { useState, useTransition } from 'react';
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
  listNotificationLogs,
  type NotificationLogFilters,
} from '@/lib/actions/admin-notification-logs';
import type { NotificationLog, NotificationSendStatus } from '@/types/admin';

const PAGE_SIZE = 50;

const ALL = 'all';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: '전체' },
  { value: 'broadcast', label: '마케팅/캠페인' },
  { value: 'reservation_reminder', label: '예약 리마인더' },
  { value: 'notice', label: '공지' },
  { value: 'business_verification', label: '사업자 인증' },
];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: '전체' },
  { value: 'web', label: '웹' },
  { value: 'cron', label: '스케줄러' },
  { value: 'system', label: '시스템' },
  { value: 'alimtalk', label: '알림톡' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: '전체' },
  { value: 'sent', label: '성공' },
  { value: 'failed', label: '실패' },
  { value: 'partial', label: '부분 성공' },
];

const STATUS_META: Record<NotificationSendStatus, { tone: 'success' | 'danger' | 'warning'; label: string }> = {
  sent: { tone: 'success', label: '성공' },
  failed: { tone: 'danger', label: '실패' },
  partial: { tone: 'warning', label: '부분 성공' },
};

const SEGMENT_LABELS: Record<string, string> = {
  all: '전체',
  active_7d: '활성(7일↑)',
  verified: '인증완료',
  dormant_14d: '14일 무활동',
  ai_unused: 'AI 미사용자',
};

function segmentLabel(segment: string) {
  return SEGMENT_LABELS[segment] ?? segment;
}

const TYPE_META: Record<string, { tone: 'info' | 'success' | 'warning' | 'muted'; label: string }> = {
  broadcast: { tone: 'info', label: '마케팅/캠페인' },
  reservation_reminder: { tone: 'success', label: '예약 리마인더' },
  notice: { tone: 'warning', label: '공지' },
  business_verification: { tone: 'info', label: '사업자 인증' },
};

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type];
  return <StatusBadge tone={meta?.tone ?? 'muted'}>{meta?.label ?? type}</StatusBadge>;
}

const SOURCE_META: Record<string, { tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string }> = {
  web: { tone: 'muted', label: '웹' },
  cron: { tone: 'muted', label: '스케줄러' },
  system: { tone: 'muted', label: '시스템' },
  alimtalk: { tone: 'info', label: '알림톡' },
};

function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source];
  return <StatusBadge tone={meta?.tone ?? 'muted'}>{meta?.label ?? source}</StatusBadge>;
}

function formatDateTime(createdAt: string | null) {
  if (!createdAt) return '-';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '-';
  // 고정 timeZone(KST) + formatToParts 로 서버/클라 동일 출력 보장(하이드레이션 불일치 방지).
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

function targetLabel(log: NotificationLog) {
  if (log.segment) return `세그먼트: ${segmentLabel(log.segment)}`;
  if (log.targetUserId != null) return `유저 #${log.targetUserId}`;
  return '-';
}

export function NotificationLogsClient({ initial }: { initial: NotificationLog[] }) {
  const [rows, setRows] = useState<NotificationLog[]>(initial);
  const [type, setType] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [pending, startTransition] = useTransition();

  const buildFilters = (
    nextType: string,
    nextSource: string,
    nextStatus: string,
  ): NotificationLogFilters => ({
    type: nextType === ALL ? undefined : nextType,
    source: nextSource === ALL ? undefined : nextSource,
    status: nextStatus === ALL ? undefined : (nextStatus as NotificationSendStatus),
  });

  const reload = (nextType: string, nextSource: string, nextStatus: string) => {
    startTransition(async () => {
      const next = await listNotificationLogs(
        buildFilters(nextType, nextSource, nextStatus),
        0,
      );
      setRows(next);
      setPage(0);
      setHasMore(next.length >= PAGE_SIZE);
    });
  };

  const onTypeChange = (v: string) => {
    setType(v);
    reload(v, source, status);
  };
  const onSourceChange = (v: string) => {
    setSource(v);
    reload(type, v, status);
  };
  const onStatusChange = (v: string) => {
    setStatus(v);
    reload(type, source, v);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    startTransition(async () => {
      const more = await listNotificationLogs(buildFilters(type, source, status), nextPage);
      setRows((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(more.length >= PAGE_SIZE);
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">발송 로그</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="타입" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.value === ALL ? '타입 전체' : o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={onSourceChange}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue placeholder="소스" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.value === ALL ? '소스 전체' : o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.value === ALL ? '상태 전체' : o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상태</TableHead>
              <TableHead>타입</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>요약</TableHead>
              <TableHead>소스</TableHead>
              <TableHead>시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  발송 이력이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log) => (
                <TableRow key={log.id} className="align-top">
                  <TableCell className="pt-3">
                    <StatusBadge tone={STATUS_META[log.status]?.tone ?? 'muted'}>
                      {STATUS_META[log.status]?.label ?? log.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={log.type} />
                  </TableCell>
                  <TableCell>
                    <div className="text-foreground">{targetLabel(log)}</div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                      성공 {log.sentCount} / 실패 {log.failedCount}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-foreground" title={log.title ?? undefined}>
                      {log.title ?? '-'}
                    </div>
                    {log.status !== 'sent' && log.errorMessage ? (
                      <div className="mt-0.5 max-w-xs truncate text-xs text-destructive" title={log.errorMessage}>
                        {log.errorMessage}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell><SourceBadge source={log.source} /></TableCell>
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
  );
}
