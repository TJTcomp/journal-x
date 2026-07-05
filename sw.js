/* Journal X — Service Worker
   Caches the app shell so the interface opens instantly and works offline.
   Your trade DATA lives in Supabase and always syncs when you're online —
   this only caches the interface itself, never your data or API calls. */

const CACHE = 'journalx-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', 'index.html']).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests. Supabase API calls, Google Fonts, and
  // the CDN scripts are cross-origin and must always go straight to the network
  // so your data is never stale and auth always works.
  if (url.origin !== self.location.origin) return;

  // Network-first for the app itself: when you're online you always get the
  // latest version, and when you're offline you fall back to the cached shell.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || caches.match('./') || caches.match('index.html'))
      )
  );
});
