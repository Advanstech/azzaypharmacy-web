'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Don't register SW inside Tauri desktop app
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    if (isTauri) return;

    if (!('serviceWorker' in navigator)) return;

    // First: unregister ALL old service workers to clear stale caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      const oldWorkers = registrations.filter(
        (r) => !r.active?.scriptURL.includes('sw.js')
      );
      oldWorkers.forEach((r) => {
        r.unregister();
        console.log('[NEXUS] Unregistered old SW:', r.scope);
      });
    });

    // Then register the new one
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[NEXUS] SW registered:', reg.scope);

        // When a new SW is waiting, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW ready — skip waiting and reload
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[NEXUS] SW registration failed:', err);
      });

    // When SW controller changes (new SW activated), reload the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  return null;
}
