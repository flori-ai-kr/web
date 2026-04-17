import {createClient} from '@supabase/supabase-js';

/**
 * Service Role 클라이언트 (RLS 우회)
 * 반드시 서버 전용 코드에서만 사용. API 라우트, Cron, 내부 엔드포인트에서만 호출.
 * 브라우저 번들에 노출되면 절대 안 됨.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase Service 환경변수가 설정되지 않았습니다');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
