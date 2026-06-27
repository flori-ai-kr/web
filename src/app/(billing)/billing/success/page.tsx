import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SubscribeClient } from './subscribe-client';

export const metadata: Metadata = { title: '체험 시작' };

interface SearchParams {
  authKey?: string;
  customerKey?: string;
  plan?: string;
}

/**
 * /billing/success — 토스가 authKey·customerKey·plan을 쿼리로 붙여 복귀하는 랜딩.
 *
 * ⚠️ subscribe()를 여기서 직접 호출하면 안 됨: subscribe() 내부에서 revalidatePath()를
 * 호출하는데, Server Component 렌더 중 revalidatePath()는 "cannot be called during render"
 * 에러를 던진다. 그래서 subscribe 호출은 클라이언트 컴포넌트(SubscribeClient)의
 * useEffect 마운트 시점에 위임한다.
 */
export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { authKey, customerKey, plan } = await searchParams;

  // 필수 파라미터 누락 시 fail로 redirect
  if (!authKey || !customerKey || !plan) {
    redirect('/billing/fail');
  }

  return (
    <SubscribeClient
      authKey={authKey}
      customerKey={customerKey}
      plan={plan}
    />
  );
}
