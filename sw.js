const CACHE_NAME = 'stopwatch-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  ev.respondWith(
    caches.match(ev.request).then(cached => cached || fetch(ev.request).then(r => {
      if (ev.request.method === 'GET' && r && r.status === 200) {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(ev.request, copy));
      }
      return r;
    }).catch(() => {
      return caches.match('/index.html');
    }))
  );
});
