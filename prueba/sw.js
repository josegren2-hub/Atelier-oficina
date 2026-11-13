// Atelier SW: network-first for app shell; NEVER cache estado.json / mando.enc / tareas.enc / sw.js.
const CACHE = 'atelier-prueba-v0.22.1s5c';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING' || e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Live data from Oficina-bots or local — never cache
  if (/(estado\.json|mando\.enc|tareas\.enc)(\?|$)/.test(u.pathname + u.search) || /\/sw\.js$/.test(u.pathname)) {
    e.respondWith(fetch(e.request, {cache: 'no-store'}));
    return;
  }
  if (u.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate' || /(\/|index\.html|manifest\.webmanifest)$/.test(u.pathname)) {
    e.respondWith(
      fetch(e.request.url, {cache: 'no-store'})
        .then((r) => {
          if (r.ok) {
            const c = r.clone();
            caches.open(CACHE).then((x) => x.put(e.request, c));
          }
          return r;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && !/\.(glb|hdr|ktx2)$/i.test(u.pathname)) {
          const c = r.clone();
          caches.open(CACHE).then((x) => x.put(e.request, c));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
