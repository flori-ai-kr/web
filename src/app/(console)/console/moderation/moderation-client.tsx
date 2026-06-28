'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  listReports,
  resolveReport,
  listBans,
  createBan,
  liftBan,
} from '@/lib/actions/admin-moderation';
import type { CommunityBan, ReportQueueItem, ReportStatus } from '@/types/admin';
import { ReportCard } from './report-card';
import { BanDialog } from './ban-dialog';

type Tab = 'reports' | 'bans';

const REPORT_STATUSES: { value: ReportStatus; label: string }[] = [
  { value: 'pending', label: '대기' },
  { value: 'resolved', label: '처리됨' },
  { value: 'dismissed', label: '기각' },
];

export function ModerationClient({ initialReports }: { initialReports: ReportQueueItem[] }) {
  const [tab, setTab] = useState<Tab>('reports');
  const [status, setStatus] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<ReportQueueItem[]>(initialReports);

  const [bans, setBans] = useState<CommunityBan[]>([]);
  const [bansLoaded, setBansLoaded] = useState(false);

  const [banOpen, setBanOpen] = useState(false);
  const [banPrefill, setBanPrefill] = useState<number | null>(null);

  const [pending, startTransition] = useTransition();

  const loadReports = (next: ReportStatus) => {
    setStatus(next);
    startTransition(async () => {
      try {
        setReports(await listReports(next));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '불러오기 실패');
      }
    });
  };

  const refreshReports = () =>
    startTransition(async () => {
      try {
        setReports(await listReports(status));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '불러오기 실패');
      }
    });

  const loadBans = () =>
    startTransition(async () => {
      try {
        setBans(await listBans());
        setBansLoaded(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '불러오기 실패');
      }
    });

  const onTabChange = (next: Tab) => {
    setTab(next);
    if (next === 'bans' && !bansLoaded) loadBans();
  };

  const onResolve = (id: number, resolution: 'deleted' | 'hidden' | 'dismissed') =>
    startTransition(async () => {
      try {
        await resolveReport(id, resolution);
        toast.success('처리되었습니다');
        refreshReports();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });

  const openBan = (userId: number | null) => {
    setBanPrefill(userId);
    setBanOpen(true);
  };

  const onCreateBan = (userId: number, reason: string | null, expiresAt: string | null) =>
    startTransition(async () => {
      try {
        await createBan(userId, reason, expiresAt);
        toast.success('차단되었습니다');
        setBanOpen(false);
        if (bansLoaded) setBans(await listBans());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '차단 실패');
      }
    });

  const onLiftBan = (id: number) =>
    startTransition(async () => {
      try {
        await liftBan(id);
        toast.success('차단이 해제되었습니다');
        setBans(await listBans());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '해제 실패');
      }
    });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">커뮤니티 모더레이션</h1>

      <Tabs value={tab} onValueChange={(v) => onTabChange(v as Tab)}>
        <TabsList>
          <TabsTrigger value="reports">신고 큐</TabsTrigger>
          <TabsTrigger value="bans">차단 유저</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'reports' ? (
        <div className="space-y-4">
          <Tabs value={status} onValueChange={(v) => loadReports(v as ReportStatus)}>
            <TabsList>
              {REPORT_STATUSES.map((s) => (
                <TabsTrigger key={s.value} value={s.value}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
              데이터 없음
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((item) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  pending={pending}
                  onResolve={onResolve}
                  onBan={(authorUserId) => openBan(authorUserId)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => openBan(null)}>
              차단 추가
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>userId</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>만료</TableHead>
                  <TableHead>차단일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      데이터 없음
                    </TableCell>
                  </TableRow>
                ) : (
                  bans.map((ban) => {
                    const active = !ban.liftedAt;
                    return (
                      <TableRow key={ban.id}>
                        <TableCell className="tabular-nums">{ban.userId}</TableCell>
                        <TableCell className="max-w-[16rem] truncate">{ban.reason ?? '-'}</TableCell>
                        <TableCell className="tabular-nums">
                          {ban.expiresAt ? `~${ban.expiresAt.slice(0, 10)}` : '영구'}
                        </TableCell>
                        <TableCell className="tabular-nums">{ban.createdAt.slice(0, 10)}</TableCell>
                        <TableCell>
                          {active ? (
                            <StatusBadge tone="danger">차단중</StatusBadge>
                          ) : (
                            <StatusBadge tone="muted">
                              해제됨 ({ban.liftedAt?.slice(0, 10)})
                            </StatusBadge>
                          )}
                        </TableCell>
                        <TableCell>
                          {active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => onLiftBan(ban.id)}
                            >
                              해제
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <BanDialog
        open={banOpen}
        prefillUserId={banPrefill}
        pending={pending}
        onOpenChange={setBanOpen}
        onSubmit={onCreateBan}
      />
    </div>
  );
}
