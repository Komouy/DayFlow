/**
 * DayFlow Service Worker v8.1-react
 * Modern React PWA Service Worker with background scheduling, periodic sync,
 * Notification Triggers, and zero stale-cache freeze.
 */

const CACHE_NAME = 'dayflow-v8.9-react';
const STATIC_ASSETS = [
  '/',
  'index.html',
  '/index.html',
  'manifest.json',
  '/manifest.json',
  'icons/icon.svg',
  '/icons/icon.svg',
  'icons/icon-192.png',
  '/icons/icon-192.png',
  'icons/icon-512.png',
  '/icons/icon-512.png'
];

const DB_NAME = 'dayflow_pwa_db';
const DB_VERSION = 2;
const STORE_SCHEDULES = 'schedules';
const STORE_SETTINGS = 'settings';
const STORE_NOTES = 'notes';
const STORE_NOTE_ATTACHMENTS = 'note_attachments';

function getDbInSW() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No indexedDB in SW'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SCHEDULES)) {
        db.createObjectStore(STORE_SCHEDULES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTE_ATTACHMENTS)) {
        const attachmentStore = db.createObjectStore(STORE_NOTE_ATTACHMENTS, { keyPath: 'id' });
        attachmentStore.createIndex('noteId', 'noteId', { unique: false });
      }
    };
  });
}

// Background scheduler via Notification Triggers API
async function scheduleNotificationTriggersInSW(schedules = [], advanceMinutes = 15) {
  if (typeof Notification === 'undefined' || !('showTrigger' in Notification.prototype)) {
    return;
  }
  const now = Date.now();
  for (const schedule of schedules) {
    if (schedule.completed || schedule.reminder === false) continue;
    const parts = String(schedule.date || '').split('-').map(Number);
    const [hours, minutes] = String(schedule.time || '00:00').split(':').map(Number);
    if (!parts || parts.length < 3 || isNaN(parts[0])) continue;

    const schedDate = new Date(parts[0], parts[1] - 1, parts[2], hours || 0, minutes || 0, 0);
    const schedMs = schedDate.getTime();

    // 1. Advance notification trigger
    const advMs = schedMs - advanceMinutes * 60 * 1000;
    if (advMs > now) {
      try {
        await self.registration.showNotification(`DayFlow: ${schedule.title}`, {
          body: `${schedule.title} (${schedule.time}) — Dalam ${advanceMinutes} menit lagi`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `trigger_${schedule.id}_advance`,
          showTrigger: new TimestampTrigger(advMs),
          data: { scheduleId: schedule.id, scheduleDate: schedule.date }
        });
      } catch (_) {}
    }

    // 2. Exact event time trigger
    if (schedMs > now) {
      try {
        await self.registration.showNotification(`DayFlow Pengingat: ${schedule.title}`, {
          body: `Waktunya: ${schedule.title} (${schedule.time}) sedang berlangsung`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `trigger_${schedule.id}_now`,
          showTrigger: new TimestampTrigger(schedMs),
          data: { scheduleId: schedule.id, scheduleDate: schedule.date },
          actions: [
            { action: 'snooze_10', title: 'Tunda 10 Menit' },
            { action: 'complete', title: 'Tandai Selesai' }
          ]
        });
      } catch (_) {}
    }
  }
}

// Background schedule checker for periodic sync or system wakeups
async function checkUpcomingSchedulesInSW() {
  try {
    const db = await getDbInSW();
    const schedules = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDULES, 'readonly');
      const store = tx.objectStore(STORE_SCHEDULES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    for (const schedule of schedules) {
      if (schedule.completed || schedule.reminder === false) continue;
      if (schedule.date !== todayStr) continue;

      const [hours, minutes] = String(schedule.time || '00:00').split(':').map(Number);
      const schedTime = new Date(year, now.getMonth(), now.getDate(), hours || 0, minutes || 0, 0);
      const diffMs = schedTime.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);

      // Trigger if current time is within advance window (e.g. 15 mins) or starting now
      if (diffMins <= 15 && diffMins >= 0) {
        const timeLabel = diffMins === 0 ? 'Sedang berlangsung' : `Dalam ${diffMins} menit lagi`;
        await self.registration.showNotification(`DayFlow: ${schedule.title}`, {
          body: `${schedule.title} (${schedule.time}) — ${timeLabel}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `sw_${schedule.id}_${diffMins <= 0 ? 'now' : 'advance'}`,
          data: { scheduleId: schedule.id, scheduleDate: todayStr },
          actions: [
            { action: 'snooze_10', title: 'Tunda 10 Menit' },
            { action: 'complete', title: 'Tandai Selesai' }
          ]
        });
      }
    }

    // Check deadlines approaching today
    const todayMidnight = new Date(year, now.getMonth(), now.getDate());
    for (const schedule of schedules) {
      if (schedule.completed || !schedule.deadline) continue;
      const dParts = String(schedule.deadline).split('-').map(Number);
      if (dParts.length < 3 || isNaN(dParts[0])) continue;
      const deadDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      const dayDiff = Math.round((deadDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 0) {
        await self.registration.showNotification(`DayFlow: Tenggat Hari Ini!`, {
          body: `Tugas "${schedule.title}" batas akhirnya adalah hari ini. Jangan lupa selesaikan!`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `sw_deadline_today_${schedule.id}`,
          data: { scheduleId: schedule.id, scheduleDate: todayStr },
          actions: [
            { action: 'complete', title: 'Tandai Selesai' }
          ]
        });
      }
    }
  } catch (e) {
    console.warn('checkUpcomingSchedulesInSW error:', e);
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const req = new Request(asset, { cache: 'reload' });
          const res = await fetch(req);
          if (res && res.status === 200) {
            await cache.put(asset, res);
          }
        } catch {
          // Skip missing assets during dev
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
          if (key !== CACHE_NAME) {
            console.log('Purging legacy DayFlow cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  if (event.request.url.includes('googleapis.com')) return;

  const url = new URL(event.request.url);

  // During Vite dev or hot-reloading, bypass Service Worker cache entirely
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('node_modules') ||
    url.port === '3000' ||
    url.port === '5173'
  ) {
    return;
  }

  // 1. Navigation (HTML): Strict Network-First with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
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

  // 2. Static Assets: Network-first for fresh builds, stale fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});

// Sync schedules and background triggers from client window
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SYNC_SCHEDULES') {
    event.waitUntil((async () => {
      try {
        const db = await getDbInSW();
        const tx = db.transaction(STORE_SCHEDULES, 'readwrite');
        const store = tx.objectStore(STORE_SCHEDULES);
        store.clear();
        if (Array.isArray(data.schedules)) {
          data.schedules.forEach((item) => {
            if (item && item.id) store.put(item);
          });
        }
        await new Promise((res, rej) => {
          tx.oncomplete = res;
          tx.onerror = rej;
        });

        if (Array.isArray(data.schedules)) {
          await scheduleNotificationTriggersInSW(data.schedules, data.advanceMinutes || 15);
        }
      } catch (e) {
        console.warn('SW SYNC_SCHEDULES error:', e);
      }
    })());
  } else if (data.type === 'CHECK_SCHEDULES_NOW') {
    event.waitUntil(checkUpcomingSchedulesInSW());
  }
});

// Periodic background sync event handler
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'dayflow-check-schedules') {
    event.waitUntil(checkUpcomingSchedulesInSW());
  }
});

// Push notification click handler with action button support
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const { scheduleId, scheduleDate } = data;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If user clicked action button (snooze_10 or complete)
      if (action === 'snooze_10' || action === 'complete') {
        if (clientList.length > 0) {
          clientList.forEach((client) => {
            client.postMessage({
              type: action === 'snooze_10' ? 'NOTIFICATION_ACTION_SNOOZE' : 'NOTIFICATION_ACTION_COMPLETE',
              scheduleId,
              scheduleDate,
              minutes: 10
            });
          });
          return;
        } else {
          // If no window is active and user clicked snooze, schedule notification 10 minutes later in SW
          if (action === 'snooze_10' && self.registration && self.registration.showNotification) {
            setTimeout(() => {
              self.registration.showNotification('DayFlow Pengingat (Ditunda)', {
                body: event.notification.body || 'Pengingat jadwal yang ditunda 10 menit.',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: scheduleId ? `${scheduleId}_snoozed` : 'dayflow_snoozed',
                data: { scheduleId, scheduleDate }
              });
            }, 10 * 60 * 1000);
            return;
          }
        }
      }

      // 2. Default click: focus existing window or open a new one
      if (clientList.length > 0) {
        let client = clientList[0];
        client.focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
