'use client';

import {useState} from 'react';
import {Sidebar} from './Sidebar';
import {Header} from './Header';
import {BottomNav} from './BottomNav';
import {AppFooter} from './AppFooter';
import {cn} from '@/lib/utils';
import type {NavItemKey} from '@/types/database';

const SIDEBAR_COLLAPSED_KEY = 'hazel-sidebar-collapsed';

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail: string;
  userName?: string;
  userImage?: string;
  bottomNavItems?: NavItemKey[];
}

export function AppLayout({ children, userEmail, userName, userImage, bottomNavItems }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 키보드 사용자용 본문 바로가기 — 포커스 시에만 노출 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-foreground focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      {/* 전체 너비 1줄 헤더 (좌: 로고 → 대시보드, 우: 알림·테마·아바타) */}
      <Header userEmail={userEmail} userName={userName} userImage={userImage} />

      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        userEmail={userEmail}
        userName={userName}
        userImage={userImage}
      />

      <div className={cn(
        'pt-14 transition-[margin] duration-200',
        isCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      )}>
        <main
          id="main-content"
          className="flex min-h-[calc(100dvh-3.5rem)] flex-col p-4 pb-20 sm:p-6 sm:pb-20 lg:p-8 lg:pb-8"
          aria-label="주요 콘텐츠"
        >
          <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
          <div className="mx-auto w-full max-w-7xl">
            <AppFooter />
          </div>
        </main>
      </div>

      <BottomNav items={bottomNavItems} />
    </div>
  );
}
