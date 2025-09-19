self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Clean old caches if you add versioning later
    await self.clients.claim();
  })());
});

// Network-first for dynamic resources like latest.txt/json and config.json
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isDynamic = /latest\.(txt|json)$/i.test(url.pathname) || url.pathname.endsWith('/config.json');

  if (isDynamic) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
    return;
  }
  // Static assets: try cache first, then network
  event.respondWith(
    caches.open('gp-static-v1').then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const resp = await fetch(event.request);
        // Don't cache cross-origin iframes or opaque responses
        if (resp.ok && resp.type === 'basic') {
          cache.put(event.request, resp.clone());
        }
        return resp;
      } catch (e) {
        return cached || Response.error();
      }
    })
  );
});
