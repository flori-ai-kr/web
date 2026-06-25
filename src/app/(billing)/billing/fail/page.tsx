import type { Metadata } from 'next';
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: '결제 실패' };

interface SearchParams {
  code?: string;
  message?: string;
}

/**
 * /billing/fail — 토스 카드 등록 실패 또는 subscribe() 오류 시 최종 랜딩.
 * [다시 시도] → /admin (페이월이 다시 체크아웃을 제시)
 */
export default async function BillingFailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { code, message } = await searchParams;

  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      <div className="w-16 h-16 rounded-full bg-danger-soft flex items-center justify-center mb-4">
        <XCircle className="w-8 h-8 text-danger" aria-hidden="true" />
      </div>
      <h1 className="text-[22px] font-bold text-foreground tracking-tight">
        결제 등록에 실패했어요
      </h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        카드 정보를 확인한 뒤 다시 시도해주세요.
      </p>

      {(code ?? message) && (
        <div className="mt-5 w-full max-w-sm rounded-xl border border-danger-soft bg-danger-soft/60 p-4 text-left">
          {message && (
            <p className="text-sm font-semibold text-danger">{message}</p>
          )}
          {code && (
            <p className="text-[11px] text-muted-foreground font-mono mt-1">
              code: {code}
            </p>
          )}
        </div>
      )}

      <Button
        asChild
        className="mt-6 h-12 px-8 text-[15px] font-semibold bg-brand text-white hover:bg-brand/90"
      >
        <Link href="/admin">다시 시도하기</Link>
      </Button>
    </div>
  );
}
