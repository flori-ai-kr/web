'use client';

import { useState, useTransition } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareBilling } from '@/lib/actions/billing';
import type { BillingPlan } from '@/types/billing';

export interface BillingCheckoutProps {
  /** 페이월 진입 맥락. 'expired'=무료체험 만료, 'none'=미구독 첫 진입 */
  variant?: 'expired' | 'none';
}

export function BillingCheckout({ variant = 'none' }: BillingCheckoutProps) {
  const [plan, setPlan] = useState<BillingPlan>('MONTHLY');
  const [isPending, startTransition] = useTransition();

  const headingText =
    variant === 'expired'
      ? '무료체험이 끝났어요'
      : '14일 무료로 시작하세요';

  const subText =
    variant === 'expired'
      ? '구독하면 주문·고객·인사이트·마케팅 기능을 계속 사용할 수 있어요.'
      : '체험 기간엔 한 푼도 결제되지 않아요. 체험이 끝나면 자동으로 결제돼요.';

  const handleStart = () => {
    startTransition(async () => {
      try {
        const { customerKey } = await prepareBilling();
        const tp = await loadTossPayments(
          process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!,
        );
        const payment = tp.payment({ customerKey });
        await payment.requestBillingAuth({
          method: 'CARD',
          successUrl: `${location.origin}/billing/success?plan=${plan}`,
          failUrl: `${location.origin}/billing/fail`,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '결제 준비 중 오류가 발생했어요.',
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-center px-4 py-10 w-full">
      <h3 className="text-[24px] font-bold text-foreground tracking-tight mt-3">
        {headingText}
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 break-keep max-w-sm text-center">
        {subText}
      </p>

      <fieldset className="mt-6 w-full max-w-[440px] space-y-2.5">
        <legend className="sr-only">요금제 선택</legend>

        {/* 월간 플랜 */}
        <label
          htmlFor="plan-monthly"
          className={[
            'block rounded-xl border-2 bg-card p-4 cursor-pointer',
            plan === 'MONTHLY'
              ? 'border-brand'
              : 'border-border hover:border-brand/40',
          ].join(' ')}
        >
          <input
            id="plan-monthly"
            type="radio"
            name="plan"
            value="MONTHLY"
            checked={plan === 'MONTHLY'}
            onChange={() => setPlan('MONTHLY')}
            className="sr-only"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={[
                  'flex-shrink-0 w-[18px] h-[18px] rounded-full border-2',
                  plan === 'MONTHLY'
                    ? 'border-[5px] border-brand'
                    : 'border-muted-foreground/40',
                ].join(' ')}
                aria-hidden="true"
              />
              <span className="text-[15px] font-semibold text-foreground">
                월간
              </span>
            </div>
            <div>
              <span className="text-[16px] font-bold text-foreground">
                14,900
              </span>
              <span className="text-xs text-muted-foreground">원/월</span>
            </div>
          </div>
        </label>

        {/* 연간 플랜 */}
        <label
          htmlFor="plan-yearly"
          className={[
            'block rounded-xl border-2 bg-card p-4 cursor-pointer',
            plan === 'YEARLY'
              ? 'border-brand'
              : 'border-border hover:border-brand/40',
          ].join(' ')}
        >
          <input
            id="plan-yearly"
            type="radio"
            name="plan"
            value="YEARLY"
            checked={plan === 'YEARLY'}
            onChange={() => setPlan('YEARLY')}
            className="sr-only"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={[
                  'flex-shrink-0 w-[18px] h-[18px] rounded-full border-2',
                  plan === 'YEARLY'
                    ? 'border-[5px] border-brand'
                    : 'border-muted-foreground/40',
                ].join(' ')}
                aria-hidden="true"
              />
              <span className="text-[15px] font-semibold text-foreground">
                연간
              </span>
              <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                13% 절약
              </span>
            </div>
            <div>
              <span className="text-[16px] font-bold text-foreground">
                154,800
              </span>
              <span className="text-xs text-muted-foreground">원/년</span>
            </div>
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-1.5 pl-7">
            월 12,900원꼴 · 월 13% 절약
          </p>
        </label>

        <Button
          type="button"
          className="w-full h-12 text-[15px] font-semibold bg-brand text-white hover:bg-brand/90 mt-1"
          disabled={isPending}
          onClick={handleStart}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          14일 무료로 시작하기
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          [구독 시작] 클릭 → 토스 카드 등록창 → 등록 완료 시 자동으로 체험 시작 · 언제든 해지 가능
        </p>
      </fieldset>
    </div>
  );
}
