'use client';

import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import Image from 'next/image';
import {Bell, CalendarDays, LogOut, Moon, Settings, ShieldCheck, Sun, User} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Popover, PopoverContent, PopoverTrigger,} from '@/components/ui/popover';
import Link from 'next/link';
import {useTheme} from 'next-themes';
import {signOut} from '@/lib/actions/auth';
import {getTriggeredReminders} from '@/lib/actions/reservations';
import {checkIsAdmin} from '@/lib/admin-guard';
import type {Reservation} from '@/types/database';

interface HeaderProps {
  userEmail: string;
  userName?: string;
  userImage?: string;
}

function getInitial(name?: string, email?: string): string {
  const source = name || email || '?'
  return source[0].toUpperCase()
}

export function Header({ userEmail, userName, userImage }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [reminders, setReminders] = useState<Reservation[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  // 운영자(is_admin)에게만 "운영 콘솔" 진입 링크를 노출. 점주에겐 false로 숨김.
  const [isAdmin, setIsAdmin] = useState(false);
  const LAST_READ_KEY = 'hazel-reminder-last-read';

  const fetchReminders = useCallback(async () => {
    try {
      const data = await getTriggeredReminders();
      // localStorage의 마지막 읽은 시간 이후 리마인더만 표시
      const lastRead = localStorage.getItem(LAST_READ_KEY);
      if (lastRead) {
        const cutoff = new Date(lastRead);
        const unread = data.filter((r) => r.reminder_at && new Date(r.reminder_at) > cutoff);
        setReminders(unread);
      } else {
        setReminders(data);
      }
    } catch {
      // 조용히 실패
    }
  }, []);

  useEffect(() => {
    fetchReminders(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch on mount
  }, [fetchReminders]);

  useEffect(() => {
    // 운영자 여부 조회(실패/비운영자는 false 유지 → 링크 숨김)
    checkIsAdmin()
      .then((v) => setIsAdmin(v))
      .catch(() => {});
  }, []);

  // Popover open/close 핸들러
  const handleNotifOpenChange = useCallback((open: boolean) => {
    setNotifOpen(open);
    if (open) {
      fetchReminders();
    } else {
      setReminders((prev) => {
        if (prev.length > 0) {
          localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
        }
        return [];
      });
    }
  }, [fetchReminders]);

  const unreadCount = reminders.length;

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 border-b border-sidebar-border bg-sidebar">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left: brand (탭 → 대시보드) */}
        <Link href="/admin" className="flex items-center gap-2 shrink-0" aria-label="대시보드로 이동">
          <svg viewBox="0 0 100 100" width={28} height={28} aria-hidden="true" className="shrink-0">
            <defs>
              <path id="flori-petal" d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z" />
            </defs>
            <g transform="translate(0 3.5)">
              <use href="#flori-petal" fill="#A85475" />
              <use href="#flori-petal" transform="rotate(72 50 50)" fill="#E0739A" />
              <use href="#flori-petal" transform="rotate(144 50 50)" fill="#A85475" />
              <use href="#flori-petal" transform="rotate(216 50 50)" fill="#E0739A" />
              <use href="#flori-petal" transform="rotate(288 50 50)" fill="#8E3F5F" />
              <circle cx="50" cy="50" r="6" fill="#ffffff" />
              <circle cx="50" cy="50" r="3.2" fill="#A85475" />
            </g>
          </svg>
          <span
            className="font-display text-[24px] font-semibold text-foreground leading-none"
            style={{fontVariantLigatures: 'none', letterSpacing: '0.2rem'}}
          >
            flori<span className="text-brand">.</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Notification bell */}
          <Popover open={notifOpen} onOpenChange={handleNotifOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
                aria-label="알림"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
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
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            isCompleted ? 'bg-success text-success-foreground' :
                            r.status === 'confirmed' ? 'bg-info text-info-foreground' :
                            'bg-warning text-warning-foreground'
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
                  href="/admin/calendar"
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
                className="w-8 h-8 rounded-full bg-muted border border-border font-semibold text-sm flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
                aria-label="사용자 메뉴"
              >
                {userImage ? (
                  <Image src={userImage} alt="프로필" width={32} height={32} className="w-full h-full object-contain" unoptimized />
                ) : (
                  <span className="text-muted-foreground">{getInitial(userName, userEmail)}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  프로필 정보
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/console" className="cursor-pointer">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    운영 콘솔
                  </Link>
                </DropdownMenuItem>
              )}
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
