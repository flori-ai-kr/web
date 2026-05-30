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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  listVerifications,
  approveVerification,
  rejectVerification,
} from '@/lib/actions/admin-verifications';
import type { AdminVerification, VerificationStatus } from '@/types/admin';

const isImage = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

export function VerificationsClient({ initial }: { initial: AdminVerification[] }) {
  const [status, setStatus] = useState<VerificationStatus>('PENDING');
  const [rows, setRows] = useState<AdminVerification[]>(initial);
  const [selected, setSelected] = useState<AdminVerification | null>(null);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const load = (next: VerificationStatus) => {
    setStatus(next);
    startTransition(async () => setRows(await listVerifications(next)));
  };
  const refresh = () => startTransition(async () => setRows(await listVerifications(status)));

  const onApprove = (v: AdminVerification) =>
    startTransition(async () => {
      try {
        await approveVerification(v.id);
        toast.success('승인되었습니다');
        setSelected(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });

  const onReject = (v: AdminVerification) => {
    if (!reason.trim()) {
      toast.error('거절 사유를 입력하세요');
      return;
    }
    startTransition(async () => {
      try {
        await rejectVerification(v.id, reason.trim());
        toast.success('거절되었습니다');
        setSelected(null);
        setReason('');
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">사업자 인증</h1>
      <Tabs value={status} onValueChange={(v) => load(v as VerificationStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING">대기</TabsTrigger>
          <TabsTrigger value="APPROVED">승인</TabsTrigger>
          <TabsTrigger value="REJECTED">거절</TabsTrigger>
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상호</TableHead>
            <TableHead>사업자번호</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>userId</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead />
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
            rows.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.businessName}</TableCell>
                <TableCell className="tabular-nums">{v.businessNumber}</TableCell>
                <TableCell>{v.representativeName}</TableCell>
                <TableCell className="tabular-nums">{v.userId}</TableCell>
                <TableCell>{v.submittedAt?.slice(0, 10) ?? '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(v);
                      setReason('');
                    }}
                  >
                    상세
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.businessName}</DialogTitle>
              </DialogHeader>
              <dl className="space-y-1 text-sm">
                <div>
                  사업자번호: <span className="tabular-nums">{selected.businessNumber}</span>
                </div>
                <div>대표자: {selected.representativeName}</div>
                <div>
                  상태: {selected.status}
                  {selected.rejectReason ? ` (${selected.rejectReason})` : ''}
                </div>
              </dl>
              <div className="my-2">
                {isImage(selected.businessLicenseUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.businessLicenseUrl}
                    alt="사업자등록증"
                    className="max-h-80 rounded border border-zinc-700"
                  />
                ) : (
                  <a
                    href={selected.businessLicenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 underline"
                  >
                    등록증 파일 열기 (PDF)
                  </a>
                )}
              </div>
              {selected.status === 'PENDING' && (
                <>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="거절 사유 (거절 시 필수)"
                  />
                  <DialogFooter className="gap-2">
                    <Button variant="outline" disabled={pending} onClick={() => onReject(selected)}>
                      거절
                    </Button>
                    <Button disabled={pending} onClick={() => onApprove(selected)}>
                      승인
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
