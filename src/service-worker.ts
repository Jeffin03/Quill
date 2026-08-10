/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const CACHE = `quill-${version}`;

// The app itself (hashed JS/CSS bundles) plus everything in `static/`.
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	// Always go to the network for LLM API calls.
	if (url.pathname.includes('/chat/completions') || url.pathname.includes('/v1/')) return;

	// Navigations: network-first, fall back to the cached app shell offline.
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(event.request);
					if (response.status === 200) {
						const cache = await caches.open(CACHE);
						cache.put('__app_shell__', response.clone());
					}
					return response;
				} catch {
					const cached = await caches.match('__app_shell__');
					if (cached) return cached;
					throw new Error('Offline');
				}
			})()
		);
		return;
	}

	// Pre-cached build files and static assets: cache-first.
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname));
		return;
	}

	// Everything else: network-first with cache fallback.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(event.request);
				if (
					response.status === 200 &&
					!response.headers.get('cache-control')?.includes('no-store')
				) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				throw new Error('Offline');
			}
		})()
	);
});
