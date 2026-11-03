/**
 * SERVICE WORKER - PRESENSI ONLINE PERGURUAN ISLAM NIBRAS
 * PWA Cache & Offline Strategy
 */

const CACHE_NAME = 'nibras-presensi-v1.0.0';

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
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install Event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Caching partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for API, Stale-While-Revalidate for Static Assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jangan cache request ke Google Apps Script atau script.google.com (Selalu Network Only)
  if (
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.hostname.includes('script.googleusercontent.com') ||
    requestUrl.hostname.includes('tile.openstreetmap.org') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Jika request navigasi halaman gagal dan offline, arahkan ke offline.html
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});

