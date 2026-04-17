import webpush from 'web-push';
import {createServiceClient} from '@/lib/supabase/service';

/**
 * Service Role 기반 푸시 브로드캐스트
 * 내부 API 라우트/Cron에서 사용 (세션 없음).
 * `src/lib/actions/push.ts`의 sendPushToAllUsers는 SSR 클라이언트라서
 * 세션 없는 컨텍스트에서는 RLS에 막혀 구독 조회 못 함.
 */

interface BroadcastPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

const PERMANENT_FAILURE_CODES = new Set([404, 410]);

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@hazel.local';
  if (!publicKey || !privateKey) throw new Error('VAPID 키가 설정되지 않았습니다');
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

function getEndpointType(endpoint: string): string {
  if (endpoint.includes('apple.com')) return 'Apple';
  if (endpoint.includes('fcm.googleapis.com')) return 'FCM';
  if (endpoint.includes('mozilla.com')) return 'Mozilla';
  return 'Unknown';
}

export async function broadcastPush(
  payload: BroadcastPayload,
): Promise<{ sent: number; failed: number }> {
  ensureVapid();
  const supabase = createServiceClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('is_active', true);

  if (error) {
    console.error('[Broadcast] 구독 조회 실패', error);
    return { sent: 0, failed: 0 };
  }
  if (!subscriptions || subscriptions.length === 0) {
    console.log('[Broadcast] 활성 구독 없음');
    return { sent: 0, failed: 0 };
  }

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag || 'hazel',
    url: payload.url || '/',
    requireInteraction: payload.requireInteraction || false,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh || '', auth: sub.auth || '' },
        },
        payloadStr,
      ),
    ),
  );

  const permanentFailEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const sub = subscriptions[i]!;
    if (result.status === 'fulfilled') {
      sent++;
      continue;
    }
    failed++;
    const err = result.reason as { statusCode?: number; message?: string; body?: string };
    const endpointType = getEndpointType(sub.endpoint);
    console.error(
      `[Broadcast] 전송 실패 [${endpointType}]`,
      `status=${err.statusCode}`,
      `message=${err.message}`,
    );
    if (err.statusCode && PERMANENT_FAILURE_CODES.has(err.statusCode)) {
      permanentFailEndpoints.push(sub.endpoint);
    }
  }

  if (permanentFailEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('endpoint', permanentFailEndpoints);
    console.log(`[Broadcast] ${permanentFailEndpoints.length}개 구독 비활성화 (영구 실패)`);
  }

  return { sent, failed };
}
