'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileCheck,
  Users,
  CreditCard,
  ShieldAlert,
  Megaphone,
  ScrollText,
  BellRing,
  Inbox,
  History,
  Sparkles,
  // [AI 기능 비활성화] Activity,
  ArrowLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavGroup {
  title?: string;
  items: NavItem[];
}

// 실제 존재하는 콘솔 라우트만 그룹핑(죽은 링크 금지).
const GROUPS: NavGroup[] = [
  { items: [{ href: '/console', label: '개요', icon: LayoutDashboard }] },
  {
    title: '운영',
    items: [
      { href: '/console/verifications', label: '사업자 인증', icon: FileCheck },
      { href: '/console/users', label: '유저 관리', icon: Users },
      { href: '/console/subscriptions', label: '구독 현황', icon: CreditCard },
    ],
  },
  {
    title: '커뮤니티',
    items: [{ href: '/console/moderation', label: '모더레이션', icon: ShieldAlert }],
  },
  {
    title: '알림',
    items: [
      { href: '/console/broadcasts', label: '브로드캐스트', icon: BellRing },
      { href: '/console/notification-logs', label: '발송 로그', icon: ScrollText },
    ],
  },
  {
    title: '콘텐츠',
    items: [
      { href: '/console/announcements', label: '공지 배너', icon: Megaphone },
      { href: '/console/inquiries', label: '문의 인박스', icon: Inbox },
    ],
  },
  {
    title: 'AI',
    items: [{ href: '/console/prompts', label: '프롬프트', icon: Sparkles }],
  },
  {
    title: '시스템',
    items: [{ href: '/console/audit-logs', label: '감사 로그', icon: History }],
  },
  // [AI 기능 비활성화] AI 헬스 네비 — 출시 시 제거
];

function isActive(pathname: string, href: string): boolean {
  return href === '/console' ? pathname === href : pathname.startsWith(href);
}

/** 사이드바 내부 콘텐츠(데스크톱 aside + 모바일 Sheet 공용). */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 pb-4 pt-1">
        <span className="rounded-md bg-brand px-2 py-1 text-[10px] font-bold tracking-wider text-brand-foreground">
          OPS
        </span>
        <span className="font-serif text-base font-semibold text-foreground">flori 운영 콘솔</span>
      </div>

      <nav aria-label="콘솔 내비게이션" className="flex flex-1 flex-col gap-1">
        {GROUPS.map((group, gi) => (
          <div key={group.title ?? `g${gi}`}>
            {group.title && (
              <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        active
                          ? 'bg-brand-muted text-brand'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          점주 화면으로
        </Link>
      </div>
    </div>
  );
}

/** 데스크톱 고정 사이드바. */
export function ConsoleSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:block">
      <div className="sticky top-4 h-[calc(100vh-2rem)]">
        <SidebarContent />
      </div>
    </aside>
  );
}
