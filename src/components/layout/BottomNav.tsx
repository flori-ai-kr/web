'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    CalendarDays,
    Heart,
    Image as ImageIcon,
    LayoutDashboard,
    MoreHorizontal,
    Receipt,
    Settings as SettingsIcon,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {DEFAULT_BOTTOM_NAV_ITEMS, NAV_ITEM_HREFS, NAV_ITEM_LABELS, type NavItemKey,} from '@/types/database';
import {Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle,} from '@/components/ui/sheet';

const ICON_MAP: Record<NavItemKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  sales: Receipt,
  expenses: Wallet,
  customers: Users,
  gallery: ImageIcon,
  insights: TrendingUp,
  follows: Heart,
};

const ALL_NAV_ITEMS: NavItemKey[] = [
  'dashboard',
  'calendar',
  'sales',
  'expenses',
  'customers',
  'gallery',
  'insights',
  'follows',
];

interface BottomNavProps {
  items?: NavItemKey[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const displayedItems = useMemo(() => {
    const source = items && items.length >= 4 ? items : DEFAULT_BOTTOM_NAV_ITEMS;
    return source.slice(0, 6);
  }, [items]);

  const hiddenItems = useMemo(() => {
    const displayed = new Set(displayedItems);
    return ALL_NAV_ITEMS.filter((key) => !displayed.has(key));
  }, [displayedItems]);

  const bestMatchHref = useMemo(() => {
    const candidates: string[] = displayedItems.map((k) => NAV_ITEM_HREFS[k]);
    return candidates
      .filter((href) => pathname === href || (href !== '/admin' && pathname.startsWith(href + '/')))
      .reduce<string | null>((best, cur) => (best && best.length >= cur.length ? best : cur), null);
  }, [pathname, displayedItems]);

  // 총 컬럼: items + 더보기
  const totalCols = displayedItems.length + 1;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden pb-[max(env(safe-area-inset-bottom),0.5rem)]"
        aria-label="하단 네비게이션"
      >
        <div
          className="grid h-16 px-1"
          style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
        >
          {displayedItems.map((key) => (
            <NavTab
              key={key}
              href={NAV_ITEM_HREFS[key]}
              icon={ICON_MAP[key]}
              label={NAV_ITEM_LABELS[key]}
              isActive={bestMatchHref === NAV_ITEM_HREFS[key]}
            />
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="더보기 메뉴"
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 min-w-0 py-2 transition-colors',
              'text-muted-foreground active:text-foreground',
            )}
          >
            <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-[11px] leading-tight font-medium">더보기</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>더보기</SheetTitle>
            <SheetDescription>하단바에 없는 메뉴를 한 번에 열 수 있어요</SheetDescription>
          </SheetHeader>

          <div className="px-4 pt-3 pb-5 space-y-4">
            {hiddenItems.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {hiddenItems.map((key) => {
                  const Icon = ICON_MAP[key];
                  return (
                    <SheetClose asChild key={key}>
                      <Link
                        href={NAV_ITEM_HREFS[key]}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-colors active:bg-accent"
                      >
                        <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-foreground text-center">
                          {NAV_ITEM_LABELS[key]}
                        </span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <SheetClose asChild>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <SettingsIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>설정</span>
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
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 min-w-0 py-2 transition-colors',
        isActive ? 'text-brand' : 'text-muted-foreground active:text-foreground',
      )}
    >
      <Icon
        className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.5]')}
        aria-hidden="true"
      />
      <span
        className={cn(
          'text-[11px] leading-tight truncate max-w-full',
          isActive ? 'font-semibold' : 'font-medium',
        )}
      >
        {label}
      </span>
    </Link>
  );
}
