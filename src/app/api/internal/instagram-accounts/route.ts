import {NextResponse} from 'next/server';
import {verifyInternalAuth} from '@/lib/internal-auth';
import {createServiceClient} from '@/lib/supabase/service';

/**
 * 루틴이 스크래핑할 계정 목록을 조회할 때 사용 (읽기 전용).
 * Bearer INTERNAL_API_KEY 필수.
 */
export async function GET(request: Request) {
  if (!verifyInternalAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('id, username, display_name, region, profile_url, active, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[API:instagram-accounts] error', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ accounts: data ?? [] });
}
