'use client';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/console/status-badge';
import type { ReportQueueItem, ReportReason, ReportTargetType } from '@/types/admin';

const REASON_LABEL: Record<ReportReason, string> = {
  spam: '광고/스팸',
  abuse: '비방/욕설',
  privacy: '개인정보',
  sexual: '음란물',
  etc: '기타',
};

const REASON_TONE: Record<ReportReason, 'danger' | 'warning' | 'info' | 'muted'> = {
  spam: 'warning',
  abuse: 'danger',
  privacy: 'info',
  sexual: 'danger',
  etc: 'muted',
};

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: '게시글',
  comment: '댓글',
};

const RESOLUTION_LABEL: Record<string, string> = {
  deleted: '삭제됨',
  hidden: '숨김 처리됨',
  dismissed: '기각됨',
};

export function ReportCard({
  item,
  pending,
  onResolve,
  onBan,
}: {
  item: ReportQueueItem;
  pending: boolean;
  onResolve: (id: number, resolution: 'deleted' | 'hidden' | 'dismissed') => void;
  onBan: (authorUserId: number) => void;
}) {
  const reason = (REASON_LABEL[item.reason] ? item.reason : 'etc') as ReportReason;
  const isPending = item.status === 'pending';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={REASON_TONE[reason]}>{REASON_LABEL[reason]}</StatusBadge>
        <StatusBadge tone="muted">{TARGET_LABEL[item.targetType] ?? item.targetType}</StatusBadge>
        <span className="text-xs font-semibold text-destructive">
          신고 {item.reportCount}회
        </span>
        {!isPending && item.resolution ? (
          <StatusBadge tone="muted">
            {RESOLUTION_LABEL[item.resolution] ?? item.resolution}
          </StatusBadge>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {item.createdAt.slice(0, 10)}
        </span>
      </div>

      <p
        className={`mt-3 text-sm whitespace-pre-wrap break-words ${
          isPending ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {item.targetPreview?.trim() || '(내용 없음)'}
      </p>

      {item.detail ? (
        <p className="mt-1 text-xs text-muted-foreground">신고 메모: {item.detail}</p>
      ) : null}

      <div className="mt-2 text-xs text-muted-foreground tabular-nums">
        작성자 userId: {item.authorUserId ?? '-'}
      </div>

      {isPending ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onResolve(item.id, 'deleted')}
          >
            삭제
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onResolve(item.id, 'hidden')}
          >
            숨김
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onResolve(item.id, 'dismissed')}
          >
            기각
          </Button>
          {item.authorUserId ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onBan(item.authorUserId as number)}
            >
              작성자 차단
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
