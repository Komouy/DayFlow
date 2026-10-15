/**
 * DayFlow Service Worker v6.5
 * Resilient Stale-While-Revalidate offline cache & instant mobile startup.
 * Zero-hang, auto-cache purge on upgrade guarantee.
 */

const CACHE_NAME = 'dayflow-v6.5';
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

// Stale-While-Revalidate with Instant Cache Return:
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  if (event.request.url.includes('googleapis.com')) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      // Background network fetch to keep cache up to date
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html', { ignoreSearch: true });
          }
          return null;
        });

      // If cached response exists, return immediately for instant UI
      if (cachedResponse) {
        event.waitUntil(networkFetch);
        return cachedResponse;
      }

      // Otherwise wait for network fetch
      return networkFetch.then((res) => {
        if (res) return res;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html', { ignoreSearch: true });
        }
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
