const CACHE_NAME = 'hunter-pace-timer-v2';
const STATIC_CACHE_NAME = 'hunter-pace-static-v2';
const DATA_CACHE_NAME = 'hunter-pace-data-v2';

// Assets to cache up-front. Next.js static chunks (/_next/static/*) are cached
// on first fetch via the runtime handler below — they have hashed filenames so
// we can safely cache-first them.
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests entirely (POST/PUT/DELETE go to Firebase via SDK,
  // which has its own offline persistence — interfering would cause double-writes).
  if (request.method !== 'GET') return;

  // Firebase calls: pass straight through to the SDK; the Firestore SDK's
  // own IndexedDB persistence handles offline. Don't cache these in the SW.
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return;
  }

  // Next.js static chunks: cache-first, populate on first fetch.
  // Filenames are content-hashed so cache invalidation is automatic.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // App shell + everything else: cache-first with network fallback.
  // If both fail and a document was requested, serve the cached root so the
  // PWA still boots (the React app then loads cached state from localStorage).
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).catch(() => {
          if (request.destination === 'document') {
            return caches.match('/');
          }
        })
      );
    })
  );
});

// Background sync removed: the Firestore SDK and the React-side useCloudStorage
// queue handle offline writes. The previous /api/sync handler called a route
// that doesn't exist.

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Hunter Pace Timer notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Hunter Pace Timer', options)
  );
});
