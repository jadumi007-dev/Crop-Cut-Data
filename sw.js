// Service worker for ফসলের নমুনা শস্য কর্তন ফরম
// Caches the app shell + the PDF libraries so PDF/print/share keep working
// even when the wrapped APK has no internet connection after first launch.

const CACHE_NAME = 'crop-cutting-form-v3';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails the whole install if any single request fails (e.g. offline
      // during first install), so cache what we can individually instead.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Precache failed for', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else pass through untouched.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Cache-first for anything we already have (app shell, PDF libraries,
        // fonts) so they work instantly offline.
        return cached;
      }
      return fetch(req)
        .then((networkResponse) => {
          // Opportunistically cache new same-origin or CDN GET responses
          // for next time (best-effort; ignore failures).
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, copy).catch(() => {});
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached — for navigations, fall back to the
          // cached app shell so the app still opens.
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
