-- get_sales_summary RPC를 다중 카테고리 필터(text[])로 확장
-- 빈 배열/NULL이면 카테고리 필터 미적용
-- 인자 타입(text → text[])이 바뀌므로 DROP 후 재생성

DROP FUNCTION IF EXISTS public.get_sales_summary(date, date, text, text, text);

CREATE OR REPLACE FUNCTION public.get_sales_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_category text[] DEFAULT NULL,
  p_payment text DEFAULT NULL,
  p_channel text DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
AS $function$
  SELECT json_build_object(
    'total', COALESCE(SUM(CASE WHEN payment_method != 'unpaid' THEN amount ELSE 0 END), 0),
    'card', COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0),
    'naverpay', COALESCE(SUM(CASE WHEN payment_method = 'naverpay' THEN amount ELSE 0 END), 0),
    'transfer', COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END), 0),
    'cash', COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0),
    'count', COUNT(*),
    'unpaid', COALESCE(SUM(CASE WHEN payment_method = 'unpaid' THEN amount ELSE 0 END), 0)
  )
  FROM sales
  WHERE (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date)
    AND (p_category IS NULL OR array_length(p_category, 1) IS NULL OR product_category = ANY(p_category))
    AND (p_payment IS NULL OR payment_method = p_payment)
    AND (p_channel IS NULL OR reservation_channel = p_channel);
$function$;
