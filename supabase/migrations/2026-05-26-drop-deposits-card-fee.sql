-- ============================================================
-- DROP: 입금대조(deposits) + 카드사별 수수료율(card_company_settings) 기능 제거
-- ============================================================
-- 작성일: 2026-05-26
-- 상태: ⚠️ 미적용 (NOT YET APPLIED) — 일괄 배포용
--
-- 코드(web)에서는 이미 모든 참조를 제거했으나(2026-05-26), 아래 DB 변경은
-- expand-contract 패턴에 따라 web·mobile·server 가 모두 정렬된 뒤
-- "한 번에" 적용한다. 그때까지 컬럼/테이블은 DB에 남아있어도 무해(미사용).
--
-- 적용 전 체크리스트:
--   [ ] web   — 코드 참조 제거 완료 (2026-05-26)
--   [ ] mobile— refactor/web-parity-sync 동기화 완료
--   [ ] server— 관련 로직 정리 완료
--   [ ] 위 3개 배포 후 이 마이그레이션 실행
--
-- 적용 방법(승인 후): Supabase SQL Editor 또는 supabase db push
-- 적용 시 docs/WEB-CLEANUP.md 및 supabase/schema.sql 갱신할 것.
-- ============================================================

BEGIN;

-- 1) 카드사별 수수료 설정 테이블 (인덱스·트리거·RLS 정책 포함 CASCADE 제거)
DROP TABLE IF EXISTS card_company_settings CASCADE;

-- 2) sales 테이블의 입금/수수료 관련 컬럼 제거
DROP INDEX IF EXISTS idx_sales_deposit_status;

ALTER TABLE sales DROP COLUMN IF EXISTS card_company;
ALTER TABLE sales DROP COLUMN IF EXISTS fee;
ALTER TABLE sales DROP COLUMN IF EXISTS expected_deposit;
ALTER TABLE sales DROP COLUMN IF EXISTS expected_deposit_date;
ALTER TABLE sales DROP COLUMN IF EXISTS deposit_status;

COMMIT;
