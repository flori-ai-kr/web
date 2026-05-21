-- 부분 unique 인덱스를 ON CONFLICT 가능한 정식 UNIQUE 제약으로 교체
-- NULL recurring_id는 distinct 취급되어 수동 지출끼리는 충돌 없음

DROP INDEX IF EXISTS idx_expenses_recurring_date;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_recurring_date_unique UNIQUE (recurring_id, date);
