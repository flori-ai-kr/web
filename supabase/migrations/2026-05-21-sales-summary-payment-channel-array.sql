-- get_sales_summary RPC를 payment, channel도 다중값(text[])으로 확장
-- 이전 단일값 → 배열로 변경 (인자 타입 변경이므로 DROP 후 재생성)

DROP FUNCTION IF EXISTS public.get_sales_summary(date, date, text[], text, text);

CREATE OR REPLACE FUNCTION public.get_sales_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_category text[] DEFAULT NULL,
  p_payment text[] DEFAULT NULL,
  p_channel text[] DEFAULT NULL
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
    AND (p_payment IS NULL OR array_length(p_payment, 1) IS NULL OR payment_method = ANY(p_payment))
    AND (p_channel IS NULL OR array_length(p_channel, 1) IS NULL OR reservation_channel = ANY(p_channel));
$function$;
