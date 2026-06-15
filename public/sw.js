// FairAudit PWA Service Worker
const CACHE_NAME = 'fairaudit-pwa-v1';
const OFFLINE_URLs = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Warm up caching for immediate retrieval
      return cache.addAll(OFFLINE_URLs).catch((err) => {
        console.warn('Pre-caching assets warning (some might be fetched dynamically):', err);
      });
    })
  );
  // Force active state instantly
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Clearing deprecated app cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache first, falling back to network strategy with automatic cloning for static requests
self.addEventListener('fetch', (event) => {
  // Only intercept GET methods
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Skip browser extensions or external APIs (except typical web assets)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle local application routes or static bundles
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, fetch in background to refresh (Stale-While-Revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone and store static files dynamically
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // If offline, serve root index.html as a single-page application fallback
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/');
            }
          });
      })
  );
});
