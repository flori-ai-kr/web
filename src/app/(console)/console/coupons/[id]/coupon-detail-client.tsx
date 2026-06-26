'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/console/status-badge';
import { disableCoupon } from '@/lib/actions/admin-coupons';
import type { CouponDetailResponse, CouponEffectiveStatus } from '@/types/billing';
import { couponSourceLabel, couponStatusLabel } from '../coupon-labels';
import { EditDialog } from './edit-dialog';

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

export function CouponDetailClient({ detail }: { detail: CouponDetailResponse }) {
  const { coupon, redemptions } = detail;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDisable = () => {
    startTransition(async () => {
      try {
        await disableCoupon(coupon.id);
        toast.success('쿠폰이 폐기되었습니다');
        setConfirmOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '폐기 실패');
      }
    });
  };

  const isDisabled = coupon.effectiveStatus === 'DISABLED';

  return (
    <div className="space-y-6">
      {/* 상단 네비 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push('/console/coupons')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          쿠폰 목록
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-mono text-2xl font-bold tracking-widest">{coupon.code}</p>
            <div className="flex items-center gap-2">
              <StatusBadge tone={STATUS_TONE[coupon.effectiveStatus]}>
                {couponStatusLabel(coupon.effectiveStatus)}
              </StatusBadge>
            </div>
          </div>
          {!isDisabled && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                수정
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                쿠폰 폐기
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">무료 일수</p>
            <p className="font-medium tabular-nums">{coupon.days}일</p>
          </div>
          <div>
            <p className="text-muted-foreground">사용량</p>
            <p className="font-medium tabular-nums">
              {coupon.redeemedCount} / {coupon.maxRedemptions ?? '∞'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">1인 한도</p>
            <p className="font-medium tabular-nums">{coupon.perUserLimit}회</p>
          </div>
          <div>
            <p className="text-muted-foreground">등록 기간</p>
            <p className="font-medium tabular-nums">
              {formatDateRange(coupon.validFrom, coupon.validUntil)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">용도</p>
            <p className="font-medium">{couponSourceLabel(coupon.source)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">생성일</p>
            <p className="font-medium tabular-nums">{coupon.createdAt.slice(0, 10)}</p>
          </div>
          {coupon.memo && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-muted-foreground">메모</p>
              <p className="font-medium">{coupon.memo}</p>
            </div>
          )}
        </div>
      </div>

      {/* 사용 현황 테이블 */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">
          사용 현황 ({redemptions.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>가게명</TableHead>
                <TableHead>닉네임</TableHead>
                <TableHead className="text-right">부여 일수</TableHead>
                <TableHead>사용일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    사용 내역이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                redemptions.map((r, i) => (
                  <TableRow key={`${r.userId}-${i}`}>
                    <TableCell>
                      <span className="font-medium">{r.storeName ?? '—'}</span>
                      <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                        #{r.userId}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{r.nickname ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      +{r.grantedDays}일
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {r.redeemedAt.slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 폐기 확인 Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!o) setConfirmOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>쿠폰 폐기</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold">{coupon.code}</span> 쿠폰을 폐기하면
              더 이상 사용할 수 없습니다. 계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" disabled={pending} onClick={handleDisable}>
              폐기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 Dialog */}
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        coupon={coupon}
        onUpdated={() => router.refresh()}
      />
    </div>
  );
}
