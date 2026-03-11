const CACHE_NAME = 'schedule-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/settings.html',
  '/css/style.css',
  '/css/settings.css',
  '/js/app.js',
  '/js/config.js',
  '/js/schedule-engine.js',
  '/js/voice-parser.js',
  '/js/speech.js',
  '/js/settings-ui.js',
  '/config-default.json',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
});
