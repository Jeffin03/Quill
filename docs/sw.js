/* ══════════════════════════════════════════
   Quill — Service Worker
   Caches all static assets for offline
   access and instant loading.
   ══════════════════════════════════════════ */

const CACHE_NAME = 'quill-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/chat.css',
  './css/cards.css',
  './css/tree.css',
  './js/db.js',
  './js/llm.js',
  './js/cardEngine.js',
  './js/api.js',
  './js/app.js',
  './js/chat.js',
  './js/cards.js',
  './js/tree.js',
  './js/storyList.js',
  './js/utils.js',
  './js/imageGen.js',
  './js/characterDesign.js',
  './js/comic.js',
  './css/comic.css',
  './manifest.json',
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

// Activate: clean up old caches and notify clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      // Tell all tabs a new version is active
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' }));
    })()
  );
});

// Fetch: network-first for JS, cache-first for everything else
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Skip LLM API calls — always go to network
  if (url.pathname.includes('/chat/completions')) return;
  if (url.pathname.includes('/v1/models')) return;
  if (url.pathname.includes('/api/tags')) return;

  const isJS = url.pathname.endsWith('.js');

  event.respondWith(
    (isJS ? networkFirst(event.request) : cacheFirst(event.request))
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
