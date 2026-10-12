/* Service worker (SPEC.md §9). Hand-written, runtime-cached, no build step.
 * Bump CACHE_VERSION when a strategy changes; old caches are deleted. */
const CACHE_VERSION = "v1";
const STATIC = `static-${CACHE_VERSION}`;
const PAGES = `pages-${CACHE_VERSION}`;
const MISC = `misc-${CACHE_VERSION}`;
const KEEP = [STATIC, PAGES, MISC];
const MAX_STATIC_ENTRIES = 400;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Fetch a page and cache it, after first caching the /_next/static assets it
// references (and fonts referenced by its CSS) so the page works offline.
// Redirected and non-200 responses are never cached.
async function fetchAndStorePage(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (res.status !== 200 || res.redirected) return res;
  const html = await res.clone().text();
  await cacheAssets(html);
  const pages = await caches.open(PAGES);
  await pages.put(new URL(res.url).pathname, res.clone());
  return res;
}

async function cacheAssets(html) {
  const assets = new Set(html.match(/\/_next\/static\/[^"'\s\\)<>]+/g) || []);
  const cache = await caches.open(STATIC);
  await Promise.all(
    [...assets].map(async (asset) => {
      if (await cache.match(asset)) return;
      try {
        const res = await fetch(asset);
        if (!res.ok) return;
        await cache.put(asset, res.clone());
        if (asset.endsWith(".css")) {
          const fonts = (await res.text()).match(/\/_next\/static\/media\/[^"')\s]+/g) || [];
          await Promise.all(
            [...new Set(fonts)].map(async (font) => {
              if (await cache.match(font)) return;
              const fr = await fetch(font);
              if (fr.ok) await cache.put(font, fr);
            }),
          );
        }
      } catch {
        // Best effort; a missing asset only matters if the page is opened offline.
      }
    }),
  );
  trimStatic(cache);
}

async function trimStatic(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES))) {
    await cache.delete(key);
  }
}

async function handleNavigation(event) {
  const { request } = event;
  const path = new URL(request.url).pathname;
  const pages = await caches.open(PAGES);
  const cached = await pages.match(path, { ignoreVary: true });

  if (cached) {
    event.waitUntil(fetchAndStorePage(request.url).catch(() => {}));
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res.status === 200 && !res.redirected) {
      event.waitUntil(fetchAndStorePage(request.url).catch(() => {}));
    }
    return res;
  } catch (err) {
    // Offline and never cached: the home page beats a browser error.
    const home = await pages.match("/", { ignoreVary: true });
    if (home) return home;
    throw err;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then((res) => {
      if (res.status === 200) cache.put(event.request, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (url.pathname === "/sw.js" || request.headers.has("range")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
  } else if (
    request.headers.has("rsc") ||
    request.headers.has("next-router-prefetch") ||
    url.searchParams.has("_rsc")
  ) {
    // RSC payloads: network only. A failure makes Next fall back to a full
    // navigation, which is served from the pages cache above.
  } else {
    event.respondWith(staleWhileRevalidate(event, MISC));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "WARM" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    Promise.all(
      data.urls.map((u) => {
        const url = new URL(u, self.location.origin);
        if (url.origin !== self.location.origin) return undefined;
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return undefined;
        return fetchAndStorePage(url.pathname).catch(() => {});
      }),
    ),
  );
});
