export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'naverpay' | 'unpaid';
export type DepositStatus = 'pending' | 'completed' | 'not_applicable';
export type ExpenseCategory = 'flower_purchase' | 'delivery' | 'advertising' | 'rent' | 'utilities' | 'supplies' | 'other';
export type CustomerGrade = 'new' | 'regular' | 'vip' | 'blacklist';
export type CustomerGender = 'male' | 'female';
export type ReservationChannel = 'phone' | 'kakaotalk' | 'naver_booking' | 'road' | 'other';

export type ProductCategory = 
  | 'mini_bouquet' 
  | 'basic_bouquet' 
  | 'medium_bouquet' 
  | 'large_bouquet' 
  | 'special_bouquet' 
  | 'proposal_bouquet' 
  | 'basket' 
  | 'vase' 
  | 'group_bouquet' 
  | 'reservation' 
  | 'photo_bouquet';

export const PRODUCT_CATEGORIES = [
  { value: 'mini_bouquet', label: '미니 꽃다발' },
  { value: 'basic_bouquet', label: '기본 꽃다발' },
  { value: 'medium_bouquet', label: '중형 꽃다발' },
  { value: 'large_bouquet', label: '대형 꽃다발' },
  { value: 'special_bouquet', label: '스페셜 꽃다발' },
  { value: 'proposal_bouquet', label: '프로포즈 꽃다발' },
  { value: 'basket', label: '꽃바구니' },
  { value: 'vase', label: '화병꽂이' },
  { value: 'group_bouquet', label: '단체꽃다발' },
  { value: 'reservation', label: '예약' },
  { value: 'photo_bouquet', label: '촬영부케' },
] as const;

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
  product_name: string;
  product_category: string;
  amount: number;
  payment_method: PaymentMethod;
  card_company?: string;
  fee?: number;
  expected_deposit?: number;
  expected_deposit_date?: string;
  deposit_status: DepositStatus;
  deposited_at?: string;
  reservation_channel: ReservationChannel;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  note?: string;
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
  category: ExpenseCategory;
  unit_price: number;
  quantity: number;
  total_amount: number;
  payment_method: PaymentMethod;
  card_company?: string;
  vendor?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  grade: CustomerGrade;
  gender?: CustomerGender | null;
  total_purchase_count: number;
  total_purchase_amount: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CardCompanySetting {
  id: string;
  name: string;
  fee_rate: number;
  deposit_days: number;
  is_active: boolean;
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
  description: string | null;
  tags: string[];
  photos: PhotoFile[];
  sale_id: string | null;
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
  description: string | null;
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
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const CALENDAR_EVENT_COLORS = [
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
  notes: string | null;
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

// ─── 유저 설정 (하단바 커스터마이즈) ──────────────────────────
export type NavItemKey =
  | 'calendar'
  | 'sales'
  | 'expenses'
  | 'customers'
  | 'gallery'
  | 'deposits'
  | 'insights'
  | 'follows';

export interface UserPreferences {
  user_id: string;
  bottom_nav_items: NavItemKey[];
  updated_at: string;
}

export const NAV_ITEM_LABELS: Record<NavItemKey, string> = {
  calendar: '캘린더',
  sales: '매출관리',
  expenses: '지출관리',
  customers: '고객관리',
  gallery: '사진첩',
  deposits: '입금대조',
  insights: '인사이트',
  follows: '팔로우',
};

export const NAV_ITEM_HREFS: Record<NavItemKey, string> = {
  calendar: '/calendar',
  sales: '/sales',
  expenses: '/expenses',
  customers: '/customers',
  gallery: '/gallery',
  deposits: '/deposits',
  insights: '/insights',
  follows: '/insights/follows',
};

export const DEFAULT_BOTTOM_NAV_ITEMS: NavItemKey[] = [
  'calendar',
  'sales',
  'expenses',
  'customers',
  'insights',
];

export const MIN_BOTTOM_NAV_ITEMS = 4;
export const MAX_BOTTOM_NAV_ITEMS = 6;
