/* ══════════════════════════════════════════
   Quill — Service Worker
   Caches all static assets for offline
   access and instant loading.
   ══════════════════════════════════════════ */

const CACHE_NAME = 'quill-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/chat.css',
  '/css/cards.css',
  '/css/tree.css',
  '/js/db.js',
  '/js/llm.js',
  '/js/cardEngine.js',
  '/js/api.js',
  '/js/app.js',
  '/js/chat.js',
  '/js/cards.js',
  '/js/tree.js',
  '/js/storyList.js',
  '/js/utils.js',
  '/manifest.json',
];

// Install: pre-cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip LLM API calls — always go to network
  const url = new URL(event.request.url);
  if (url.pathname.includes('/chat/completions')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful static responses
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      });
    })
  );
});
