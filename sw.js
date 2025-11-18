const CACHE_NAME = 'timmer-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // For navigation requests, try network first then fallback to cache/offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        // update cache
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For other requests, try cache first, then network, then fallback
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkRes => {
        // optionally cache fetched assets
        return caches.open(CACHE_NAME).then(cache => {
          // only cache same-origin GET requests
          if (req.method === 'GET' && url.origin === location.origin) cache.put(req, networkRes.clone());
          return networkRes;
        });
      }).catch(()=>{
        // final fallback: offline.html for HTML or nothing for others
        if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) return caches.match('/offline.html');
      });
    })
  );
});
