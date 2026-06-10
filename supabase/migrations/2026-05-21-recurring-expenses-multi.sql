-- 고정비 반복 규칙을 다중값으로 확장 + auto_generate 컬럼 제거
-- 매주: 여러 요일, 매월: 여러 날짜, 매년: 여러 (월,일) 쌍

ALTER TABLE recurring_expenses
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS days_of_month INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS yearly_dates JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 기존 단일값 → 배열로 마이그레이션
UPDATE recurring_expenses SET
  days_of_week = CASE
    WHEN frequency = 'weekly' AND day_of_week IS NOT NULL THEN ARRAY[day_of_week]
    ELSE '{}'::int[]
  END,
  days_of_month = CASE
    WHEN frequency = 'monthly' AND day_of_month IS NOT NULL THEN ARRAY[day_of_month]
    ELSE '{}'::int[]
  END,
  yearly_dates = CASE
    WHEN frequency = 'yearly' AND month_of_year IS NOT NULL AND day_of_month IS NOT NULL
      THEN jsonb_build_array(jsonb_build_object('m', month_of_year, 'd', day_of_month))
    ELSE '[]'::jsonb
  END
WHERE days_of_week = '{}' AND days_of_month = '{}' AND yearly_dates = '[]'::jsonb;

-- 기존 단일값 컬럼 + auto_generate 제거
ALTER TABLE recurring_expenses
  DROP COLUMN IF EXISTS day_of_week,
  DROP COLUMN IF EXISTS day_of_month,
  DROP COLUMN IF EXISTS month_of_year,
  DROP COLUMN IF EXISTS auto_generate;

-- 부분 인덱스도 더 이상 auto_generate 참조 불가 — 재생성
DROP INDEX IF EXISTS idx_recurring_expenses_active;
CREATE INDEX idx_recurring_expenses_active ON recurring_expenses(is_active) WHERE is_active = true;
