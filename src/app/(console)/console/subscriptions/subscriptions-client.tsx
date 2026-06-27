'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SubscriptionBadge } from '@/components/console/status-badge';
import type { AdminSubscriptionRow, BillingPlan } from '@/types/billing';

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<BillingPlan, string> = {
  MONTHLY: '월간',
  YEARLY: '연간',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short' }).format(new Date(iso));
}

// ─── 상태별 카운트 요약 ────────────────────────────────────────────────────────

interface StatusCounts {
  TRIALING: number;
  ACTIVE: number;
  IN_GRACE: number;
  EXPIRED: number;
}

function SummaryCards({ counts, total }: { counts: StatusCounts; total: number }) {
  const items = [
    { label: '체험중', count: counts.TRIALING, color: 'text-info' },
    { label: '이용중', count: counts.ACTIVE, color: 'text-success' },
    { label: '결제유예', count: counts.IN_GRACE, color: 'text-warning' },
    { label: '만료', count: counts.EXPIRED, color: 'text-destructive' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ label, count, color }) => (
        <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-0.5 text-xl font-semibold tabular-nums ${color}`}>
            {count.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            / 전체 {total.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── 메인 클라이언트 ──────────────────────────────────────────────────────────

export function SubscriptionsClient({ rows }: { rows: AdminSubscriptionRow[] }) {
  const counts = useMemo<StatusCounts>(
    () =>
      rows.reduce(
        (acc, r) => {
          if (r.status in acc) acc[r.status as keyof StatusCounts] += 1;
          return acc;
        },
        { TRIALING: 0, ACTIVE: 0, IN_GRACE: 0, EXPIRED: 0 },
      ),
    [rows],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">구독 현황 ({rows.length})</h2>
      </div>

      {/* 상태별 카운트 요약 */}
      <SummaryCards counts={counts} total={rows.length} />

      {/* 구독 목록 테이블 */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>userId</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>플랜</TableHead>
              <TableHead>다음 결제일</TableHead>
              <TableHead>이용 종료</TableHead>
              <TableHead>해지 예약</TableHead>
              <TableHead>가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  데이터 없음
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.userId}>
                  <TableCell className="tabular-nums">{s.userId}</TableCell>
                  <TableCell>
                    <SubscriptionBadge status={s.status} />
                  </TableCell>
                  <TableCell>{PLAN_LABEL[s.plan] ?? s.plan}</TableCell>
                  <TableCell className="tabular-nums">{fmtDate(s.nextBillingAt)}</TableCell>
                  <TableCell className="tabular-nums">{fmtDate(s.currentPeriodEnd)}</TableCell>
                  <TableCell>
                    {s.cancelAtPeriodEnd ? (
                      <span className="inline-block rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                        예약됨
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{fmtDate(s.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
