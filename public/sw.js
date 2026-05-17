/// <reference lib="webworker" />

// Hazel Admin - Service Worker (Push Notifications)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// fetch 핸들러 (Chrome PWA installability 필수 조건 — 핸들러 존재만으로 충족)
// 동적 어드민 앱이므로 캐싱 안 함. 동일 출처 GET 만 패스스루하고,
// cross-origin(R2 presigned 직접 PUT 등)·비-GET 요청은 SW가 가로채지 않고
// 브라우저 기본 네트워크 처리에 맡긴다. iOS Safari에서 SW가 본문 있는
// cross-origin PUT을 재fetch하면 "TypeError: Load failed"로 실패하기 때문.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
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
