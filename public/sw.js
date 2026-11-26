/* Understanding Motor Controls service worker: precaches the app shell, then serves it offline. */
const VERSION = '__VERSION__';
const CACHE = 'understanding-motor-controls-' + VERSION;
const PRECACHE = '__PRECACHE__';
const ASSETS = Array.isArray(PRECACHE) ? PRECACHE : ['./'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('understanding-motor-controls-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // same-origin only
  if (req.mode === 'navigate') {
    // network first so updates arrive, fall back to the cached shell offline
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return r; }).catch(() => caches.match('./').then((r) => r || caches.match(req))));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })),
  );
});
