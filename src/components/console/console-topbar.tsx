'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, Moon, RefreshCw, Sun } from 'lucide-react';

function getInitial(email: string): string {
  return (email[0] || '?').toUpperCase();
}

export function ConsoleTopbar({
  title,
  subtitle,
  userEmail,
  onMenu,
}: {
  title: string;
  subtitle: string;
  userEmail: string;
  onMenu: () => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [stamp, setStamp] = useState('');

  const updateStamp = () => setStamp(new Date().toLocaleTimeString('ko-KR', { hour12: false }));

  useEffect(() => {
    // 마운트 후에만 시각 표기(SSR 하이드레이션 불일치 방지)
    updateStamp();
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        {/* 모바일: 햄버거(Sheet 열기) */}
        <button
          type="button"
          onClick={onMenu}
          aria-label="메뉴 열기"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {stamp && <span className="hidden text-[11.5px] text-muted-foreground sm:inline">데이터 기준 {stamp}</span>}
        <button
          type="button"
          onClick={() => {
            router.refresh();
            updateStamp();
          }}
          aria-label="새로고침"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-[15px] w-[15px]" />
        </button>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="테마 변경"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground"
          title={userEmail}
        >
          {getInitial(userEmail)}
        </div>
      </div>
    </header>
  );
}
