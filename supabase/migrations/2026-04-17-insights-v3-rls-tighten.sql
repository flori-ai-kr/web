-- =============================================
-- 인사이트 v3: instagram_accounts RLS 강화
-- 적용일: 2026-04-17
--
-- 변경: FOR ALL 정책 → SELECT만 허용. 쓰기는 Service Role로만 수행.
-- 사유: 보안 리뷰 P0 - 인증된 모든 사용자가 공유 테이블을 쓰기 가능했음.
--       Server Action에서 service role을 사용하면 RLS를 우회하므로
--       앱 레벨의 requireAuth()로 인증 보장 + DB RLS로 방어 깊이 확보.
--
-- 선행: 2026-04-17-insights.sql, v2 적용 완료
-- =============================================

BEGIN;

DROP POLICY IF EXISTS "instagram_accounts_all" ON instagram_accounts;

CREATE POLICY "instagram_accounts_select" ON instagram_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- INSERT/UPDATE/DELETE 정책 미생성 → RLS에서 쓰기 차단.
-- service_role 키는 RLS 우회하므로 서버 액션/내부 API에서는 정상 동작.

COMMIT;

-- 확인:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'instagram_accounts';
-- 결과: instagram_accounts_select, SELECT (1행만 나와야 함)
