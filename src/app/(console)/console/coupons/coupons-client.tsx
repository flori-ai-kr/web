'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/console/status-badge';
import { listCoupons } from '@/lib/actions/admin-coupons';
import type { CouponResponse, CouponEffectiveStatus } from '@/types/billing';
import { IssueDialog } from './issue-dialog';
import { couponSourceLabel, couponStatusLabel } from './coupon-labels';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const STATUS_TONE: Record<CouponEffectiveStatus, Tone> = {
  ACTIVE: 'success',
  DISABLED: 'muted',
  EXPIRED: 'danger',
  EXHAUSTED: 'warning',
};

function formatDateRange(validFrom: string | null, validUntil: string | null): string {
  if (!validFrom && !validUntil) return '무기한';
  const from = validFrom ? validFrom.slice(0, 10) : '∞';
  const until = validUntil ? validUntil.slice(0, 10) : '∞';
  return `${from} ~ ${until}`;
}

export function CouponsClient({ initial }: { initial: CouponResponse[] }) {
  const [rows, setRows] = useState<CouponResponse[]>(initial);
  const [issueOpen, setIssueOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const refresh = () =>
    startTransition(async () => {
      try {
        setRows(await listCoupons());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '목록 갱신 실패');
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">쿠폰 ({rows.length})</h1>
        <Button onClick={() => setIssueOpen(true)}>+ 쿠폰 발행</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead className="text-right">일수</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">사용량</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>용도</TableHead>
              <TableHead>생성일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  발행된 쿠폰이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/console/coupons/${c.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.days}일</TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONE[c.effectiveStatus]}>
                      {couponStatusLabel(c.effectiveStatus)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.redeemedCount} / {c.maxRedemptions ?? '∞'}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {formatDateRange(c.validFrom, c.validUntil)}
                  </TableCell>
                  <TableCell className="text-sm">{couponSourceLabel(c.source)}</TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {c.createdAt.slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <IssueDialog open={issueOpen} onOpenChange={setIssueOpen} onIssued={refresh} />
    </div>
  );
}
