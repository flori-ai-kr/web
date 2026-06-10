-- =============================================
-- 지출 카테고리 + 지출 결제방식 (멀티테넌시)
-- sale_categories / payment_methods 패턴 동일
-- =============================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  value VARCHAR(100) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(value, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);

CREATE TABLE IF NOT EXISTS expense_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  value VARCHAR(20) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(value, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_payment_methods_user_id ON expense_payment_methods(user_id);

-- RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_categories_select" ON expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expense_categories_insert" ON expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expense_categories_update" ON expense_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expense_categories_delete" ON expense_categories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE expense_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_payment_methods_select" ON expense_payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expense_payment_methods_insert" ON expense_payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expense_payment_methods_update" ON expense_payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expense_payment_methods_delete" ON expense_payment_methods FOR DELETE USING (auth.uid() = user_id);
