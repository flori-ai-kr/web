// ?from=<slug> → 가이드에서 원래 기능 화면으로 돌아갈 정보.
// ⓘ 사용법 버튼이 붙는 기능 페이지만 등록한다.

export interface BackTarget {
  label: string;
  href: string;
}

export const FEATURE_TARGETS: Record<string, BackTarget> = {
  sales: { label: '매출', href: '/admin/sales' },
  expenses: { label: '지출', href: '/admin/expenses' },
  customers: { label: '고객', href: '/admin/customers' },
  gallery: { label: '사진첩', href: '/admin/gallery' },
  calendar: { label: '예약 캘린더', href: '/admin/calendar' },
  statistics: { label: '통계', href: '/admin/statistics' },
  insights: { label: '인사이트', href: '/admin/insights' },
  community: { label: '커뮤니티', href: '/admin/community' },
  settings: { label: '설정', href: '/admin/settings' },
  profile: { label: '내 프로필', href: '/admin/profile' },
  support: { label: '고객센터', href: '/admin/support' },
};

export function backTarget(from: string | null | undefined): BackTarget | null {
  if (!from) return null;
  return FEATURE_TARGETS[from] ?? null;
}
