'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminSubscriptionRow } from '@/types/admin';

export function SubscriptionsClient({ rows }: { rows: AdminSubscriptionRow[] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">구독 ({rows.length})</h1>
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
              <TableCell colSpan={6} className="text-center text-zinc-500">
                데이터 없음
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow key={s.userId}>
                <TableCell className="tabular-nums">{s.userId}</TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell>{s.store}</TableCell>
                <TableCell>{s.productId}</TableCell>
                <TableCell>{s.entitlement}</TableCell>
                <TableCell>{s.currentPeriodEnd?.slice(0, 10) ?? '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
