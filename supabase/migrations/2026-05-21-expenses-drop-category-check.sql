-- expenses.category CHECK constraint 제거
-- 커스텀 카테고리(expense_categories 테이블) 사용을 막던 고정 enum 제약 해제
-- 카테고리 유효성은 Server Action 레벨에서 user의 expense_categories와 대조해 검증

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
