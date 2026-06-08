export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'naverpay' | 'unpaid';
export type ExpenseCategory = 'flower_purchase' | 'delivery' | 'advertising' | 'rent' | 'utilities' | 'supplies' | 'other';
export type CustomerGrade = 'new' | 'regular' | 'vip' | 'blacklist';
export type CustomerGender = 'male' | 'female';
export type ReservationChannel = 'phone' | 'kakaotalk' | 'naver_booking' | 'road' | 'other';

export const PAYMENT_METHODS = [
  { value: 'card', label: '카드' },
  { value: 'naverpay', label: '네이버페이' },
  { value: 'transfer', label: '계좌이체' },
  { value: 'cash', label: '현금' },
] as const;

export interface Sale {
  id: string;
  user_id: string;
  date: string;
  category_id: string | null;
  category_label: string | null;
  amount: number;
  payment_method_id: string | null;
  payment_method_label: string | null;
  channel_id: string | null;
  channel_label: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  memo?: string;
  is_unpaid: boolean;
  has_review: boolean;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  item_name: string;
  category_id: string | null;
  category_label: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  payment_method_id: string | null;
  payment_method_label: string | null;
  card_company?: string;
  vendor?: string;
  memo?: string;
  recurring_id?: string | null;
  is_recurring_modified?: boolean;
  created_at: string;
  updated_at: string;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';
export interface YearlyDate { m: number; d: number; }

export interface RecurringExpense {
  id: string;
  user_id: string;
  item_name: string;
  category_id: string | null;
  category_label: string | null;
  unit_price: number;
  quantity: number;
  payment_method_id: string | null;
  payment_method_label: string | null;
  vendor?: string | null;
  memo?: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  days_of_week: number[];       // weekly: 0(일)~6(토) 배열
  days_of_month: number[];      // monthly: 1~31 배열
  yearly_dates: YearlyDate[];   // yearly: [{m,d}] 배열
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  /** 등급명(자유 문자열). 더 이상 고정 union이 아니며, 등급 미지정 시 null. */
  grade: string | null;
  /** 적용된 등급 설정 id (자동/수동 모두). 미지정 시 null. */
  grade_id: string | null;
  /** true면 사용자가 수동으로 고정한 등급(자동 재계산 제외). */
  grade_locked: boolean;
  gender?: CustomerGender | null;
  total_purchase_count: number;
  total_purchase_amount: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  /** 대표 사진 썸네일 URL(최대 3장 등). 서버 집계값. */
  photo_thumbnails: string[];
  /** 연결된 사진 카드 수. 서버 집계값. */
  photo_count: number;
  memo?: string;
  created_at: string;
  updated_at: string;
}

/** 등급 설정(테넌트별 CRUD 대상). 서버 /customer-grades 계약 미러. */
export interface CustomerGradeConfig {
  id: string;
  name: string;
  threshold: number | null;
  sort_order: number;
}

// Sale Settings Types
export interface SaleCategory {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface SalePaymentMethod {
  id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}


// Photo Gallery Types
export interface PhotoTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PhotoFile {
  url: string;
  originalName: string;
}

export interface PhotoCard {
  id: string;
  user_id: string;
  title: string;
  memo: string | null;
  tags: string[];
  photos: PhotoFile[];
  sale_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
}

// Reservation Types
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  memo: string | null;
  status: ReservationStatus;
  sale_id: string | null;
  amount: number;
  reminder_at: string | null;
  reminder_sent: boolean;
  pickup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const RESERVATION_STATUS = [
  { value: 'pending', label: '제작 필요', color: '#F5A623' },
  { value: 'confirmed', label: '픽업 필요', color: '#5B8DEF' },
  { value: 'completed', label: '픽업 완료', color: '#8B9D83' },
  { value: 'cancelled', label: '취소', color: '#9B9B93' },
] as const;

// Calendar Events (multi-day schedule)
export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  color: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export const SCHEDULE_COLORS = [
  { value: '#f43f5e', label: '로즈' },
  { value: '#a855f7', label: '퍼플' },
  { value: '#3b82f6', label: '블루' },
  { value: '#10b981', label: '그린' },
  { value: '#f59e0b', label: '앰버' },
  { value: '#6b7280', label: '그레이' },
] as const;

export const PHOTO_TAG_COLORS = [
  { value: '#f5f5f5', label: '화이트' },
  { value: '#ec4899', label: '핑크' },
  { value: '#ef4444', label: '레드' },
  { value: '#eab308', label: '옐로우' },
  { value: '#a855f7', label: '퍼플' },
  { value: '#6366f1', label: '인디고' },
  { value: '#14b8a6', label: '틸' },
  { value: '#f97316', label: '오렌지' },
  { value: '#6b7280', label: '그레이' },
] as const;

// ─── 인사이트 섹션 ────────────────────────────────────────────
export type TrendCategory = 'flower' | 'inspiration' | 'business' | 'industry';
export type InstagramRegion = 'domestic' | 'international';

export interface TrendArticle {
  id: string;
  category: TrendCategory;
  title: string;
  summary: string;
  key_points: string[];
  source_url: string;
  source_name: string | null;
  published_at: string | null;
  collected_at: string;
  created_at: string;
}

export interface InstagramAccount {
  id: string;
  username: string;
  display_name: string | null;
  profile_url: string;
  region: InstagramRegion;
  sort_order: number;
  active: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramPost {
  id: string;
  account_id: string;
  shortcode: string;
  permalink: string;
  image_urls: string[];
  caption: string | null;
  like_count: number;
  posted_at: string;
  scraped_at: string;
}

export interface InstagramPostWithAccount extends InstagramPost {
  account: InstagramAccount;
}

export const TREND_CATEGORIES = [
  { value: 'flower', label: '꽃 트렌드', color: '#f43f5e' },
  { value: 'inspiration', label: '영감', color: '#a855f7' },
  { value: 'business', label: '사업 트렌드', color: '#3b82f6' },
  { value: 'industry', label: '업계 뉴스', color: '#f59e0b' },
] as const;

export const TREND_CATEGORY_LABELS: Record<TrendCategory, string> = {
  flower: '꽃 트렌드',
  inspiration: '영감',
  business: '사업 트렌드',
  industry: '업계 뉴스',
};

export const INSTAGRAM_REGION_LABELS: Record<InstagramRegion, string> = {
  domestic: '국내',
  international: '해외',
};

// ─── 스크랩/메모 ──────────────────────────────────────────
export type ScrapTargetType = 'trend' | 'post';

export interface InsightScrap {
  id: string;
  user_id: string;
  target_type: ScrapTargetType;
  target_id: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrendScrap {
  scrap: InsightScrap;
  article: TrendArticle;
}

export interface PostScrap {
  scrap: InsightScrap;
  post: InstagramPostWithAccount;
}

export interface ScrapInfo {
  id: string;
  memo: string | null;
}

export type ScrapMap = Record<string, ScrapInfo>;

// ─── 커뮤니티 게시판 ──────────────────────────────────────────
export type CommunityCategory =
  | 'notice'
  | 'daily'
  | 'question'
  | 'knowledge'
  | 'review'
  | 'etc';

export interface CommunityPost {
  id: string;
  author_nickname: string;
  category: CommunityCategory;
  title: string;
  content: unknown; // Tiptap JSON (JSONContent)
  content_text: string; // 검색/미리보기용 plain text
  image_urls: string[];
  is_secret: boolean;
  is_pinned: boolean;
  like_count: number;
  liked: boolean; // 현재 사용자 좋아요 여부
  comment_count: number;
  is_mine: boolean; // 현재 사용자 작성 여부 (수정/삭제 노출)
  can_view: boolean; // 비밀글 열람 권한 (false면 본문 마스킹)
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  parent_id: string | null; // 대댓글 셀프참조
  author_nickname: string;
  content: string; // 평문
  is_secret: boolean;
  is_mine: boolean;
  can_view: boolean; // 비밀댓글 열람 권한
  is_deleted: boolean; // soft delete → "삭제된 댓글입니다"
  created_at: string;
}

export const COMMUNITY_CATEGORIES = [
  { value: 'notice', label: '공지', color: '#ef4444' },
  { value: 'daily', label: '자유', color: '#8b9d83' },
  { value: 'question', label: '질문', color: '#3b82f6' },
  { value: 'knowledge', label: '노하우', color: '#f59e0b' },
  { value: 'review', label: '후기', color: '#a855f7' },
  { value: 'etc', label: '기타', color: '#64748b' },
] as const;

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityCategory, string> = {
  notice: '공지',
  daily: '자유',
  question: '질문',
  knowledge: '노하우',
  review: '후기',
  etc: '기타',
};

// ─── 유저 설정 (하단바 커스터마이즈) ──────────────────────────
export type NavItemKey =
  | 'dashboard'
  | 'calendar'
  | 'sales'
  | 'expenses'
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
  customers: '고객',
  gallery: '사진첩',
  community: '커뮤니티',
};

export const NAV_ITEM_HREFS: Record<NavItemKey, string> = {
  dashboard: '/admin',
  calendar: '/admin/calendar',
  sales: '/admin/sales',
  expenses: '/admin/expenses',
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
