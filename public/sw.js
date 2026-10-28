const CACHE_NAME = 'halisaha-pro-v5';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Handle direct notification trigger messages from client pages
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data.type === 'SHOW_NOTIFICATION' && self.registration && self.registration.showNotification) {
    const { title, options } = event.data;
    if (title) {
      event.waitUntil(
        self.registration.showNotification(title, options || {}).catch(() => {})
      );
    }
  }
});

// Sunucudan gelen Web Push (FCM) bildirimleri — uygulama kapalıyken de çalışır
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { data: { body: event.data.text() } };
    } catch {}
  }

  const data = payload.data || {};
  const note = payload.notification || {};
  const title = note.title || data.title || '⚽ Halı Saha Pro';
  const body = note.body || data.body || 'Yeni bir bildiriminiz var.';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'halisaha-push',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// Focus or open the app when the user taps on the mobile notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow((event.notification.data && event.notification.data.url) || '/');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  try {
    const url = new URL(event.request.url);
    // NEVER intercept external APIs (ntfy.sh, firebase, open-meteo) or local /api/ endpoints!
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
      return;
    }
  } catch {
    return;
  }

  // Network first, falling back to cache only when offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
