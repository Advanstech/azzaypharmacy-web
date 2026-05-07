// Azzay Pharmacy NEXUS — Service Worker v2.1
// Fixed: Never cache _next/ build chunks (they break on rebuild)

const CACHE_NAME = 'azzay-nexus-v2.1';

// Only cache these specific static assets — NOT _next/ chunks
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/azzay-logo.png',
  '/offline.html',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always skip:
  // - Non-GET requests
  // - Chrome extensions
  // - Supabase API calls
  // - Next.js build chunks (_next/static) — these MUST come from network
  //   because they have content-hash names that change on every build
  // - Next.js dev server chunks (_next/dev)
  // - HMR websocket
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('__nextjs') ||
    url.pathname.includes('webpack-hmr')
  ) {
    return; // Let browser handle normally
  }

  // Navigation requests (HTML pages): Network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request)
            .then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Logo and manifest: Cache first (these never change)
  if (
    url.pathname === '/azzay-logo.png' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/offline.html'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
    return;
  }

  // Everything else: Network only (safe default)
  // This prevents any stale cache issues during development
});

// ── Background Sync (offline POS transactions) ────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pos-transactions') {
    event.waitUntil(syncOfflineTransactions());
  }
});

async function syncOfflineTransactions() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('pending_sales', 'readonly');
    const store = tx.objectStore('pending_sales');
    const pending = await getAllFromStore(store);

    for (const sale of pending) {
      try {
        const response = await fetch('/api/mobile/pos/sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale),
        });
        if (response.ok) {
          const deleteTx = db.transaction('pending_sales', 'readwrite');
          deleteTx.objectStore('pending_sales').delete(sale.id);
        }
      } catch (err) {
        console.warn('[SW] Failed to sync sale:', sale.id, err);
      }
    }
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('azzay-offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending_sales')) {
        db.createObjectStore('pending_sales', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('products_cache')) {
        db.createObjectStore('products_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('staff_cache')) {
        db.createObjectStore('staff_cache', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

console.log('[SW] Azzay NEXUS v2.1 — safe caching mode');
