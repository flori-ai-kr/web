import type { Metadata } from 'next';
import { CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { BillingDemoButton } from './billing-demo-button';

export const metadata: Metadata = {
  title: '플로리 빌링 결제창 연동 데모',
  robots: { index: false, follow: false },
};

interface SearchParams {
  step?: string;
  authKey?: string;
  customerKey?: string;
  code?: string;
  message?: string;
}

/**
 * /billing-demo — 토스페이먼츠 빌링(자동결제) 카드 등록 인증창 연동 확인용 공개 페이지.
 * 로그인·페이월 게이트 밖(미들웨어가 /admin·/console 만 인증 체크 → 그 외는 통과).
 * 카드사 빌링 심사에서 "빌링 인증창이 정상 연동되어 뜨는지"만 확인하는 용도로,
 * 실제 billingKey 발급/구독 생성(BFF 호출)은 하지 않는다. 심사 통과 후 라우트 제거 예정.
 */
export default async function BillingDemoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { step, authKey, customerKey, message } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <CreditCard className="w-7 h-7 text-brand" aria-hidden="true" />
          </div>
          <h1 className="text-[20px] font-bold tracking-tight text-zinc-900">
            플로리 빌링 결제창 연동 데모
          </h1>
          <p className="mt-2 text-sm text-zinc-500 break-keep">
            토스페이먼츠 자동결제(빌링) 카드 등록 인증창 연동 확인용 페이지입니다.
          </p>
        </div>

        {step === 'success' ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-emerald-900">빌링 인증창 연동 정상</p>
            <p className="mt-1 text-[13px] text-emerald-800">
              카드 등록(빌링키 발급) 인증이 완료되었습니다.
            </p>
            {(authKey || customerKey) && (
              <div className="mt-3 rounded-lg bg-white/70 border border-emerald-100 p-3 text-left">
                {authKey && (
                  <p className="text-[11px] text-emerald-900 break-all">
                    <span className="font-semibold">authKey</span> · {authKey}
                  </p>
                )}
                {customerKey && (
                  <p className="mt-1 text-[11px] text-emerald-900 break-all">
                    <span className="font-semibold">customerKey</span> · {customerKey}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : step === 'fail' ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-center">
            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-red-900">인증 취소 또는 실패</p>
            {message && <p className="mt-1 text-[13px] text-red-800 break-keep">{message}</p>}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center">
            <BillingDemoButton />
            <p className="mt-3 text-[11px] text-zinc-400">
              테스트 카드로 등록 인증을 진행할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
