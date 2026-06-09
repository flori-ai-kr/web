'use client';

import {useEffect, useRef} from 'react';
import {usePathname} from 'next/navigation';
import {driver, type DriveStep} from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour-theme.css';
import {completeTour} from '@/lib/actions/tour';

interface TourLauncherProps {
  tourCompleted: boolean;
}

/**
 * data-tour 셀렉터가 가리키는 요소 중 화면에 실제로 보이는(레이아웃에 그려진) 것을 고른다.
 * nav-* 셀렉터는 BottomNav(모바일)·Sidebar(데스크톱) 양쪽에 매칭되므로 뷰포트별 1개만 보인다.
 */
function visibleEl(selector: string): HTMLElement | undefined {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return els.find((el) => el.offsetParent !== null || el.getClientRects().length > 0);
}

/** 요소가 있을 때만 스텝을 추가한다(없으면 건너뜀). */
function elementStep(el: HTMLElement | undefined, title: string, description: string): DriveStep | null {
  if (!el) return null;
  return {element: el, popover: {title, description}};
}

function buildSteps(): DriveStep[] {
  const community = visibleEl('[data-tour="nav-community"]') ?? visibleEl('[data-tour="nav-more"]');

  const steps: (DriveStep | null)[] = [
    // 1. 환영 (요소 없음 → 중앙 팝오버)
    {
      popover: {
        title: 'flori에 오신 걸 환영해요',
        description: '주요 기능을 빠르게 둘러볼게요. (언제든 건너뛸 수 있어요)',
      },
    },
    // 2. 대시보드 요약
    elementStep(
      visibleEl('[data-tour="dashboard-summary"]'),
      '한눈에 보는 요약',
      '오늘·이번 달 매출과 순이익을 여기서 확인해요.',
    ),
    // 3. 매출
    elementStep(
      visibleEl('[data-tour="nav-sales"]'),
      '매출 기록',
      '꽃을 팔면 여기서 매출을 등록하세요.',
    ),
    // 4. 예약 캘린더
    elementStep(
      visibleEl('[data-tour="nav-calendar"]'),
      '예약 캘린더',
      '예약을 등록하면 픽업 전에 알림을 받아요.',
    ),
    // 5. 커뮤니티 (모바일은 '더보기' 뒤에 있음)
    elementStep(
      community,
      '사장님 커뮤니티',
      "다른 사장님들과 노하우를 나눠요. (모바일은 '더보기'에 있어요)",
    ),
    // 6. 완료 (요소 없음 → 중앙 팝오버)
    {
      popover: {
        title: '이제 시작해볼까요?',
        description: '필요하면 천천히 둘러보세요. 즐거운 flori 되세요!',
      },
    },
  ];

  return steps.filter((s): s is DriveStep => s !== null);
}

/**
 * 첫 진입 인앱 제품 투어. 보이는 UI는 렌더하지 않고(null), 이펙트에서 driver 인스턴스만 구동한다.
 * - tourCompleted=true → 아무것도 안 함
 * - /admin(대시보드)에서만 자동 시작 (welcome/done 외 앵커가 존재하는 곳)
 * - 완료/건너뛰기 시 completeTour() 서버 액션 1회 호출(fire-and-forget)
 */
export function TourLauncher({tourCompleted}: TourLauncherProps) {
  const pathname = usePathname();
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (tourCompleted) return;
    if (pathname !== '/admin') return;
    if (startedRef.current) return;
    startedRef.current = true;

    const timer = window.setTimeout(() => {
      const steps = buildSteps();
      if (steps.length === 0) return;

      const driverObj = driver({
        showProgress: true,
        progressText: '{{current}} / {{total}}',
        nextBtnText: '다음',
        prevBtnText: '이전',
        doneBtnText: '시작하기',
        popoverClass: 'flori-tour',
        overlayColor: '#1C2024',
        overlayOpacity: 0.6,
        stagePadding: 8,
        stageRadius: 12,
        smoothScroll: true,
        steps,
        // onDestroyStarted는 정의 시 destroy()를 직접 호출해야 닫힌다(driver.js v1).
        // 완료/건너뛰기/닫기 모두 여기로 수렴하므로 서버 마킹을 1회 수행한다.
        onDestroyStarted: () => {
          if (!completedRef.current) {
            completedRef.current = true;
            // fire-and-forget — 실패해도 다음 진입에 다시 뜸(허용). unhandled rejection만 방지.
            completeTour().catch(() => {});
          }
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [tourCompleted, pathname]);

  return null;
}
