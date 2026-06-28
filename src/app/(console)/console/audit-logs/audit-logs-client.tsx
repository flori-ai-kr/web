'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
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
import { StatusBadge } from '@/components/console/status-badge';
import { listAuditLogs } from '@/lib/actions/admin-audit-logs';
import { jobLabel } from '@/lib/job-meta';
import type { AuditLog } from '@/types/admin';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  VERIFICATION_APPROVE: '인증 승인',
  VERIFICATION_REJECT: '인증 거절',
  USER_ACTIVATE: '유저 활성',
  USER_DEACTIVATE: '유저 비활성',
  POST_HIDE: '글 숨김',
  POST_UNHIDE: '글 숨김해제',
  POST_DELETE: '글 삭제',
  COMMENT_HIDE: '댓글 숨김',
  COMMENT_UNHIDE: '댓글 숨김해제',
  COMMENT_DELETE: '댓글 삭제',
  REPORT_RESOLVE: '신고 처리',
  USER_BAN: '커뮤니티 차단',
  USER_UNBAN: '차단 해제',
  BROADCAST_SEND: '브로드캐스트 발송',
  BROADCAST_DELETE: '브로드캐스트 삭제',
  ANNOUNCEMENT_CREATE: '공지 생성',
  ANNOUNCEMENT_UPDATE: '공지 수정',
  ANNOUNCEMENT_TOGGLE: '공지 토글',
  ANNOUNCEMENT_DELETE: '공지 삭제',
  INQUIRY_ANSWER: '문의 답변',
  INQUIRY_STATUS: '문의 상태변경',
  JOB_TRIGGER: '작업 실행',
};

const ACTION_OPTIONS = Object.keys(ACTION_LABELS);

// targetType(영문) → 한글 라벨. 미매핑은 원문 유지.
const TARGET_TYPE_LABELS: Record<string, string> = {
  job: '작업',
  user: '유저',
  verification: '인증',
  post: '글',
  comment: '댓글',
  report: '신고',
  broadcast: '브로드캐스트',
  announcement: '공지',
  inquiry: '문의',
  setting: '설정',
};

const ALL_VALUE = '__all__';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** 대상 표시: "작업 #일일 픽업 요약", "문의 #1" 등. job은 작업명을 한글로 변환. */
function targetDisplay(targetType: string | null, targetId: string | null): string {
  if (!targetType) return '-';
  const typeLabel = TARGET_TYPE_LABELS[targetType] ?? targetType;
  if (!targetId) return typeLabel;
  const idLabel = targetType === 'job' ? jobLabel(targetId) : targetId;
  return `${typeLabel} #${idLabel}`;
}

function actionTone(action: string): Tone {
  const a = action.toUpperCase();
  if (/(APPROVE|ACTIVATE|CREATE|SEND)/.test(a)) return 'success';
  if (/(REJECT|DELETE|DEACTIVATE|BAN)/.test(a)) {
    // UNBAN should not be danger
    if (/UNBAN/.test(a)) return 'info';
    return 'danger';
  }
  if (/(HIDE|TOGGLE|STATUS)/.test(a)) {
    if (/UNHIDE/.test(a)) return 'info';
    return 'warning';
  }
  return 'info';
}

function formatTime(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
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

export function AuditLogsClient({ initial }: { initial: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initial);
  const [action, setAction] = useState<string>(ALL_VALUE);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const [pending, startTransition] = useTransition();

  const onActionChange = (value: string) => {
    setAction(value);
    startTransition(async () => {
      const next = await listAuditLogs(value === ALL_VALUE ? undefined : value, 0);
      setLogs(next);
      setPage(0);
      setHasMore(next.length >= PAGE_SIZE);
    });
  };

  const loadMore = () => {
    const nextPage = page + 1;
    startTransition(async () => {
      const next = await listAuditLogs(action === ALL_VALUE ? undefined : action, nextPage);
      setLogs((prev) => [...prev, ...next]);
      setPage(nextPage);
      setHasMore(next.length >= PAGE_SIZE);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">감사 로그</h2>
        <Select value={action} onValueChange={onActionChange}>
          <SelectTrigger className="w-48 bg-card">
            <SelectValue placeholder="액션 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>전체</SelectItem>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시각</TableHead>
              <TableHead>운영자</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  감사 로그가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatTime(log.createdAt)}
                  </TableCell>
                  <TableCell>{log.actorEmail ?? `#${log.actorUserId}`}</TableCell>
                  <TableCell>
                    <StatusBadge tone={actionTone(log.action)}>
                      {actionLabel(log.action)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {targetDisplay(log.targetType, log.targetId)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.summary ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled={pending} onClick={loadMore}>
            {pending ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        민감 작업(PII 열람 등)은 영구 보관됩니다.
      </p>
    </div>
  );
}
