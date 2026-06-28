import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-guard';
import { signOut } from '@/lib/actions/auth';

export const metadata: Metadata = {
  title: { template: '%s · flori', default: 'flori' },
};

/** flori 로고+워드마크 — 네비 없는 집중 화면 상단용 */
function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" width={28} height={28} aria-hidden="true" className="shrink-0">
        <defs>
          <path
            id="flori-petal-billing"
            d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z"
          />
        </defs>
        <g transform="translate(0 3.5)">
          <use href="#flori-petal-billing" fill="#A85475" />
          <use href="#flori-petal-billing" transform="rotate(72 50 50)" fill="#E0739A" />
          <use href="#flori-petal-billing" transform="rotate(144 50 50)" fill="#A85475" />
          <use href="#flori-petal-billing" transform="rotate(216 50 50)" fill="#E0739A" />
          <use href="#flori-petal-billing" transform="rotate(288 50 50)" fill="#8E3F5F" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
          <circle cx="50" cy="50" r="3.2" fill="#A85475" />
        </g>
      </svg>
      <span
        className="font-display text-[24px] font-semibold text-foreground leading-none"
        style={{ fontVariantLigatures: 'none', letterSpacing: '0.2rem' }}
      >
        flori<span className="text-brand">.</span>
      </span>
    </div>
  );
}

/**
 * (billing) 라우트 그룹 레이아웃.
 * - requireAuth()만 적용 (구독 게이트 없음 — 토스 복귀 시 미구독 상태로 진입)
 * - 사이드바·BottomNav 없는 최소 셸
 */
export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="min-h-dvh flex flex-col items-center overflow-y-auto bg-background px-4 py-10">
      <div className="mb-8 shrink-0">
        <BrandMark />
      </div>
      <main className="flex w-full max-w-lg flex-1 flex-col">{children}</main>
      <form action={signOut}>
        <button
          type="submit"
          className="mt-8 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          로그아웃
        </button>
      </form>
    </div>
  );
}
