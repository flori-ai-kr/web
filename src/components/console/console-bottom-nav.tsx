'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  FileCheck,
  LayoutDashboard,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CONSOLE_NAV_GROUPS, isActive } from './console-sidebar';

// 하단바에 상시 노출할 콘솔 핵심 4개(짧은 라벨). 나머지는 '더보기' 시트로.
const PRIMARY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/console', label: '개요', icon: LayoutDashboard },
  { href: '/console/users', label: '유저', icon: Users },
  { href: '/console/subscriptions', label: '구독', icon: CreditCard },
  { href: '/console/verifications', label: '인증', icon: FileCheck },
];

const PRIMARY_HREFS = new Set(PRIMARY.map((p) => p.href));

/**
 * 콘솔 모바일 하단 네비게이션 — 점주(/admin) BottomNav 패턴과 동일.
 * 핵심 4개 탭 + '더보기' 시트(나머지 콘솔 메뉴 그룹 + 점주 화면으로).
 * 데스크톱(lg+)은 좌측 사이드바를 쓰므로 lg:hidden.
 */
export function ConsoleBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // 더보기 시트에 들어갈 그룹(핵심 4개 제외). 빈 그룹은 제거.
  const moreGroups = useMemo(
    () =>
      CONSOLE_NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => !PRIMARY_HREFS.has(it.href)),
      })).filter((g) => g.items.length > 0),
    [],
  );

  // 현재 경로가 핵심 4개 중 하나에 속하지 않으면(=숨은 메뉴) '더보기'를 활성 표시.
  const onHidden = !PRIMARY.some((p) => isActive(pathname, p.href));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur-sm lg:hidden pb-[max(env(safe-area-inset-bottom),0.5rem)]"
        aria-label="콘솔 하단 네비게이션"
      >
        <div className="grid h-16 grid-cols-5 px-1">
          {PRIMARY.map((item) => (
            <NavTab
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActive(pathname, item.href)}
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="더보기 메뉴"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 min-w-0 min-h-[44px] py-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              onHidden ? 'text-brand' : 'text-muted-foreground active:text-foreground',
            )}
          >
            <MoreHorizontal className={cn('h-5 w-5 shrink-0', onHidden && 'stroke-[2.5]')} aria-hidden="true" />
            <span className={cn('text-[11px] leading-tight', onHidden ? 'font-semibold' : 'font-medium')}>
              더보기
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>운영 콘솔 메뉴</SheetTitle>
            <SheetDescription>하단바에 없는 메뉴를 한 번에 열 수 있어요</SheetDescription>
          </SheetHeader>

          <div className="max-h-[60vh] overflow-y-auto px-4 pt-3 pb-5 space-y-4">
            {moreGroups.map((group, gi) => (
              <div key={group.title ?? `g${gi}`}>
                {group.title && (
                  <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors active:bg-accent',
                            active ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-card text-foreground',
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                          <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-border">
              <SheetClose asChild>
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>점주 화면으로</span>
                </Link>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavTab({
  href,
  icon: Icon,
  label,
  isActive: active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 min-w-0 min-h-[44px] py-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active ? 'text-brand' : 'text-muted-foreground active:text-foreground',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} aria-hidden="true" />
      <span className={cn('text-[11px] leading-tight truncate max-w-full', active ? 'font-semibold' : 'font-medium')}>
        {label}
      </span>
    </Link>
  );
}
