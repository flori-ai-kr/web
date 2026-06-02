'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SubscriptionBadge } from '@/components/console/StatusBadge';
import type { AdminSubscriptionRow } from '@/types/admin';

export function SubscriptionsClient({ rows }: { rows: AdminSubscriptionRow[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">구독 ({rows.length})</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>userId</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>스토어</TableHead>
              <TableHead>상품</TableHead>
              <TableHead>권한</TableHead>
              <TableHead>만료</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  데이터 없음
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.userId}>
                  <TableCell className="tabular-nums">{s.userId}</TableCell>
                  <TableCell><SubscriptionBadge status={s.status} /></TableCell>
                  <TableCell>{s.store}</TableCell>
                  <TableCell>{s.productId}</TableCell>
                  <TableCell>{s.entitlement}</TableCell>
                  <TableCell className="tabular-nums">{s.currentPeriodEnd?.slice(0, 10) ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
