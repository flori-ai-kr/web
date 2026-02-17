'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, Settings, Sun, Moon, LogOut, Bell, CalendarDays, Flower2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signOut } from '@/lib/actions/auth';
import { getReservations } from '@/lib/actions';
import { getTodayKST } from '@/lib/utils';
import type { Reservation } from '@/types/database';

interface HeaderProps {
  onMenuClick: () => void;
  userEmail: string;
}

const pageTitles: Record<string, string> = {
  '/': '대시보드',
  '/calendar': '캘린더',
  '/sales': '매출 관리',
  '/expenses': '지출 관리',
  '/customers': '고객 관리',
  '/deposits': '입금 대조',
  '/gallery': '사진첩',
  '/settings': '설정',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }
  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== '/' && pathname.startsWith(path)) {
      return title;
    }
  }
  return '헤이즐 어드민';
}

function getInitial(email: string): string {
  return (email[0] || '?').toUpperCase();
}

export function Header({ onMenuClick, userEmail }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchTodayReservations = useCallback(async () => {
    try {
      const today = getTodayKST();
      const month = today.slice(0, 7);
      const all = await getReservations(month);
      const todayItems = all
        .filter((r) => r.date === today && r.status !== 'cancelled')
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setTodayReservations(todayItems);
    } catch {
      // 조용히 실패
    }
  }, []);

  useEffect(() => {
    fetchTodayReservations();
  }, [fetchTodayReservations]);

  // Popover 열 때 새로고침
  useEffect(() => {
    if (notifOpen) fetchTodayReservations();
  }, [notifOpen, fetchTodayReservations]);

  const pendingCount = todayReservations.filter((r) => r.status === 'pending' || r.status === 'confirmed').length;

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={onMenuClick}
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {/* 모바일: 로고 + Hazel (대시보드 링크) */}
          <Link href="/" className="lg:hidden flex items-center gap-2 shrink-0" aria-label="대시보드로 이동">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <Flower2 className="h-4.5 w-4.5 text-brand-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">Hazel</span>
          </Link>
          {/* 데스크탑: 페이지 타이틀 */}
          <h1 className="hidden lg:block text-sm font-semibold text-foreground truncate">
            {pageTitle}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Notification bell */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
                aria-label="알림"
              >
                <Bell className="h-5 w-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">오늘 예약</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {todayReservations.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    오늘 예약이 없습니다
                  </p>
                ) : (
                  todayReservations.map((r) => (
                    <div key={r.id} className="px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{r.title}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                          r.status === 'completed' ? 'bg-green-600 text-white dark:bg-green-700 dark:text-white' :
                          r.status === 'confirmed' ? 'bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' :
                          'bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                          {r.status === 'completed' ? '완료' : r.status === 'confirmed' ? '확정' : '대기'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{r.time ? r.time.slice(0, 5) : '--:--'}</span>
                        {r.customer_name && <span>{r.customer_name}</span>}
                        {r.amount ? <span>{new Intl.NumberFormat('ko-KR').format(r.amount)}원</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <Link
                  href="/calendar"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  캘린더에서 보기
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="테마 변경"
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <div className="w-1.5" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-full bg-brand text-brand-foreground font-semibold text-sm flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="사용자 메뉴"
              >
                {getInitial(userEmail)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
