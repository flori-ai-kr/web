'use client';

import {useSyncExternalStore} from 'react';
import {Sidebar} from './sidebar';
import {Header} from './header';
import {BottomNav} from './bottom-nav';
import {AppFooter} from './app-footer';
import {cn} from '@/lib/utils';
import type {NavItemKey} from '@/types/database';

const SIDEBAR_COLLAPSED_KEY = 'hazel-sidebar-collapsed';

// 사이드바 접힘 상태를 localStorage에 보관하고 useSyncExternalStore로 구독한다.
// 렌더 중에 localStorage를 읽지 않으므로 하이드레이션 불일치가 없다(서버 스냅샷=false).
const collapseListeners = new Set<() => void>();

function getCollapsedSnapshot(): boolean {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}

function subscribeCollapsed(callback: () => void): () => void {
  collapseListeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    collapseListeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function setCollapsedValue(next: boolean): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  collapseListeners.forEach((l) => l()); // 동일 탭 구독자에게 통지(storage 이벤트는 타 탭만 발생)
}

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail: string;
  userName?: string;
  userImage?: string;
  bottomNavItems?: NavItemKey[];
}

export function AppLayout({ children, userEmail, userName, userImage, bottomNavItems }: AppLayoutProps) {
  // 서버 스냅샷은 항상 false(펼침) → 하이드레이션 일치. 하이드레이션 후 클라 값으로 전환.
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, () => false);

  const handleToggleCollapse = () => {
    setCollapsedValue(!isCollapsed);
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
          {/* 인라인 푸터는 데스크톱(사이드바 레이아웃)에서만. 모바일/태블릿은 하단바 '더보기' 시트로 이동 */}
          <div className="mx-auto hidden w-full max-w-7xl lg:block">
            <AppFooter />
          </div>
        </main>
      </div>

      <BottomNav items={bottomNavItems} />
    </div>
  );
}
