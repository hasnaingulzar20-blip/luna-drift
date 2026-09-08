/* Luna Drift — service worker
 *
 * The night keeps humming even when the signal does not.
 *
 *  · navigations      → network-first, cached shell when offline
 *  · /_next/ chunks   → network-first (a stale star is worse than a dark one)
 *  · app media        → stale-while-revalidate: covers, narration and icons,
 *                       once heard, keep playing with no signal at all
 *  · /api/            → network only, the ledger belongs to the living web
 */

const VERSION = "luna-v13";
const SHELL_CACHE = `${VERSION}-shell`;
const MEDIA_CACHE = `${VERSION}-media`;

/* the app shell — enough for a cold offline launch */
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // allSettled: one shy asset must not strand the whole installation
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* fresh when possible, cached when the dark swallows the signal */
async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && request.method === "GET") {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached =
      (await cache.match(request)) ||
      (fallbackUrl ? await cache.match(fallbackUrl) : undefined);
    if (cached) return cached;
    throw err;
  }
}

/* serve the memory, refresh it in the background — stories survive the tunnel */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || (await refresh) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch the cross-origin night
  if (url.pathname.startsWith("/api/")) return; // the ledger stays live

  // covers, narration, icons — kept forever once fetched, refreshed quietly
  if (
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/narration/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/logo.svg" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE));
    return;
  }

  // pages get the freshest night, or the remembered one
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"));
    return;
  }

  // everything else: fresh first, cached as fallback
  event.respondWith(networkFirst(request, SHELL_CACHE));
});
