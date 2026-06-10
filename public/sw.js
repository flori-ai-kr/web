/// <reference lib="webworker" />

// Hazel Admin - Service Worker (Push Notifications)

// 오프라인 폴백 페이지만 캐시한다(동적 어드민이라 그 외엔 캐싱 안 함).
const OFFLINE_CACHE = 'flori-offline-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      // 폴백 캐시 저장이 끝난 뒤 활성화로 넘어가도록 순서 보장
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 옛 버전의 오프라인 캐시만 정리한다(다른 캐시는 건드리지 않음).
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('flori-offline-') && k !== OFFLINE_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// fetch 핸들러 (Chrome PWA installability 필수 조건 — 핸들러 존재만으로 충족)
// 동적 어드민 앱이므로 일반 캐싱은 안 한다. 동일 출처 GET 만 처리하고,
// cross-origin(R2 presigned 직접 PUT 등)·비-GET 요청은 SW가 가로채지 않고
// 브라우저 기본 네트워크 처리에 맡긴다. iOS Safari에서 SW가 본문 있는
// cross-origin PUT을 재fetch하면 "TypeError: Load failed"로 실패하기 때문.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // 페이지 이동(네비게이션)은 네트워크 우선 → 오프라인이면 폴백 페이지를 보여준다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(OFFLINE_CACHE);
        const cached = await cache.match(OFFLINE_URL);
        return cached ?? Response.error();
      })
    );
    return;
  }

  // 그 외 동일 출처 GET(에셋 등)은 기존처럼 네트워크 패스스루.
  event.respondWith(fetch(request));
});

// 푸시 수신
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '헤이즐', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'hazel-notification',
    renotify: !!data.tag,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '헤이즐', options)
  );
});

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // 없으면 새 탭
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
