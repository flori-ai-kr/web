'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {CalendarDays, CreditCard, Flower2, Image, Receipt, Users, Wallet,} from 'lucide-react';
import {cn} from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const leftItems: NavItem[] = [
  { href: '/calendar', icon: CalendarDays, label: '캘린더' },
  { href: '/sales', icon: Receipt, label: '매출' },
  { href: '/expenses', icon: Wallet, label: '지출' },
];

const rightItems: NavItem[] = [
  { href: '/deposits', icon: CreditCard, label: '입금' },
  { href: '/customers', icon: Users, label: '고객' },
  { href: '/gallery', icon: Image, label: '사진첩' },
];

function NavTab({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 transition-colors',
        isActive
          ? 'text-brand'
          : 'text-muted-foreground active:text-foreground'
      )}
    >
      <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.5]')} />
      <span
        className={cn(
          'text-[10px] leading-tight truncate max-w-full',
          isActive ? 'font-semibold' : 'font-medium'
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const checkActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== '/' && pathname.startsWith(item.href));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="하단 네비게이션"
    >
      <div className="flex items-center justify-around px-1 h-14 pb-[5px]">
        {/* Left 3 items */}
        {leftItems.map((item) => (
          <NavTab key={item.href} item={item} isActive={checkActive(item)} />
        ))}

        {/* Center home button */}
        <Link
          href="/"
          className={cn(
            'relative flex flex-col items-center justify-center min-w-0 flex-1'
          )}
          aria-label="대시보드"
        >
          <div
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors',
              'bg-brand text-brand-foreground'
            )}
          >
            <Flower2 className="h-5.5 w-5.5" />
          </div>
        </Link>

        {/* Right 3 items */}
        {rightItems.map((item) => (
          <NavTab key={item.href} item={item} isActive={checkActive(item)} />
        ))}
      </div>
    </nav>
  );
}
