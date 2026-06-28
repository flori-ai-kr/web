'use client';

import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 공개 테스트 클라이언트 키 — 브라우저 노출 전제(NEXT_PUBLIC 성격)라 시크릿 아님. 토스 심사 데모 전용.
// (시크릿 키 test_sk_… 는 절대 클라이언트/코드에 넣지 않는다. 데모는 시크릿 불필요.)
const TOSS_CLIENT_KEY = 'test_ck_4yKeq5bgrpzdoRQGEjLA3GX0lzW6';
// 데모용 고정 customerKey (실제 회원 식별과 무관).
const DEMO_CUSTOMER_KEY = 'florist-billing-demo';

export function BillingDemoButton() {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: DEMO_CUSTOMER_KEY });
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${location.origin}/billing-demo?step=success`,
        failUrl: `${location.origin}/billing-demo?step=fail`,
      });
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : '결제창 호출 중 오류가 발생했습니다.');
    }
  };

  return (
    <Button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      className="h-12 px-8 text-[15px] font-semibold bg-brand text-white hover:bg-brand/90"
    >
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
      카드 등록(빌링 인증창) 열기
    </Button>
  );
}
