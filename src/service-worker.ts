/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Shell-only caching (spec §14): immutable build assets and static files are
// cached; pages and data always go to the network. Offline recipe reading is
// a v1.2 feature.

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `shell-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) await caches.delete(key);
			}
		})
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET' || url.origin !== location.origin) return;
	if (!ASSETS.includes(url.pathname)) return;
	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const cached = await cache.match(url.pathname);
			return cached ?? fetch(event.request);
		})
	);
});
