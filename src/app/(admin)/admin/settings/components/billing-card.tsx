'use client';

import {useCallback, useEffect, useState, useTransition} from 'react';
import {loadTossPayments} from '@tosspayments/tosspayments-sdk';
import {AlertTriangle, Loader2} from 'lucide-react';
import {toast} from 'sonner';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  cancelSubscription,
  getMyBilling,
  prepareBilling,
  redeemCoupon,
  resumeSubscription,
} from '@/lib/actions/billing';
import type {
  BillingPlan,
  MeResponse,
  SubscriptionStatus,
} from '@/types/billing';

// ─── 표시 헬퍼 ───────────────────────────────────────────────────────

const PLAN_META: Record<BillingPlan, {amount: string; unit: string; label: string}> = {
  MONTHLY: {amount: '14,900', unit: '원 / 월', label: '월간 플랜'},
  YEARLY: {amount: '154,800', unit: '원 / 년', label: '연간 플랜'},
};

const STATUS_BADGE: Record<SubscriptionStatus, {label: string; cls: string}> = {
  TRIALING: {label: '체험중', cls: 'bg-info-soft text-info'},
  ACTIVE: {label: '이용중', cls: 'bg-success-soft text-success'},
  IN_GRACE: {label: '결제 유예', cls: 'bg-warning-soft text-warning'},
  EXPIRED: {label: '만료', cls: 'bg-danger-soft text-danger'},
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPaymentDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** "신한 ····1234" 형태로 카드 표기. 정보 없으면 null. */
function formatCard(card: {company: string | null; numberMasked: string | null} | null): string | null {
  if (!card) return null;
  const last4 = card.numberMasked?.replace(/\D/g, '').slice(-4) ?? '';
  const company = card.company ?? '카드';
  return last4 ? `${company} ····${last4}` : company;
}

const PAYMENT_STATUS_LABEL: Record<string, {label: string; cls: string}> = {
  DONE: {label: '완료', cls: 'bg-success-soft text-success'},
  CANCELED: {label: '취소', cls: 'bg-muted text-muted-foreground'},
  FAILED: {label: '실패', cls: 'bg-danger-soft text-danger'},
  ABORTED: {label: '실패', cls: 'bg-danger-soft text-danger'},
};

function paymentStatusBadge(status: string): {label: string; cls: string} {
  return PAYMENT_STATUS_LABEL[status] ?? {label: status, cls: 'bg-muted text-muted-foreground'};
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────

/**
 * 설정 페이지 최상단 구독·결제 카드.
 * 마운트 시 getMyBilling()으로 구독·최근 결제내역을 조회하고, 상태(TRIALING/ACTIVE/IN_GRACE)별 변형을 렌더한다.
 * 액션(해지/재개/쿠폰)은 useTransition + toast, 성공 시 재패칭. 카드 교체는 토스 빌링 재인증으로 진입.
 */
export function BillingCard() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isChangingCard, setIsChangingCard] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await getMyBilling();
      setData(res);
    } catch (err) {
      console.error('Billing fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // 카드 교체: 토스 SDK requestBillingAuth()가 외부 비동기 SDK 호출이라 useTransition 적용 불가.
  // isChangingCard 별도 state로 로딩 상태를 관리한다.
  const handleChangeCard = async () => {
    setIsChangingCard(true);
    try {
      const {customerKey} = await prepareBilling();
      const tp = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = tp.payment({customerKey});
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${location.origin}/billing/card`,
        failUrl: `${location.origin}/billing/fail`,
      });
      // 성공 시 토스 페이지로 리다이렉트되므로 setIsChangingCard(false) 불필요
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '카드 교체 준비 중 오류가 발생했어요.');
      setIsChangingCard(false);
    }
  };

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelSubscription();
        toast.success('구독 해지가 예약되었어요. 이용 기간이 끝나면 해지돼요.');
        setCancelOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '구독 해지에 실패했어요.');
        return;
      }
    });
    fetchBilling();
  };

  const handleResume = () => {
    startTransition(async () => {
      try {
        await resumeSubscription();
        toast.success('구독을 계속 이용하기로 했어요.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '구독 재개에 실패했어요.');
        return;
      }
    });
    fetchBilling();
  };

  const handleRedeem = () => {
    const code = couponCode.trim();
    if (!code) {
      toast.error('쿠폰 코드를 입력해주세요.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await redeemCoupon(code);
        if (res.pending) {
          toast.success(`쿠폰을 등록했어요. 구독 시작 시 무료 ${res.grantedDays}일이 적용돼요.`);
        } else if (res.nextBillingAt) {
          toast.success(
            `무료 ${res.grantedDays}일이 적용됐어요. 다음 결제일이 ${formatDate(res.nextBillingAt)}로 미뤄졌어요.`,
          );
        } else {
          toast.success(`무료 ${res.grantedDays}일이 적용됐어요.`);
        }
        setCouponCode('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '쿠폰 등록에 실패했어요.');
        return;
      }
    });
    fetchBilling();
  };

  // ─── 로딩 스켈레톤 ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-7 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const subscription = data?.subscription ?? null;

  // 미구독 가드(설정에 도달하려면 구독이 있어야 하므로 일반적으로 발생하지 않음)
  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">구독·결제</h3>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground break-keep">
            아직 구독 정보가 없어요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const badge = STATUS_BADGE[subscription.status];
  const planMeta = PLAN_META[subscription.plan];
  const cardLabel = formatCard(subscription.card);
  const isGrace = subscription.status === 'IN_GRACE';
  const isTrialing = subscription.status === 'TRIALING';
  // 무카드 체험: 카드(빌링키) 없이 시작한 체험. 자동결제 없음 → 종료 시 만료되고 결제 안내로 이어짐.
  const isCardlessTrial = isTrialing && !subscription.card;
  const recentPayments = data?.recentPayments ?? [];

  return (
    <Card className="overflow-hidden p-0 gap-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">구독·결제</h3>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* IN_GRACE 변형: 결제 실패 안내 강조 */}
        {isGrace ? (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning-soft p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <div className="text-[12.5px] font-semibold text-warning">결제에 실패했어요</div>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground break-keep">
                  카드를 확인해주세요. 매일 자동으로 재시도 중이에요. 기한 내 확인하지 않으면 구독이 만료돼요.
                </p>
              </div>
            </div>
          </div>
        ) : isCardlessTrial ? (
          <div className="mt-3">
            <span className="text-[24px] font-bold text-foreground tracking-tight">무료체험 중</span>
          </div>
        ) : (
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[24px] font-bold text-foreground tracking-tight">{planMeta.amount}</span>
            <span className="text-[12px] text-muted-foreground">
              {planMeta.unit} · {planMeta.label}
            </span>
          </div>
        )}

        {/* 체험중 안내 */}
        {isCardlessTrial ? (
          <p className="mt-2 text-[12.5px] text-muted-foreground break-keep">
            지금은 결제 정보 없이 무료로 이용 중이에요.{' '}
            <b className="text-foreground font-medium">{formatDate(subscription.nextBillingAt)}</b>에 체험이 끝나며,
            계속 이용하려면 그때 결제 정보를 등록하면 돼요.
          </p>
        ) : isTrialing ? (
          <p className="mt-2 text-[12.5px] text-muted-foreground break-keep">
            {formatDate(subscription.nextBillingAt)}부터{' '}
            <b className="text-foreground font-medium">
              {planMeta.amount}{planMeta.unit.replace(' / ', '/')}
            </b>{' '}
            자동결제가 시작돼요. 그 전에 해지하면 결제되지 않아요.
          </p>
        ) : null}

        {/* 해지 예약 안내 */}
        {subscription.cancelAtPeriodEnd && (
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <div className="text-[12.5px] font-semibold text-warning">
                {formatDate(subscription.currentPeriodEnd ?? subscription.nextBillingAt)}에 해지될 예정이에요
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground break-keep">
                그때까지는 모든 기능을 그대로 사용할 수 있어요.
              </p>
            </div>
          </div>
        )}

        {/* 메타: 다음 결제일 / 카드 */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted-foreground">
          <span>
            {isTrialing ? '체험 종료 ' : '다음 결제일 '}
            <b className="font-medium text-foreground">{formatDate(subscription.nextBillingAt)}</b>
          </span>
          {cardLabel && (
            <span>
              결제 카드 <b className="font-medium text-foreground">{cardLabel}</b>
            </span>
          )}
        </div>

        {/* 액션 버튼 (무카드 체험은 관리할 카드/결제가 없어 액션 숨김 — 종료 시 결제 안내로 이어짐) */}
        {!isCardlessTrial && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {subscription.cancelAtPeriodEnd ? (
              <>
                <Button size="sm" onClick={handleResume} disabled={isPending}>
                  {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  구독 계속하기
                </Button>
                <Button variant="outline" size="sm" onClick={handleChangeCard} disabled={isChangingCard}>
                  {isChangingCard && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  카드 교체
                </Button>
              </>
            ) : isGrace ? (
              <Button
                size="sm"
                onClick={handleChangeCard}
                disabled={isChangingCard}
                className="bg-warning text-warning-foreground hover:bg-warning/90"
              >
                {isChangingCard && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                카드 교체
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleChangeCard} disabled={isChangingCard}>
                {isChangingCard && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                카드 교체
              </Button>
            )}
          </div>

          {/* 구독 해지: 파괴적 액션이라 작고 흐린 텍스트 + 확인 모달(오발 방지) */}
          {!subscription.cancelAtPeriodEnd && !isGrace && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={isPending}
              className="shrink-0 text-[12px] text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              구독 해지
            </button>
          )}
        </div>
        )}

        {/* 구독 해지 확인 모달 */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>구독을 해지할까요?</DialogTitle>
              <DialogDescription className="break-keep">
                {formatDate(subscription.currentPeriodEnd ?? subscription.nextBillingAt)}까지는 모든 기능을 그대로 사용할 수 있고, 그 이후 자동으로 해지돼요.
                {isTrialing
                  ? ' 지금 해지하면 결제는 되지 않아요.'
                  : subscription.plan === 'YEARLY'
                    ? ' 이미 결제하신 연간 구독의 중도 환불은 고객센터로 문의해주세요.'
                    : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>
                돌아가기
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                구독 해지
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>

      {/* 쿠폰 등록 */}
      <div className="border-t border-border bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="shrink-0 text-[12.5px] font-medium text-foreground">쿠폰 등록</span>
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRedeem();
              }
            }}
            placeholder="WELCOME30"
            className="h-8 w-[180px] font-mono text-[12.5px]"
            disabled={isPending}
            aria-label="쿠폰 코드"
          />
          <Button size="sm" className="h-8" onClick={handleRedeem} disabled={isPending}>
            등록
          </Button>
          <span className="text-[11.5px] text-muted-foreground">
            등록하면 다음 결제일이 무료 일수만큼 미뤄져요.
          </span>
        </div>
      </div>

      {/* 최근 결제 내역 */}
      {recentPayments.length > 0 && (
        <details className="border-t border-border">
          <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-3 text-[12.5px] font-medium text-foreground">
            최근 결제 내역
            <span className="text-[11px] text-muted-foreground">최근 {recentPayments.length}건</span>
          </summary>
          <ul className="border-t border-border">
            {recentPayments.map((p, i) => {
              const ps = paymentStatusBadge(p.status);
              return (
                <li
                  key={`${p.createdAt}-${i}`}
                  className="flex items-center justify-between px-5 py-2.5 text-[12.5px] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60"
                >
                  <span className="font-mono text-muted-foreground">
                    {formatPaymentDate(p.approvedAt ?? p.createdAt)}
                  </span>
                  <span className="font-mono text-foreground">
                    {p.amount.toLocaleString('ko-KR')}원
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ps.cls}`}>
                    {ps.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </Card>
  );
}
