-- =============================================
-- Hazel Admin - Supabase 스키마
-- 멀티테넌시: user_id 기반 데이터 분리
-- =============================================

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 고객 테이블
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  grade VARCHAR(20) DEFAULT 'new' CHECK (grade IN ('new', 'regular', 'vip', 'blacklist')),
  gender VARCHAR(10) DEFAULT NULL CHECK (gender IN ('male', 'female')),
  total_purchase_count INTEGER DEFAULT 0,
  total_purchase_amount INTEGER DEFAULT 0,
  first_purchase_date TIMESTAMPTZ,
  last_purchase_date TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone, user_id)
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_grade ON customers(grade);
CREATE INDEX idx_customers_user_id ON customers(user_id);

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 예약 테이블
-- =============================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  time TIME,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  sale_id UUID,  -- FK 아래에서 설정
  amount INTEGER DEFAULT 0,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_user_id ON reservations(user_id);

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 매출 테이블
-- =============================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_category VARCHAR(100),
  amount INTEGER NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'naverpay', 'kakaopay')),
  card_company VARCHAR(50),
  fee INTEGER,
  expected_deposit INTEGER,
  expected_deposit_date DATE,
  deposit_status VARCHAR(20) DEFAULT 'not_applicable' CHECK (deposit_status IN ('pending', 'completed', 'not_applicable')),
  deposited_at TIMESTAMPTZ,
  reservation_channel VARCHAR(20) DEFAULT 'other' CHECK (reservation_channel IN ('phone', 'kakaotalk', 'naver_booking', 'road', 'other')),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id),
  note TEXT,
  has_review BOOLEAN DEFAULT FALSE,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 예약 <-> 매출 양방향 FK
ALTER TABLE reservations ADD CONSTRAINT reservations_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sales_deposit_status ON sales(deposit_status);
CREATE INDEX idx_sales_user_id ON sales(user_id);

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 지출 테이블
-- =============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('flower_purchase', 'delivery', 'advertising', 'rent', 'utilities', 'supplies', 'other')),
  unit_price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_amount INTEGER NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'naverpay', 'kakaopay')),
  card_company VARCHAR(50),
  vendor VARCHAR(100),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 카드사 설정 테이블
-- =============================================
CREATE TABLE card_company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(50) NOT NULL,
  fee_rate DECIMAL(5,2) DEFAULT 2.0,
  deposit_days INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, user_id)
);

CREATE INDEX idx_card_company_settings_user_id ON card_company_settings(user_id);

CREATE TRIGGER update_card_settings_updated_at
  BEFORE UPDATE ON card_company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 상품 카테고리 테이블 (매출용)
-- value: DB 저장값 (영문), label: UI 표시값 (한글)
-- =============================================
CREATE TABLE sale_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  value VARCHAR(100) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#f43f5e',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(value, user_id)
);

CREATE INDEX idx_sale_categories_user_id ON sale_categories(user_id);

-- =============================================
-- 결제방식 테이블
-- value: DB 저장값 (영문), label: UI 표시값 (한글)
-- =============================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  value VARCHAR(20) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(value, user_id)
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- =============================================
-- 사진 태그 테이블
-- =============================================
CREATE TABLE photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, user_id)
);

CREATE INDEX idx_photo_tags_user_id ON photo_tags(user_id);

-- =============================================
-- 사진 카드 테이블
-- photos: [{url: string, originalName: string}, ...]
-- =============================================
CREATE TABLE photo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_cards_tags ON photo_cards USING GIN(tags);
CREATE INDEX idx_photo_cards_sale_id ON photo_cards(sale_id);
CREATE INDEX idx_photo_cards_created_at ON photo_cards(created_at DESC);
CREATE INDEX idx_photo_cards_user_id ON photo_cards(user_id);

CREATE TRIGGER update_photo_cards_updated_at
  BEFORE UPDATE ON photo_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 푸시 알림 구독 테이블
-- =============================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 앱 설정 테이블 (키-값)
-- =============================================
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- =============================================
-- RLS (Row Level Security) 정책
-- 모든 테이블: auth.uid() = user_id 기반 데이터 분리
-- =============================================

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (auth.uid() = user_id);

-- sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select" ON sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sales_delete" ON sales FOR DELETE USING (auth.uid() = user_id);

-- expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_select" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reservations_insert" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_update" ON reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reservations_delete" ON reservations FOR DELETE USING (auth.uid() = user_id);

-- card_company_settings
ALTER TABLE card_company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "card_company_settings_select" ON card_company_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "card_company_settings_insert" ON card_company_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "card_company_settings_update" ON card_company_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "card_company_settings_delete" ON card_company_settings FOR DELETE USING (auth.uid() = user_id);

-- sale_categories
ALTER TABLE sale_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_categories_select" ON sale_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sale_categories_insert" ON sale_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sale_categories_update" ON sale_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sale_categories_delete" ON sale_categories FOR DELETE USING (auth.uid() = user_id);

-- payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods_select" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_methods_update" ON payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_delete" ON payment_methods FOR DELETE USING (auth.uid() = user_id);

-- photo_tags
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_tags_select" ON photo_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "photo_tags_insert" ON photo_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_tags_update" ON photo_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "photo_tags_delete" ON photo_tags FOR DELETE USING (auth.uid() = user_id);

-- photo_cards
ALTER TABLE photo_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_cards_select" ON photo_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "photo_cards_insert" ON photo_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_cards_update" ON photo_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "photo_cards_delete" ON photo_cards FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_select" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_insert" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_update" ON push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_delete" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- app_config (인증된 사용자만 접근)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_config_select" ON app_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "app_config_update" ON app_config FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 인사이트 섹션 (트렌드 + 팔로우)
-- 2026-04-17 추가 — 상세: supabase/migrations/2026-04-17-insights.sql
-- =============================================

-- 트렌드 기사 (공유)
CREATE TABLE trend_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('flower', 'inspiration', 'business', 'industry')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT NOT NULL,
  source_name TEXT,
  published_at TIMESTAMPTZ,
  collected_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trend_articles_category ON trend_articles(category);
CREATE INDEX idx_trend_articles_collected_at ON trend_articles(collected_at DESC);
CREATE UNIQUE INDEX idx_trend_articles_source_url ON trend_articles(source_url);

ALTER TABLE trend_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trend_articles_select" ON trend_articles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Instagram 팔로우 계정 (공유)
CREATE TABLE instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  profile_url TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('domestic', 'international')),
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_instagram_accounts_active ON instagram_accounts(active);
CREATE INDEX idx_instagram_accounts_region ON instagram_accounts(region);

CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
-- SELECT만 인증 사용자에게 허용. 쓰기는 service_role(Server Action)로만 수행.
CREATE POLICY "instagram_accounts_select" ON instagram_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Instagram 포스트 (공유)
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  shortcode TEXT NOT NULL UNIQUE,
  permalink TEXT NOT NULL,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT,
  like_count INT DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_instagram_posts_account_id ON instagram_posts(account_id);
CREATE INDEX idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instagram_posts_select" ON instagram_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 유저 설정 (하단바 커스터마이즈)
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bottom_nav_items JSONB NOT NULL DEFAULT '["calendar","sales","expenses","customers","insights"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_all" ON user_preferences FOR ALL
  USING (auth.uid() = user_id);
