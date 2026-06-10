-- =============================================
-- 인사이트 섹션 (트렌드 + 팔로우)
-- 적용일: 2026-04-17
-- 브랜치: feat/insights-section
--
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요.
-- 실패 시 전체 트랜잭션이 롤백됩니다.
-- =============================================

BEGIN;

-- =============================================
-- 1. trend_articles (공유, RLS: authenticated SELECT only)
-- =============================================
CREATE TABLE IF NOT EXISTS trend_articles (
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

CREATE INDEX IF NOT EXISTS idx_trend_articles_category ON trend_articles(category);
CREATE INDEX IF NOT EXISTS idx_trend_articles_collected_at ON trend_articles(collected_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_articles_source_url ON trend_articles(source_url);

ALTER TABLE trend_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trend_articles_select" ON trend_articles;
CREATE POLICY "trend_articles_select" ON trend_articles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- 2. instagram_accounts (공유, RLS: authenticated ALL)
-- =============================================
CREATE TABLE IF NOT EXISTS instagram_accounts (
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

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_active ON instagram_accounts(active);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_region ON instagram_accounts(region);

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

-- SELECT만 인증된 사용자에게 허용. 쓰기는 service_role(Server Action)로만.
DROP POLICY IF EXISTS "instagram_accounts_all" ON instagram_accounts;
DROP POLICY IF EXISTS "instagram_accounts_select" ON instagram_accounts;
CREATE POLICY "instagram_accounts_select" ON instagram_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- 3. instagram_posts (공유, RLS: authenticated SELECT only)
-- =============================================
CREATE TABLE IF NOT EXISTS instagram_posts (
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

CREATE INDEX IF NOT EXISTS idx_instagram_posts_account_id ON instagram_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instagram_posts_select" ON instagram_posts;
CREATE POLICY "instagram_posts_select" ON instagram_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- 4. user_preferences (유저별, RLS: own row only)
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bottom_nav_items JSONB NOT NULL DEFAULT '["calendar","sales","expenses","customers","insights"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_all" ON user_preferences;
CREATE POLICY "user_preferences_all" ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- 5. 시드 데이터: 팔로우 계정 15개 (사용자 제공)
-- =============================================
INSERT INTO instagram_accounts (username, display_name, profile_url, region, sort_order) VALUES
  ('heartmadebykigpcn',     'Heart Made by KIG',      'https://www.instagram.com/heartmadebykigpcn',     'international', 10),
  ('futurejenn',            'Future Jenn',            'https://www.instagram.com/futurejenn',            'international', 20),
  ('ffoliar',               'ffoliar',                'https://www.instagram.com/ffoliar',               'international', 30),
  ('yourlondonflorist',     'Your London Florist',    'https://www.instagram.com/yourlondonflorist',     'international', 40),
  ('nafleur.j',             'Nafleur J',              'https://www.instagram.com/nafleur.j',             'international', 50),
  ('farishtaflowers',       'Farishta Flowers',       'https://www.instagram.com/farishtaflowers',       'international', 60),
  ('dada.island',           'Dada Island',            'https://www.instagram.com/dada.island',           'international', 70),
  ('sohee_elletravaille',   'Sohee Elle Travaille',   'https://www.instagram.com/sohee_elletravaille',   'international', 80),
  ('blxxm__',               'Blxxm',                  'https://www.instagram.com/blxxm__',               'international', 90),
  ('hamishpowell',          'Hamish Powell',          'https://www.instagram.com/hamishpowell',          'international', 100),
  ('ohhoneyflorals',        'Oh Honey Florals',       'https://www.instagram.com/ohhoneyflorals',        'international', 110),
  ('isadiafloral',          'Isadia Floral',          'https://www.instagram.com/isadiafloral',          'international', 120),
  ('edenflorals.studio',    'Eden Florals Studio',    'https://www.instagram.com/edenflorals.studio',    'international', 130),
  ('madridflowerschool',    'Madrid Flower School',   'https://www.instagram.com/madridflowerschool',    'international', 140),
  ('duodesfleurs_kr',       'Duo des Fleurs',         'https://www.instagram.com/duodesfleurs_kr',       'domestic',      200)
ON CONFLICT (username) DO NOTHING;

COMMIT;

-- =============================================
-- 적용 확인 쿼리 (별도 실행)
-- =============================================
-- SELECT count(*) FROM instagram_accounts;  -- 15 expected
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('trend_articles','instagram_accounts','instagram_posts','user_preferences');
