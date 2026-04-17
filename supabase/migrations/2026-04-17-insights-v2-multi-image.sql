-- =============================================
-- 인사이트 v2: Instagram 포스트 멀티이미지 지원
-- 적용일: 2026-04-17
--
-- 변경: instagram_posts.thumbnail_url(TEXT) → image_urls(JSONB 배열)
-- 사유: 캐러셀(여러 장) 포스트에서 모든 이미지 URL을 저장해 웹에서 전체 열람
--
-- 선행: 2026-04-17-insights.sql 적용 완료
-- 주의: instagram_posts 테이블이 아직 데이터 없을 때 안전하게 적용 가능
-- =============================================

BEGIN;

-- 1) 새 컬럼 추가 (빈 배열 기본값)
ALTER TABLE instagram_posts
  ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) 기존 thumbnail_url 데이터가 있다면 image_urls로 마이그레이션
UPDATE instagram_posts
SET image_urls = jsonb_build_array(thumbnail_url)
WHERE jsonb_array_length(image_urls) = 0
  AND thumbnail_url IS NOT NULL
  AND thumbnail_url <> '';

-- 3) 기존 thumbnail_url 컬럼 제거
ALTER TABLE instagram_posts
  DROP COLUMN IF EXISTS thumbnail_url;

COMMIT;

-- 적용 확인:
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'instagram_posts'
--   ORDER BY ordinal_position;
