/*
 * Pragyan service worker — genuine offline-first, not a cached landing page.
 *
 * Rules that keep it safe:
 *   • Only GET, same-origin requests are touched. Nothing is cached for /api/
 *     except the chapter packs the learner explicitly downloaded.
 *   • Build output (/_next/static) is cached only when the response is marked
 *     immutable, which is true in a production build and false in `next dev` —
 *     so a developer never gets a stale bundle from the worker.
 *   • Navigations are network-first with a cached fallback and, when a learner is
 *     offline, the bundled offline app is served instead of a browser error page.
 *
 * The offline app itself is a plain HTML file with no framework dependency: it
 * reads packs and queues results in IndexedDB, so studying offline does not
 * depend on Next.js, React or this server being reachable.
 */

const VERSION = "pragyan-offline-v1";
const APP_SHELL = "/offline/offline-app.html";
const PRECACHE = ["/offline/", "/offline/offline-app.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            // A missing optional asset must not block the worker from installing.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isImmutable(response) {
  const header = response.headers.get("cache-control") || "";
  return header.includes("immutable") || header.includes("max-age=31536000");
}

async function networkFirst(request, fallback) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallback) {
      const shell = await cache.match(fallback);
      if (shell) return shell;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && isImmutable(response)) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Chapter packs: downloaded on purpose, served from cache when offline.
  if (url.pathname.startsWith("/api/offline/pack/")) {
    event.respondWith(networkFirst(request, null));
    return;
  }
  // Never cache other API traffic: marks, notes and sync must be live.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_SHELL));
    return;
  }

  if (url.pathname.startsWith("/_next/") || /\.(?:css|js|woff2?|svg|png|jpg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VERSION);
        await Promise.all(
          data.urls.map(async (url) => {
            try {
              await cache.add(new Request(url, { cache: "reload" }));
            } catch {
              // Best effort: the IndexedDB copy is the source of truth offline.
            }
          }),
        );
        const client = event.source;
        if (client && client.postMessage) client.postMessage({ type: "CACHE_DONE", urls: data.urls });
      })(),
    );
  }
  if (data.type === "SKIP_WAITING") self.skipWaiting();
});
