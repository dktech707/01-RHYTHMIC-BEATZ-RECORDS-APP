/* RBR PWA Service Worker
   CACHE VERSION: 2025-12-30-REV6.1
   Purpose: keep app usable offline, but avoid "stuck on old UI" during development.
*/
const CACHE_NAME = 'rbr-pwa-2026-01-29-REV7';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.json',
  './releases.json',
  './artists.json',
  './events.json',
  './news.json',
  './podcast.json',
  './store.json',
  './playlists.json',
  './settings.json',
  './feedback.json',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Tolerant caching: fetch each resource and only cache successful responses
    for(const u of CORE_ASSETS){
      try{
        const r = await fetch(new Request(u, {cache: 'reload'}));
        if(r && r.ok){
          try{ await cache.put(u, r.clone()); }catch(e){}
        }
      }catch(e){ /* ignore individual failures */ }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('rbr-pwa-') && k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Always try network first for JSON + app.js to avoid stale data
  if (url.pathname.endsWith('.json') || url.pathname.endsWith('/app.js')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // For navigation requests, serve cached index.html, but refresh in background
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./index.html');
      const fetchPromise = fetch(req).then(r => {
        try{ cache.put('./index.html', r.clone()); }catch(e){}
        return r;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Default: cache-first for everything else
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try{
      const net = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      try{ cache.put(req, net.clone()); }catch(e){}
      return net;
    }catch(e){
      return Response.error();
    }
  })());
});
