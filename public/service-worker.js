const CACHE_NAME = 'vanguard-ner-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/navbar.js',
  '/map.js',
  '/translations.js',
  '/citizen/citizen.html',
  '/citizen/citizen.js',
  '/rescue/rescue.html',
  '/rescue/rescue.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/socket.io/')) return; // let Socket.IO bypass the cache entirely

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503, statusText: 'Offline' }));
    })
  );
});