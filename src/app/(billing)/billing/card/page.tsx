import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {ChangeCardClient} from './change-card-client';

export const metadata: Metadata = {title: '카드 교체'};

interface SearchParams {
  authKey?: string;
  customerKey?: string;
}

/**
 * /billing/card — 토스 카드 재등록(빌링 재인증) 복귀 랜딩.
 * authKey·customerKey가 누락되면 fail로 redirect, 있으면 클라이언트에서 changeCard()를 호출한다.
 * (billing) 라우트 그룹 레이아웃(BrandMark + 로그아웃)을 그대로 사용.
 */
export default async function BillingCardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {authKey, customerKey} = await searchParams;

  if (!authKey || !customerKey) {
    redirect('/billing/fail');
  }

  return <ChangeCardClient authKey={authKey} customerKey={customerKey} />;
}
