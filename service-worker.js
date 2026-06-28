self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pdf-free-cache').then((cache) => {
      return cache.addAll([
        'index.html',
        'app.js',
        'style.css',
        'trip_ad_banner.png',
      ]);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request);
    }),
  );
});
