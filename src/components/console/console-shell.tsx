'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ConsoleSidebar } from './console-sidebar';
import { ConsoleTopbar } from './console-topbar';
import { ConsoleBottomNav } from './console-bottom-nav';

// 경로 → 토픽바 제목/부제 매핑.
const META: Record<string, { title: string; subtitle: string }> = {
  '/console': { title: '개요', subtitle: '전체 서비스 현황을 한눈에' },
  '/console/verifications': { title: '사업자 인증', subtitle: '신청 심사 · 승인/거절' },
  '/console/users': { title: '유저 관리', subtitle: '가입자 조회 · 활성 토글' },
  '/console/subscriptions': { title: '구독 현황', subtitle: '구독 상태 목록' },
  '/console/moderation': { title: '커뮤니티 모더레이션', subtitle: '신고 처리 · 콘텐츠 관리 · 차단' },
  '/console/broadcasts': { title: '브로드캐스트', subtitle: '세그먼트 타깃 푸시 발송' },
  '/console/notifications': { title: '알림 테스트', subtitle: '타입별 샘플 푸시 발송' },
  '/console/announcements': { title: '공지 배너', subtitle: '앱 내 모달·상단바 공지 관리' },
  '/console/inquiries': { title: '문의 인박스', subtitle: '1:1 문의 · 피드백 처리' },
  '/console/storage': { title: '스토리지 증설', subtitle: '증설 요청 · 용량 상향' },
  '/console/job-runs': { title: '작업 로그', subtitle: '백그라운드 작업 실행 · 알림 발송 이력' },
  '/console/audit-logs': { title: '감사 로그', subtitle: '운영자 액션 추적' },
  '/console/prompts': { title: 'AI 프롬프트', subtitle: '마케팅 생성 프롬프트 버전·활성화·플레이그라운드' },
  '/console/prompts/new': { title: 'AI 프롬프트', subtitle: '새 버전 작성' },
  // [AI 기능 비활성화] '/console/health': { title: 'AI 헬스', subtitle: 'ai-server / litellm 상태' },
};

function metaFor(pathname: string) {
  if (pathname.startsWith('/console/users/')) {
    return { title: '유저 상세', subtitle: '점주 운영 정보' };
  }
  if (pathname.startsWith('/console/prompts/')) {
    return META[pathname] ?? { title: 'AI 프롬프트', subtitle: '버전 편집 · 플레이그라운드' };
  }
  return META[pathname] ?? { title: '운영 콘솔', subtitle: '' };
}

const SIDEBAR_COLLAPSED_KEY = 'flori_console_sidebar_collapsed';

export function ConsoleShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { title, subtitle } = metaFor(pathname);

  // SSR 안전: 마운트 후 localStorage에서 초기값 동기화.
  // mounted 플래그로 첫 페인트엔 트랜지션을 끄고(FOUC 방지), 폭만 즉시 반영.
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
    setMounted(true);
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* 데스크톱(lg+): 좌측 사이드바(접힘 시 w-16 레일). 모바일은 하단바(ConsoleBottomNav)로 일원화. */}
      <ConsoleSidebar
        isCollapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mounted={mounted}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar title={title} subtitle={subtitle} userEmail={userEmail} />
        {/* 모바일은 하단바 높이(h-16)+safe-area만큼 아래 여백 확보(콘텐츠 가림 방지). */}
        <main className="flex-1 p-5 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <ConsoleBottomNav />
    </div>
  );
}
