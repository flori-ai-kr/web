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
  // [AI 기능 비활성화] Activity,
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    title: '시스템',
    items: [{ href: '/console/audit-logs', label: '감사 로그', icon: History }],
  },
  // [AI 기능 비활성화] AI 헬스 네비 — 출시 시 제거
];

function isActive(pathname: string, href: string): boolean {
  return href === '/console' ? pathname === href : pathname.startsWith(href);
}

/** 사이드바 네비 링크. 접힘 시 아이콘만 + Tooltip(side="right"). */
function NavLink({
  href,
  icon: Icon,
  label,
  active,
  isCollapsed,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
        active
          ? 'bg-brand-muted text-brand'
          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
      {!isCollapsed && label}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

/**
 * 사이드바 내부 콘텐츠(데스크톱 aside + 모바일 Sheet 공용).
 * - isCollapsed: 데스크톱 레일(아이콘만) 모드. 모바일 Sheet는 항상 false(풀).
 * - onToggleCollapse: 주어지면(데스크톱 전용) 하단 접기/펴기 토글 노출.
 */
export function SidebarContent({
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  const backLink = (
    <Link
      href="/admin"
      onClick={onNavigate}
      aria-label={isCollapsed ? '점주 화면으로' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-lg text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {!isCollapsed && '점주 화면으로'}
    </Link>
  );

  return (
    <div className="flex h-full flex-col">
      {/* 헤더: 접힘 시 OPS 배지만 가운데, 펼침 시 배지 + 제목 */}
      <div
        className={cn(
          'flex items-center gap-2 pb-4 pt-1',
          isCollapsed ? 'justify-center px-0' : 'px-2'
        )}
      >
        <span className="rounded-md bg-brand px-2 py-1 text-[10px] font-bold tracking-wider text-brand-foreground">
          OPS
        </span>
        {!isCollapsed && (
          <span className="font-serif text-base font-semibold text-foreground">flori 운영 콘솔</span>
        )}
      </div>

      <nav aria-label="콘솔 내비게이션" className="flex flex-1 flex-col gap-1">
        {GROUPS.map((group, gi) => (
          <div key={group.title ?? `g${gi}`}>
            {/* 그룹 타이틀: 펼침 시 텍스트, 접힘 시 구분선으로 대체 */}
            {!isCollapsed && group.title && (
              <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </div>
            )}
            {isCollapsed && gi > 0 && <div className="mx-2 my-2 border-t border-border" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(pathname, item.href)}
                    isCollapsed={isCollapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        {/* 하단 접기/펴기 토글(레일에 상주, 데스크톱 전용) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            aria-expanded={!isCollapsed}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
            )}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden />
                접기
              </>
            )}
          </button>
        )}

        {/* '점주 화면으로': 접힘 시 아이콘만 + Tooltip */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{backLink}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              점주 화면으로
            </TooltipContent>
          </Tooltip>
        ) : (
          backLink
        )}
      </div>
    </div>
  );
}

/** 데스크톱 고정 사이드바. 접힘 시 아이콘만 남는 레일(w-16). */
export function ConsoleSidebar({
  isCollapsed,
  onToggleCollapse,
  mounted = false,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** 마운트 전(첫 페인트)엔 트랜지션을 끄고 폭만 즉시 반영 → FOUC 방지 */
  mounted?: boolean;
}) {
  return (
    <aside
      suppressHydrationWarning
      className={cn(
        'hidden shrink-0 border-r border-border bg-card md:block',
        mounted ? 'transition-[width] duration-200 ease-in-out' : 'transition-none',
        isCollapsed ? 'w-16 px-2 py-4' : 'w-60 p-4'
      )}
    >
      <div className="sticky top-4 h-[calc(100vh-2rem)]">
        <SidebarContent isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
      </div>
    </aside>
  );
}
