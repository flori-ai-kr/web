'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { subscribe, getMyBilling } from '@/lib/actions/billing';
import type { SubscriptionResponse } from '@/types/billing';
import { Button } from '@/components/ui/button';

const PLAN_LABEL: Record<string, string> = {
  MONTHLY: '월간 · 14,900원',
  YEARLY: '연간 · 154,800원',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface Props {
  authKey: string;
  customerKey: string;
  plan: string;
}

/**
 * 구독 등록 후 성공 화면.
 * subscribe()는 revalidatePath를 포함하므로 Server Component 렌더 중 호출 불가.
 * 이 클라이언트 컴포넌트의 useEffect 마운트 시점에 한 번만 실행한다.
 */
export function SubscribeClient({ authKey, customerKey, plan }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        await subscribe(plan as 'MONTHLY' | 'YEARLY', authKey, customerKey);
        const billing = await getMyBilling();
        setSub(billing.subscription);
        setStatus('success');
      } catch {
        router.replace('/billing/fail?code=SUBSCRIBE_FAILED&message=구독 등록에 실패했어요');
      }
    })();
  }, [authKey, customerKey, plan, router]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">구독을 등록하고 있어요…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      <div className="w-16 h-16 rounded-full bg-success-soft flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
      </div>
      <h1 className="text-[22px] font-bold text-foreground tracking-tight">
        14일 무료체험이 시작됐어요 🌷
      </h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        체험이 끝나면 자동으로 결제돼요.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left space-y-2 text-[13px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">플랜</span>
          <span className="font-semibold text-foreground">
            {PLAN_LABEL[sub?.plan ?? plan] ?? plan}
          </span>
        </div>
        {sub?.nextBillingAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">다음 결제일</span>
            <span className="font-semibold text-foreground">
              {formatDate(sub.nextBillingAt)}
            </span>
          </div>
        )}
        {sub?.card && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">결제 카드</span>
            <span className="font-semibold text-foreground font-mono">
              {sub.card.company} ····{sub.card.numberMasked?.slice(-4)}
            </span>
          </div>
        )}
      </div>

      <Button asChild className="mt-6 h-12 px-8 text-[15px] font-semibold bg-brand text-white hover:bg-brand/90">
        <Link href="/admin">flori 시작하기</Link>
      </Button>
    </div>
  );
}
