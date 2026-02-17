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
import { getTriggeredReminders } from '@/lib/actions';
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
  const [reminders, setReminders] = useState<Reservation[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await getTriggeredReminders();
      setReminders(data);
    } catch {
      // 조용히 실패
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Popover 열 때 새로고침
  useEffect(() => {
    if (notifOpen) fetchReminders();
  }, [notifOpen, fetchReminders]);

  const unhandledCount = reminders.filter((r) => r.status !== 'completed').length;

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
                {unhandledCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center">
                    {unhandledCount > 9 ? '9+' : unhandledCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">리마인더 알림</h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {reminders.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    발동된 리마인더가 없습니다
                  </p>
                ) : (
                  reminders.map((r) => {
                    const reminderTime = r.reminder_at ? new Date(r.reminder_at) : null;
                    const isCompleted = r.status === 'completed';
                    return (
                      <div key={r.id} className={`px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50 ${isCompleted ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium truncate ${isCompleted ? 'line-through' : ''}`}>{r.title}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            isCompleted ? 'bg-green-600 text-white dark:bg-green-700 dark:text-white' :
                            r.status === 'confirmed' ? 'bg-blue-600 text-white dark:bg-blue-700 dark:text-white' :
                            'bg-amber-500 text-white dark:bg-amber-600 dark:text-white'
                          }`}>
                            {isCompleted ? '픽업 완료' : r.status === 'confirmed' ? '픽업 필요' : '제작 필요'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {reminderTime && (
                            <span>
                              {reminderTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}{' '}
                              {reminderTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          )}
                          {r.customer_name && <span>· {r.customer_name}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground/70">
                          <span>픽업 {r.date} {r.time ? r.time.slice(0, 5) : ''}</span>
                          {r.amount ? <span>· {new Intl.NumberFormat('ko-KR').format(r.amount)}원</span> : null}
                        </div>
                      </div>
                    );
                  })
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
