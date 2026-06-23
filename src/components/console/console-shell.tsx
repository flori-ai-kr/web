'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ConsoleSidebar, SidebarContent } from './console-sidebar';
import { ConsoleTopbar } from './console-topbar';

// 경로 → 토픽바 제목/부제 매핑.
const META: Record<string, { title: string; subtitle: string }> = {
  '/console': { title: '개요', subtitle: '전체 서비스 현황을 한눈에' },
  '/console/verifications': { title: '사업자 인증', subtitle: '신청 심사 · 승인/거절' },
  '/console/users': { title: '유저 관리', subtitle: '가입자 조회 · 활성 토글' },
  '/console/subscriptions': { title: '구독 현황', subtitle: '구독 상태 목록' },
  '/console/moderation': { title: '커뮤니티 모더레이션', subtitle: '신고 처리 · 콘텐츠 관리 · 차단' },
  '/console/broadcasts': { title: '브로드캐스트', subtitle: '세그먼트 타깃 푸시 발송' },
  '/console/notification-logs': { title: '발송 로그', subtitle: '모든 알림 발송 이력' },
  '/console/announcements': { title: '공지 배너', subtitle: '앱 내 모달·상단바 공지 관리' },
  '/console/inquiries': { title: '문의 인박스', subtitle: '1:1 문의 · 피드백 처리' },
  '/console/audit-logs': { title: '감사 로그', subtitle: '운영자 액션 추적' },
  // [AI 기능 비활성화] '/console/health': { title: 'AI 헬스', subtitle: 'ai-server / litellm 상태' },
};

function metaFor(pathname: string) {
  if (pathname.startsWith('/console/users/')) {
    return { title: '유저 상세', subtitle: '점주 운영 정보' };
  }
  return META[pathname] ?? { title: '운영 콘솔', subtitle: '' };
}

export function ConsoleShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { title, subtitle } = metaFor(pathname);

  return (
    <div className="flex min-h-screen bg-muted">
      <ConsoleSidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-card p-4">
          <SheetTitle className="sr-only">콘솔 내비게이션</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar
          title={title}
          subtitle={subtitle}
          userEmail={userEmail}
          onMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
