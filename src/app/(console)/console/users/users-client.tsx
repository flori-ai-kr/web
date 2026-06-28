'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge, SubscriptionBadge, VerificationBadge } from '@/components/console/status-badge';
import { listAdminUsers, setUserActive } from '@/lib/actions/admin-users';
import type { AdminUserPage, AdminUserRow } from '@/types/admin';

export function UsersClient({ initial }: { initial: AdminUserPage }) {
  const router = useRouter();
  const [data, setData] = useState<AdminUserPage>(initial);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchPage = (q: string, page: number) =>
    startTransition(async () => setData(await listAdminUsers(q, page)));

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchPage(query, 0);
  };

  const openToggle = (u: AdminUserRow) => setTarget(u);

  const confirmToggle = () => {
    if (!target) return;
    const row = target;
    startTransition(async () => {
      try {
        await setUserActive(row.id, !row.isActive);
        toast.success(row.isActive ? '비활성화했습니다' : '활성화했습니다');
        setTarget(null);
        setData(await listAdminUsers(query, data.page));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  const maxPage = Math.max(0, Math.ceil(data.total / data.size) - 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">유저 ({data.total})</h2>
        <form onSubmit={onSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이메일·닉네임 검색"
            className="w-56 bg-card"
          />
          <Button type="submit" variant="outline" disabled={pending}>
            검색
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>닉네임</TableHead>
              <TableHead>가게</TableHead>
              <TableHead>구독</TableHead>
              <TableHead>인증</TableHead>
              <TableHead className="sticky right-0 bg-card text-center">활성</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  데이터 없음
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((u) => (
                <TableRow
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/console/users/${u.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/console/users/${u.id}`);
                    }
                  }}
                >
                  <TableCell className="tabular-nums">{u.id}</TableCell>
                  <TableCell>
                    {u.email ?? '-'}
                    {u.isAdmin && (
                      <span className="ml-1.5 align-middle">
                        <StatusBadge tone="danger">운영자</StatusBadge>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{u.nickname ?? '-'}</TableCell>
                  <TableCell>{u.storeName ?? '-'}</TableCell>
                  <TableCell><SubscriptionBadge status={u.subscriptionStatus} /></TableCell>
                  <TableCell><VerificationBadge status={u.verificationStatus} /></TableCell>
                  <TableCell
                    className="sticky right-0 border-l border-border bg-card group-hover:bg-muted/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={u.isActive}
                        disabled={u.isAdmin || pending}
                        aria-label={u.isActive ? '비활성화' : '활성화'}
                        onCheckedChange={() => openToggle(u)}
                      />
                      <span className="w-8 text-xs text-muted-foreground">
                        {u.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={data.page <= 0 || pending}
          onClick={() => fetchPage(query, data.page - 1)}
        >
          이전
        </Button>
        <span className="text-muted-foreground">
          {data.page + 1} / {maxPage + 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={data.page >= maxPage || pending}
          onClick={() => fetchPage(query, data.page + 1)}
        >
          다음
        </Button>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target?.isActive ? '계정 비활성화' : '계정 활성화'}</DialogTitle>
            <DialogDescription>
              {target?.email} ({target?.id}) 계정을 {target?.isActive ? '비활성화' : '활성화'}합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>
              취소
            </Button>
            <Button disabled={pending} onClick={confirmToggle}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
