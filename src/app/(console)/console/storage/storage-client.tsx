'use client';

import { useState, useTransition } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listStorageRequests } from '@/lib/actions/admin-storage';
import { formatBytes } from '@/lib/format-bytes';
import type { AdminStorageRequest, StorageRequestStatus } from '@/types/admin';
import { StorageStatusBadge } from './storage-meta';
import { StorageDetailDialog } from './storage-detail-dialog';

type Filter = StorageRequestStatus | 'all';

const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'PENDING', label: '대기' },
  { value: 'RESOLVED', label: '처리됨' },
];

export function StorageClient({ initial }: { initial: AdminStorageRequest[] }) {
  const [status, setStatus] = useState<Filter>('all');
  const [rows, setRows] = useState<AdminStorageRequest[]>(initial);
  const [selected, setSelected] = useState<AdminStorageRequest | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (next: Filter) => {
    setSelected(null);
    setStatus(next);
    startTransition(async () =>
      setRows(await listStorageRequests(next === 'all' ? undefined : next)),
    );
  };

  const refresh = () =>
    startTransition(async () =>
      setRows(await listStorageRequests(status === 'all' ? undefined : status)),
    );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">스토리지 증설요청</h1>
      <Tabs value={status} onValueChange={(v) => load(v as Filter)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>가게명</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>사용량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>요청일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  요청이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell>{r.storeName ?? '-'}</TableCell>
                  <TableCell>{r.nickname ?? `user_${r.userId}`}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.reason ?? '-'}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatBytes(r.usedBytes)} / {formatBytes(r.quotaBytes)}
                  </TableCell>
                  <TableCell>
                    <StorageStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{r.createdAt.slice(0, 10)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StorageDetailDialog
        request={selected}
        pending={pending}
        onClose={() => setSelected(null)}
        onDone={() => {
          setSelected(null);
          refresh();
        }}
      />
    </div>
  );
}
