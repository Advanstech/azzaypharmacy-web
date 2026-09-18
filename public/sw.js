// Azzay Pharmacy NEXUS — Service Worker v3
// Offline-first app shell: cache-first for hashed _next/static (immutable),
// network-first for navigations (fresh online, cached offline), SWR for assets.

const CACHE_NAME = 'azzay-nexus-v3';

// Precached at install — the guaranteed offline entry points
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/azzay-logo.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
      })
    )
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Messages ──────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through untouched: non-GET, extensions, external APIs, dev/HMR
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('railway.app') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/dev') ||
    url.pathname.includes('__nextjs') ||
    url.pathname.includes('webpack-hmr')
  ) {
    return;
  }

  // GraphQL endpoint (same-origin dev proxy or direct): network only
  if (url.pathname.includes('graphql')) return;

  // _next/static — content-hashed, immutable → cache-first.
  // THIS is what makes the app bootable offline: JS/CSS chunks persist.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigations — network-first (fresh deploys win), cache as you go,
  // fall back to the cached page or offline.html when the network is gone.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match('/offline.html')
          )
        )
    );
    return;
  }

  // Same-origin static assets (icons, fonts, images, media):
  // stale-while-revalidate — instant offline, refreshed in background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // Everything else: network only
});

// NOTE: POS sale sync is owned by the app's sync engine
// (IndexedDB outbox in browser / native SQLite daemon in Tauri) —
// no background-sync handler here; it previously raced the real engine.
