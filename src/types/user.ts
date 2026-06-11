// ─── 유저 설정 (하단바 커스터마이즈) ──────────────────────────
export type NavItemKey =
  | 'dashboard'
  | 'calendar'
  | 'sales'
  | 'expenses'
  | 'statistics'
  | 'customers'
  | 'gallery'
  | 'community';

export interface UserPreferences {
  user_id: string;
  bottom_nav_items: NavItemKey[];
  updated_at: string;
}

export const NAV_ITEM_LABELS: Record<NavItemKey, string> = {
  dashboard: '대시보드',
  calendar: '캘린더',
  sales: '매출',
  expenses: '지출',
  statistics: '통계',
  customers: '고객',
  gallery: '사진첩',
  community: '커뮤니티',
};

export const NAV_ITEM_HREFS: Record<NavItemKey, string> = {
  dashboard: '/admin',
  calendar: '/admin/calendar',
  sales: '/admin/sales',
  expenses: '/admin/expenses',
  statistics: '/admin/statistics',
  customers: '/admin/customers',
  gallery: '/admin/gallery',
  community: '/admin/community',
};

export const DEFAULT_BOTTOM_NAV_ITEMS: NavItemKey[] = [
  'dashboard',
  'sales',
  'expenses',
  'customers',
  'calendar',
];

export const MIN_BOTTOM_NAV_ITEMS = 4;
export const MAX_BOTTOM_NAV_ITEMS = 6;
