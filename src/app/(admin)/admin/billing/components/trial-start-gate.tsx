'use client';

import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Check, Loader2, LogOut} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {signOut} from '@/lib/actions/auth';
import {startTrial} from '@/lib/actions/billing';
import {BrandMark} from './subscription-gate';

const TRIAL_PERKS = [
  '주문·고객·매출·예약을 한곳에서 관리',
  '시세·지원사업 인사이트와 마케팅 도구',
  '14일 내내 모든 기능 그대로',
];

/**
 * 무카드 무료체험 진입 게이트(풀스크린, AppLayout 없음).
 * 사업자 인증(APPROVED) 통과 후, 활성 구독이 없고 체험을 시작할 수 있는(trialEligible) 점주가 마주하는 화면.
 * 카드/플랜 UI 없이 원클릭으로 14일 무료체험을 시작한다 → 성공 시 레이아웃이 TRIALING으로 재렌더되어 앱에 진입.
 * 카드 등록·결제는 체험 종료 시점의 결제벽(SubscriptionGate→BillingCheckout)에서만 받는다.
 */
export function TrialStartGate() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    startTransition(async () => {
      try {
        await startTrial();
        toast.success('14일 무료체험을 시작했어요. 환영해요!');
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '체험 시작 중 오류가 발생했어요.',
        );
      }
    });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center overflow-y-auto bg-background px-4 py-10">
      <div className="mb-8 shrink-0">
        <BrandMark />
      </div>

      <main className="flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="flex flex-col items-center px-4 py-6 w-full">
          <h3 className="text-[24px] font-bold text-foreground tracking-tight text-center">
            14일 무료체험을 시작해요
          </h3>
          <p className="text-sm text-muted-foreground mt-2 break-keep max-w-sm text-center">
            카드 없이 바로 시작할 수 있어요. 14일 후에 결제 안내를 드릴게요.
          </p>

          <ul className="mt-6 w-full max-w-[440px] space-y-2.5">
            {TRIAL_PERKS.map((perk) => (
              <li
                key={perk}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3.5"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10"
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5 text-brand" />
                </span>
                <span className="text-[14px] text-foreground break-keep">{perk}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 w-full max-w-[440px]">
            <Button
              type="button"
              className="w-full h-12 text-[15px] font-semibold bg-brand text-white hover:bg-brand/90"
              disabled={isPending}
              onClick={handleStart}
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              14일 무료로 시작하기
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2 break-keep">
              카드 없이 바로 시작 · 14일 후 결제 안내 · 언제든 해지할 수 있어요
            </p>
          </div>
        </div>
      </main>

      <button
        type="button"
        onClick={() => signOut()}
        className="mt-8 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
        로그아웃
      </button>
    </div>
  );
}
