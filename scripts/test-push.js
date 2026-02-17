#!/usr/bin/env node

/**
 * 로컬 푸시 알림 테스트 스크립트
 * 사용법: node scripts/test-push.js [type]
 *
 * type:
 *   reminder  - 개별 예약 리마인더 (기본값)
 *   daily     - 일일 요약
 *   both      - 둘 다 전송 (3초 간격)
 *
 * .env.local에서 VAPID 키를 읽고, Supabase에서 활성 구독을 가져와서
 * 테스트 푸시를 전송합니다.
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// .env.local에서 환경변수 읽기
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) vars[match[1].trim()] = match[2].trim();
  }
  return vars;
}

// 요일 라벨
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getDateLabel() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth() + 1;
  const date = kst.getUTCDate();
  const day = DAY_LABELS[kst.getUTCDay()];
  return `${month}/${date}(${day})`;
}

// 테스트 페이로드 생성
function makeReminderPayload() {
  const dateLabel = getDateLabel();
  return JSON.stringify({
    title: '\uD83D\uDC90 예약 리마인더',
    body: `${dateLabel} 14:00 | 박지현님 (단골)\n졸업식 꽃다발 2건 + 화환 1건 \u00B7 180,000원`,
    tag: 'test-reminder',
    url: '/calendar',
    requireInteraction: true,
  });
}

function makeDailyPayload() {
  return JSON.stringify({
    title: '\uD83C\uDF38 오늘 예약 7건',
    body: [
      '09:30 홍길동님 (VIP) \u00B7 프로포즈 스페셜 꽃다발',
      '11:00 김영희님 \u00B7 졸업식 꽃다발 2건 + 화환',
      '14:00 이철수님 (단골) \u00B7 개업 축하 화환 대형',
      '외 4건',
    ].join('\n'),
    tag: 'test-daily',
    url: '/calendar',
    requireInteraction: false,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToAll(subscriptions, payload, label) {
  console.log(`\n[${label}] 전송 중...`);
  console.log(`  payload: ${payload}\n`);

  for (const sub of subscriptions) {
    const type = sub.endpoint.includes('apple') ? 'Apple'
      : sub.endpoint.includes('fcm') ? 'FCM'
      : 'Unknown';

    try {
      const result = await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      console.log(`  [${type}] 성공 (${result.statusCode})`);
    } catch (err) {
      const statusCode = err.statusCode || 0;
      const body = typeof err.body === 'string' ? err.body.slice(0, 200) : '';
      console.error(`  [${type}] 실패 (${statusCode}): ${err.message}`);
      if (body) console.error(`    body: ${body}`);
    }
  }
}

async function main() {
  const type = process.argv[2] || 'both';
  const env = loadEnv();

  const vapidPublic = env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
  const vapidPrivate = env['VAPID_PRIVATE_KEY'];
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!vapidPublic || !vapidPrivate) {
    console.error('VAPID 키가 .env.local에 없습니다');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL/키가 .env.local에 없습니다');
    process.exit(1);
  }

  const vapidSubject = env['VAPID_SUBJECT'] || 'mailto:admin@hazel.local';
  console.log('VAPID subject:', vapidSubject);
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // Supabase에서 활성 구독 가져오기
  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?is_active=eq.true&select=endpoint,p256dh,auth`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!res.ok) {
    console.error('Supabase 조회 실패:', res.status, await res.text());
    process.exit(1);
  }

  const subscriptions = await res.json();
  console.log(`\n활성 구독 ${subscriptions.length}개 발견:\n`);

  for (const sub of subscriptions) {
    const endpointType = sub.endpoint.includes('apple') ? 'Apple'
      : sub.endpoint.includes('fcm') ? 'FCM'
      : 'Unknown';
    console.log(`  - ${endpointType}: ${sub.endpoint.slice(0, 60)}...`);
  }

  if (subscriptions.length === 0) {
    console.log('\n활성 구독이 없습니다. 설정 페이지에서 푸시를 켜주세요.');
    return;
  }

  if (type === 'reminder' || type === 'both') {
    await sendToAll(subscriptions, makeReminderPayload(), '개별 리마인더');
  }

  if (type === 'both') {
    console.log('\n3초 후 일일 요약 전송...');
    await sleep(3000);
  }

  if (type === 'daily' || type === 'both') {
    await sendToAll(subscriptions, makeDailyPayload(), '일일 요약');
  }

  console.log('\n완료!');
}

main().catch(console.error);
