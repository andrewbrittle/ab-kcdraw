// Service worker for Kanji Strokes - same pattern as the Japanese Drill app.
// Opt-in only, via the "Work offline" setting; the app registers and
// unregisters it, it never registers itself.
//
// Network-first, cache-fallback for every GET: online you always get the
// newest version, and the cache is only used when the network fails.
//
// IMPORTANT: CACHE_VERSION must change whenever the app's version stamp (in
// index.html, bottom of Settings) changes, so old cached files are cleared.
// build.py writes both from the same value.
const CACHE_VERSION = 'strokes-v260924-006';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './fonts/BizUDPGothic-Regular.ttf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // One at a time rather than cache.addAll(), which is all-or-nothing.
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n.startsWith('strokes-') && n !== CACHE_VERSION).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// A slow-but-not-dead connection falls back to the cache after this long.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const networkFetch = fetch(event.request).then((response) => {
    if (response && (response.ok || response.type === 'opaque')) {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  });
  networkFetch.catch(() => {});
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), NETWORK_TIMEOUT_MS));
  event.respondWith(
    Promise.race([networkFetch, timeout]).catch(() => caches.match(event.request).then((cached) => {
      if (cached) return cached;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
