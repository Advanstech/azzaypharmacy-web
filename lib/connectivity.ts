/**
 * Azzay Pharmacy NEXUS — Connectivity Engine
 *
 * navigator.onLine only tells you the OS has *some* network — it lies when the
 * LAN is up but the internet/API is down. This probes the actual API endpoint
 * on an adaptive timer and emits transitions, so the UI and sync engine react
 * to REAL reachability.
 *
 * - Polls every 12s when degraded, every 30s when healthy
 * - Browsers 'online'/'offline' events trigger an immediate probe (hint, not truth)
 * - Any code can forceProbe() — e.g. after a fetch failure or before saving a sale
 */

const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

function apiRootUrl(): string | null {
  try {
    const url = new URL(RAW_API);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export type ConnectivityStatus = 'ONLINE' | 'OFFLINE' | 'PROBING';

type Listener = (status: ConnectivityStatus) => void;

let status: ConnectivityStatus = typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'PROBING';
let listeners: Listener[] = [];
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let probeInFlight: Promise<boolean> | null = null;
let lastProbeAt = 0;
let consecutiveFailures = 0;

const POLL_ONLINE_MS = 30_000;
const POLL_OFFLINE_MS = 12_000;
const PROBE_TIMEOUT_MS = 5_000;

function emit(next: ConnectivityStatus) {
  if (next === status) return;
  const prev = status;
  status = next;
  console.log(`[connectivity] ${prev} → ${next}`);
  listeners.forEach(l => {
    try { l(next); } catch (e) { console.error('[connectivity] listener error:', e); }
  });
}

/** Probe the API root. Returns true if reachable. Deduplicates concurrent probes. */
export function forceProbe(): Promise<boolean> {
  if (probeInFlight) return probeInFlight;

  probeInFlight = (async () => {
    const root = apiRootUrl();
    if (!root) return false;
    try {
      const res = await fetch(root, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      // Any HTTP response means the API process is alive (even 404/500)
      lastProbeAt = Date.now();
      consecutiveFailures = 0;
      emit('ONLINE');
      return res.status < 600;
    } catch {
      lastProbeAt = Date.now();
      consecutiveFailures++;
      emit('OFFLINE');
      return false;
    } finally {
      probeInFlight = null;
    }
  })();

  return probeInFlight;
}

export function getConnectivity(): ConnectivityStatus {
  return status;
}

export function isApiReachable(): boolean {
  return status === 'ONLINE';
}

export function onConnectivityChange(listener: Listener): () => void {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}

function scheduleNext() {
  if (pollTimer) clearTimeout(pollTimer);
  const delay = status === 'ONLINE' ? POLL_ONLINE_MS : POLL_OFFLINE_MS;
  pollTimer = setTimeout(async () => {
    await forceProbe();
    scheduleNext();
  }, delay);
}

/**
 * Start the connectivity monitor. Call once at app root.
 * Returns a cleanup function.
 */
export function startConnectivityMonitor(): () => void {
  const handleOnline = () => { forceProbe(); };
  const handleOffline = () => { emit('OFFLINE'); };
  const handleFocus = () => { if (status !== 'ONLINE') forceProbe(); };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('focus', handleFocus);

  forceProbe().finally(scheduleNext);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('focus', handleFocus);
    if (pollTimer) clearTimeout(pollTimer);
  };
}
