'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

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

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
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

  if (!waitingWorker) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-cyan-400/50 bg-slate-950 px-4 py-3 text-white shadow-2xl">
      <div>
        <p className="text-sm font-semibold">NEXUS update available</p>
        <p className="text-xs text-slate-300">Install the latest pharmacy features and fixes.</p>
      </div>
      <button
        type="button"
        onClick={() => waitingWorker.postMessage({ type: 'SKIP_WAITING' })}
        className="shrink-0 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
      >
        Update now
      </button>
    </div>
  );
}
