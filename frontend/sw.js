/**
 * SERVICE WORKER - PRESENSI ONLINE PERGURUAN ISLAM NIBRAS
 * PWA Cache & Network-First Navigation Strategy
 */

const CACHE_NAME = 'nibras-presensi-v2.1.2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/state.js',
  './js/api.js',
  './js/auth.js',
  './js/gps.js',
  './js/camera.js',
  './js/guru.js',
  './js/admin.js',
  './js/app.js',
  './icons/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install Event: Langsung skip waiting agar SW baru segera aktif
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mengunduh aset terbaru untuk cache:', CACHE_NAME);
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Sebagian aset gagal dicache:', err);
      });
    })
  );
});

// Activate Event: Hapus SEMUA cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Menghapus cache usang:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event:
// 1. API Calls & Google Scripts -> Network Only
// 2. Navigation (HTML) -> NETWORK FIRST (selalu muat tampilan terbaru dari server/file!)
// 3. Static Assets (CSS/JS/Icons) -> Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jangan sentuh API / script.google.com
  if (
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.hostname.includes('script.googleusercontent.com') ||
    requestUrl.hostname.includes('tile.openstreetmap.org') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-First untuk navigasi halaman HTML (mencegah cache usang pada index.html)
  if (
    event.request.mode === 'navigate' ||
    requestUrl.pathname.endsWith('index.html') ||
    requestUrl.pathname.endsWith('/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('./offline.html');
        })
    );
    return;
  }

  // Stale-While-Revalidate untuk static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
