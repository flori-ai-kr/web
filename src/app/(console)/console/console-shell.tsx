'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/console', label: '개요' },
  { href: '/console/verifications', label: '사업자 인증' },
  { href: '/console/users', label: '유저' },
  { href: '/console/subscriptions', label: '구독' },
  { href: '/console/health', label: 'AI 헬스' },
];

// 점주 어드민(Rose 톤)과 시각적으로 구분되는 중립 dark "운영툴" 셸.
export function ConsoleShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-semibold tracking-wide">OPS</span>
          <span className="text-sm font-medium">flori 운영 콘솔</span>
        </div>
        <span className="text-xs text-zinc-400">{userEmail}</span>
      </header>
      <div className="flex">
        <nav aria-label="콘솔 내비게이션" className="w-48 shrink-0 border-r border-zinc-800 p-3">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active =
                item.href === '/console' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded px-3 py-2 text-sm ${
                      active
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
