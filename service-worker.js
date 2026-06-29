const CACHE_NAME = 'pdf-free-cache-v3';
const URLS_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'ads.js',
  'manifest.json',
  'trip_ad_banner.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request)),
  );
});
