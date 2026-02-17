import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// VAPID 설정 (lazy 초기화)
let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('VAPID 키가 설정되지 않았습니다');
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@hazel.local';
  webpush.setVapidDetails(vapidSubject, publicKey, privateKey);
  vapidConfigured = true;
}

// Cron 보안: CRON_SECRET으로 인증 (timing-safe)
function verifyCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${cronSecret}`;
  if (authHeader && authHeader.length === expected.length) {
    if (timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) return true;
  }
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

// 영구적 실패 상태코드만 비활성화
const PERMANENT_FAILURE_CODES = new Set([404, 410]);

function getEndpointType(endpoint: string): string {
  if (endpoint.includes('apple.com')) return 'Apple';
  if (endpoint.includes('fcm.googleapis.com')) return 'FCM';
  if (endpoint.includes('mozilla.com')) return 'Mozilla';
  return 'Unknown';
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
}

/**
 * 매일 오전 8시(KST) 실행 - 오늘 예약 리마인드 알림
 * Vercel Cron: vercel.json에서 schedule 설정
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    ensureVapid();

    // Service role key로 Supabase 접근 (RLS 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 오늘 날짜 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const today = kstDate.toISOString().split('T')[0];

    // 오늘 예약 조회 (취소 제외, user_id 포함)
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, user_id, title, customer_name, time, amount, status')
      .eq('date', today)
      .neq('status', 'cancelled')
      .order('time', { nullsFirst: false });

    if (resError) {
      console.error('Failed to fetch reservations:', resError);
      return NextResponse.json({ error: resError.message }, { status: 500 });
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ message: 'No reservations today', sent: 0 });
    }

    // 유저별 예약 그룹화
    const reservationsByUser = new Map<string, typeof reservations>();
    for (const r of reservations) {
      const existing = reservationsByUser.get(r.user_id) || [];
      existing.push(r);
      reservationsByUser.set(r.user_id, existing);
    }

    // 해당 유저들의 활성 구독 조회
    const userIds = [...reservationsByUser.keys()];
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .eq('is_active', true)
      .in('user_id', userIds);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions', sent: 0 });
    }

    // 유저별 구독 그룹화
    const subsByUser = new Map<string, SubscriptionRow[]>();
    for (const sub of subscriptions) {
      const uid = (sub as unknown as { user_id: string }).user_id;
      const existing = subsByUser.get(uid) || [];
      existing.push(sub as unknown as SubscriptionRow);
      subsByUser.set(uid, existing);
    }

    let totalSent = 0;
    let totalFailed = 0;
    const permanentFailEndpoints: string[] = [];

    // 유저별로 해당 유저의 예약만 포함된 알림 전송
    for (const [userId, userReservations] of reservationsByUser) {
      const subs = subsByUser.get(userId) || [];
      if (subs.length === 0) continue;

      const count = userReservations.length;
      const summaryLines = userReservations.slice(0, 3).map((r) => {
        const time = r.time ? r.time.slice(0, 5) : '--:--';
        return `${time} ${r.title}${r.customer_name ? ` (${r.customer_name})` : ''}`;
      });

      let body = summaryLines.join('\n');
      if (count > 3) {
        body += `\n외 ${count - 3}건`;
      }

      const payload = JSON.stringify({
        title: `오늘 예약 ${count}건`,
        body,
        tag: `daily-reminder-${today}`,
        url: '/calendar',
        requireInteraction: false,
      });

      console.log(`[Cron:daily] user=${userId} ${count}건 예약 -> ${subs.length}개 구독 전송`, {
        endpoints: subs.map((s) => getEndpointType(s.endpoint)),
      });

      const results = await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh || '', auth: sub.auth || '' },
            },
            payload,
          ),
        ),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        if (result.status === 'rejected') {
          totalFailed++;
          const err = result.reason as { statusCode?: number; body?: string; message?: string };
          const endpointType = getEndpointType(subs[i]!.endpoint);
          console.error(
            `[Cron:daily] 전송 실패 [${endpointType}]`,
            `status=${err.statusCode}`,
            `body=${typeof err.body === 'string' ? err.body.slice(0, 200) : ''}`,
            `message=${err.message || ''}`,
          );
          if (err.statusCode && PERMANENT_FAILURE_CODES.has(err.statusCode)) {
            permanentFailEndpoints.push(subs[i]!.endpoint);
          }
        }
      }

      totalSent += results.filter((r) => r.status === 'fulfilled').length;
    }

    if (permanentFailEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false } as never)
        .in('endpoint', permanentFailEndpoints);
      console.log(`[Cron:daily] ${permanentFailEndpoints.length}개 구독 비활성화 (영구 실패)`);
    }

    return NextResponse.json({
      message: 'Daily reminder sent',
      reservations: reservations.length,
      sent: totalSent,
      failed: totalFailed,
    });
  } catch (error) {
    console.error('Daily reminder error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
