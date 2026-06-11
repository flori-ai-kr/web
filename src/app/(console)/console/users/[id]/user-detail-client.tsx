'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge, SubscriptionBadge, VerificationBadge } from '@/components/console/status-badge';
import { setUserActive } from '@/lib/actions/admin-users';
import type { AdminUserDetail } from '@/types/admin';

const won = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

export function UserDetailClient({ detail }: { detail: AdminUserDetail }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmToggle = () => {
    startTransition(async () => {
      try {
        await setUserActive(detail.id, !detail.isActive);
        toast.success(detail.isActive ? '비활성화했습니다' : '활성화했습니다');
        setConfirmOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  return (
    <div className="space-y-5">
      <Link
        href="/console/users"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 유저 목록
      </Link>

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{detail.nickname ?? '이름 없음'}</h2>
            {detail.isAdmin && <StatusBadge tone="danger">운영자</StatusBadge>}
            <StatusBadge tone={detail.isActive ? 'success' : 'muted'}>
              {detail.isActive ? '활성' : '비활성'}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{detail.email ?? '-'} · #{detail.id}</p>
        </div>
        <Button variant="outline" disabled={detail.isAdmin || pending} onClick={() => setConfirmOpen(true)}>
          {detail.isActive ? '계정 비활성화' : '계정 활성화'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 프로필 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">프로필</h3>
          <Field label="가게명">{detail.storeName ?? '-'}</Field>
          <Field label="지역">
            {[detail.regionSido, detail.regionSigungu].filter(Boolean).join(' ') || '-'}
          </Field>
          <Field label="가입일">{detail.createdAt?.slice(0, 10) ?? '-'}</Field>
        </div>

        {/* 구독 + 매출 요약 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">구독 · 매출</h3>
          <Field label="구독 상태"><SubscriptionBadge status={detail.subscriptionStatus} /></Field>
          <Field label="매출 건수">
            {detail.salesCount != null ? `${detail.salesCount.toLocaleString()}건` : '—'}
          </Field>
          <Field label="매출 총액">
            {detail.salesTotal != null ? won(detail.salesTotal) : '—'}
          </Field>
          <Field label="최근 매출일">{detail.lastSaleDate?.slice(0, 10) ?? '—'}</Field>
        </div>
      </div>

      {/* 인증 이력 */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">사업자 인증 이력</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상태</TableHead>
              <TableHead>신청일</TableHead>
              <TableHead>심사일</TableHead>
              <TableHead>거절 사유</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.verifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  인증 신청 이력이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              detail.verifications.map((v, i) => (
                <TableRow key={v.submittedAt ?? i}>
                  <TableCell><VerificationBadge status={v.status} /></TableCell>
                  <TableCell>{v.submittedAt?.slice(0, 10) ?? '-'}</TableCell>
                  <TableCell>{v.reviewedAt?.slice(0, 10) ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{v.rejectReason ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail.isActive ? '계정 비활성화' : '계정 활성화'}</DialogTitle>
            <DialogDescription>
              {detail.email} (#{detail.id}) 계정을 {detail.isActive ? '비활성화' : '활성화'}합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>취소</Button>
            <Button disabled={pending} onClick={confirmToggle}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
