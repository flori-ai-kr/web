'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import NextImage from 'next/image';
import {
    CalendarDays,
    ChevronsLeft,
    ChevronsRight,
    Heart,
    Image,
    LayoutDashboard,
    Receipt,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Tooltip, TooltipContent, TooltipTrigger,} from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const dashboardItem: NavItem = { href: '/admin', icon: LayoutDashboard, label: '대시보드' };

const navSections: NavSection[] = [
  {
    title: '매장 운영',
    items: [
      { href: '/admin/calendar', icon: CalendarDays, label: '캘린더' },
      { href: '/admin/sales', icon: Receipt, label: '매출관리' },
      { href: '/admin/expenses', icon: Wallet, label: '지출관리' },
    ],
  },
  {
    title: '고객 기록',
    items: [
      { href: '/admin/customers', icon: Users, label: '고객관리' },
      { href: '/admin/gallery', icon: Image, label: '사진첩' },
    ],
  },
  {
    title: '인사이트',
    items: [
      { href: '/admin/insights', icon: TrendingUp, label: '인사이트' },
      { href: '/admin/insights/trends', icon: Sparkles, label: '트렌드' },
      { href: '/admin/insights/follows', icon: Heart, label: '팔로우' },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userEmail: string;
}

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 min-h-[44px] rounded-lg text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
        isActive
          ? 'bg-accent text-foreground font-semibold'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-brand',
          isCollapsed ? 'h-4' : 'h-5'
        )} />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span>{label}</span>}
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

function getInitial(email: string): string {
  return (email[0] || '?').toUpperCase();
}

export function Sidebar({ isCollapsed, onToggleCollapse, userEmail }: SidebarProps) {
  const pathname = usePathname();

  // 가장 구체적으로 매칭되는 항목 하나만 활성화 (중첩 라우트 대응)
  const allHrefs: string[] = [
    dashboardItem.href,
    ...navSections.flatMap((s) => s.items.map((i) => i.href)),
  ];
  const bestMatchHref = allHrefs
    .filter((href) => pathname === href || (href !== '/admin' && pathname.startsWith(href + '/')))
    .reduce<string | null>((best, cur) => (best && best.length >= cur.length ? best : cur), null);

  return (
    <>
      {/* Desktop sidebar only — mobile uses BottomNav */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200 ease-in-out hidden lg:block',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn(
            'h-14 flex items-center border-b border-sidebar-border shrink-0',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}>
            <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-brand-muted rounded-lg flex items-center justify-center shrink-0">
                <NextImage src="/flori-logo.png" alt="flori" width={26} height={26} className="object-contain" />
              </div>
              {!isCollapsed && (
                <span className="text-lg font-semibold text-foreground truncate tracking-tight">flori</span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4" aria-label="주요 네비게이션">
            {/* Dashboard (standalone) */}
            <div className={cn('mb-3', isCollapsed ? 'px-2' : 'px-3')}>
              <NavLink
                href={dashboardItem.href}
                icon={dashboardItem.icon}
                label={dashboardItem.label}
                isActive={bestMatchHref === dashboardItem.href}
                isCollapsed={isCollapsed}
              />
            </div>

            {navSections.map((section, idx) => (
              <div key={section.title} className={cn(idx > 0 && 'mt-4')}>
                {/* Section title */}
                {!isCollapsed && (
                  <div className="px-4 mb-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {section.title}
                    </span>
                  </div>
                )}
                {isCollapsed && idx > 0 && (
                  <div className="mx-3 mb-2 border-t border-sidebar-border" />
                )}

                {/* Items */}
                <div className={cn('space-y-0.5', isCollapsed ? 'px-2' : 'px-3')}>
                  {section.items.map((item) => {
                    const isActive = bestMatchHref === item.href;
                    return (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={isActive}
                        isCollapsed={isCollapsed}
                              />
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom section */}
          <div className={cn('border-t border-sidebar-border py-3', isCollapsed ? 'px-2' : 'px-3')}>
            {/* User avatar + email */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center py-1.5">
                    <div className="w-8 h-8 rounded-full bg-brand text-brand-foreground font-semibold text-sm flex items-center justify-center shrink-0">
                      {getInitial(userEmail)}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {userEmail}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2.5 px-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-brand text-brand-foreground font-semibold text-sm flex items-center justify-center shrink-0">
                  {getInitial(userEmail)}
                </div>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </div>
            )}

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
              className={cn(
                'hidden lg:flex items-center gap-3 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full mt-1',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4 shrink-0" />
                  <span>접기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
