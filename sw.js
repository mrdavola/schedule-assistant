const CACHE_NAME = 'schedule-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/settings.html',
  '/css/style.css',
  '/css/settings.css',
  '/js/app.js',
  '/js/config.js',
  '/js/color-extract.js',
  '/js/schedule-engine.js',
  '/js/voice-parser.js',
  '/js/speech.js',
  '/js/settings-ui.js',
  '/config-default.json',
  '/manifest.json'
];

// Activate immediately — don't wait for old tabs to close
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS.map((url) =>
          fetch(url, { redirect: 'follow' })
            .then((resp) => resp.ok ? cache.put(url, resp) : null)
            .catch(() => {})
        )
      );
    })
  );
});

// Take control of all pages immediately
self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
});

// Network-first: always try fresh, fall back to cache for offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, { redirect: 'follow' })
      .then((response) => {
        // Cache the fresh response for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
