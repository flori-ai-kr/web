-- 고정비(반복 지출) 템플릿 + 인스턴스 연결 + skip 테이블
-- 주/월/연 반복, 자동생성 cron, iOS 스타일 "이것만/이후 모두" 지원

-- 1) 고정비 템플릿 테이블
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  item_name TEXT NOT NULL,
  category VARCHAR(30) NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  payment_method VARCHAR(20) NOT NULL,
  vendor TEXT,
  note TEXT,

  -- 반복 규칙
  frequency VARCHAR(10) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),  -- 매 N주/월/년
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),               -- weekly: 0(일)~6(토)
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),            -- monthly/yearly
  month_of_year INTEGER CHECK (month_of_year BETWEEN 1 AND 12),          -- yearly

  start_date DATE NOT NULL,
  end_date DATE,
  auto_generate BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_expenses_user ON recurring_expenses(user_id);
CREATE INDEX idx_recurring_expenses_active ON recurring_expenses(is_active, auto_generate) WHERE is_active = true AND auto_generate = true;

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_expenses_select" ON recurring_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring_expenses_insert" ON recurring_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_expenses_update" ON recurring_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recurring_expenses_delete" ON recurring_expenses FOR DELETE USING (auth.uid() = user_id);

-- 2) expenses 테이블 확장
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring_modified BOOLEAN NOT NULL DEFAULT false;

-- 같은 템플릿에서 같은 날짜에 중복 생성 방지 (자동생성 idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_recurring_date
  ON expenses(recurring_id, date)
  WHERE recurring_id IS NOT NULL;

-- 3) skip 테이블 ("이것만 삭제" 시 cron 재생성 방지)
CREATE TABLE IF NOT EXISTS recurring_skips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  skip_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_id, skip_date)
);

CREATE INDEX idx_recurring_skips_user ON recurring_skips(user_id);

ALTER TABLE recurring_skips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_skips_select" ON recurring_skips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring_skips_insert" ON recurring_skips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_skips_delete" ON recurring_skips FOR DELETE USING (auth.uid() = user_id);

-- 4) updated_at 트리거
CREATE OR REPLACE FUNCTION set_recurring_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_recurring_expenses_updated_at();
