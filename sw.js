/**
 * DayFlow Service Worker v6.6
 * Resilient Network-First for HTML Navigation & Instant Cache for Static Assets.
 * Zero-hang, immediate redeploy visibility guarantee.
 */

const CACHE_NAME = 'dayflow-v6.6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/panduan-api.html',
  '/manifest.json',
  '/css/tokens.css',
  '/css/style.v5.css',
  '/css/style.css',
  '/js/bundle.v5.js',
  '/js/bundle.js',
  '/js/config.js',
  '/js/icons.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Fetch fresh copies from network (bypass disk cache) during install
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const req = new Request(asset, { cache: 'reload' });
          const res = await fetch(req);
          if (res && res.status === 200) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn('Asset cache skip:', asset, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('dayflow-') && key !== CACHE_NAME) {
            console.log('Purged stale PWA cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Resilient Network-First for HTML navigation, Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  if (event.request.url.includes('googleapis.com')) return;

  // 1. Navigation requests (HTML): Network-First guarantees immediate redeploy updates.
  // Falls back to offline cached /index.html if user is offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html', { ignoreSearch: true }))
    );
    return;
  }

  // 2. Static Assets: Stale-While-Revalidate with Instant Cache Return
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        event.waitUntil(networkFetch);
        return cachedResponse;
      }

      return networkFetch.then((res) => {
        if (res) return res;
        return new Response('Network unavailable', { status: 408, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});

// Push notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        client.focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
