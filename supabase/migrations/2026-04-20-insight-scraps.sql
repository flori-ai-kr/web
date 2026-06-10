-- =============================================
-- 인사이트 스크랩/메모 (트렌드·팔로우 공용)
-- 적용일: 2026-04-20
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS insight_scraps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('trend', 'post')),
  target_id UUID NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_insight_scraps_user ON insight_scraps(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_scraps_target ON insight_scraps(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_insight_scraps_user_type_created
  ON insight_scraps(user_id, target_type, created_at DESC);

DROP TRIGGER IF EXISTS update_insight_scraps_updated_at ON insight_scraps;
CREATE TRIGGER update_insight_scraps_updated_at
  BEFORE UPDATE ON insight_scraps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE insight_scraps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insight_scraps_all" ON insight_scraps;
CREATE POLICY "insight_scraps_all" ON insight_scraps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
