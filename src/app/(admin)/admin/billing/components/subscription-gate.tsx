'use client';

import {LogOut} from 'lucide-react';
import {signOut} from '@/lib/actions/auth';
import {BillingCheckout} from './billing-checkout';

/** flori 로고+워드마크 (헤더와 동일한 5장 꽃잎 SVG). 네비 없는 페이월 화면 상단용. */
function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" width={28} height={28} aria-hidden="true" className="shrink-0">
        <defs>
          <path
            id="flori-petal-paywall"
            d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z"
          />
        </defs>
        <g transform="translate(0 3.5)">
          <use href="#flori-petal-paywall" fill="#A85475" />
          <use href="#flori-petal-paywall" transform="rotate(72 50 50)" fill="#E0739A" />
          <use href="#flori-petal-paywall" transform="rotate(144 50 50)" fill="#A85475" />
          <use href="#flori-petal-paywall" transform="rotate(216 50 50)" fill="#E0739A" />
          <use href="#flori-petal-paywall" transform="rotate(288 50 50)" fill="#8E3F5F" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
          <circle cx="50" cy="50" r="3.2" fill="#A85475" />
        </g>
      </svg>
      <span
        className="font-display text-[24px] font-semibold text-foreground leading-none"
        style={{fontVariantLigatures: 'none', letterSpacing: '0.2rem'}}
      >
        flori<span className="text-brand">.</span>
      </span>
    </div>
  );
}

/**
 * 구독 페이월 게이트(풀스크린, AppLayout 없음).
 * 사업자 인증(APPROVED) 통과 후, 구독이 없거나(NONE) 만료(EXPIRED)된 점주가 마주하는 화면.
 * BusinessVerificationGate의 GateShell 패턴(브랜드마크 상단 + 로그아웃 하단)을 따른다.
 * 플랜 선택 + 토스 시작은 T2 BillingCheckout 컴포넌트가 담당.
 */
export function SubscriptionGate({status}: {status: 'EXPIRED' | 'NONE'}) {
  return (
    <div className="min-h-dvh flex flex-col items-center overflow-y-auto bg-background px-4 py-10">
      <div className="mb-2 shrink-0">
        <BrandMark />
      </div>
      <main className="flex w-full max-w-md flex-1 flex-col justify-center">
        <BillingCheckout variant={status === 'EXPIRED' ? 'expired' : 'none'} />
      </main>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-2 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
        로그아웃
      </button>
    </div>
  );
}
