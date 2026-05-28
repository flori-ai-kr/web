'use client';

import {useState} from 'react';
import {Sidebar} from './Sidebar';
import {Header} from './Header';
import {BottomNav} from './BottomNav';
import {cn} from '@/lib/utils';
import type {NavItemKey} from '@/types/database';

const SIDEBAR_COLLAPSED_KEY = 'hazel-sidebar-collapsed';

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail: string;
  bottomNavItems?: NavItemKey[];
}

export function AppLayout({ children, userEmail, bottomNavItems }: AppLayoutProps) {
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
      {/* 전체 너비 1줄 헤더 (좌: 로고 → 대시보드, 우: 알림·테마·아바타) */}
      <Header userEmail={userEmail} />

      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        userEmail={userEmail}
      />

      <div className={cn(
        'pt-14 transition-[margin] duration-200',
        isCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      )}>
        <main className="p-4 pb-20 sm:p-6 sm:pb-20 lg:p-8 lg:pb-8" aria-label="주요 콘텐츠">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <BottomNav items={bottomNavItems} />
    </div>
  );
}
