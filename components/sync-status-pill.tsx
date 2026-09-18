'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { onSyncEvent } from '@/lib/tauri-sync';
import { getConnectivity, onConnectivityChange, type ConnectivityStatus } from '@/lib/connectivity';
import { getPendingSalesCount } from '@/lib/offline';
import { isTauri, nativeQueueStats } from '@/lib/tauri-native';

/**
 * Live connectivity + pending-sync indicator.
 * Green = API reachable & queue empty · Amber = offline · Blue = syncing.
 * Shows the pending-sale count when the outbox has items queued.
 */
export function SyncStatusPill({ onSyncClick }: { onSyncClick?: () => void }) {
  const [conn, setConn] = useState<ConnectivityStatus>('PROBING');
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshPending = async () => {
    try {
      if (isTauri()) {
        const s = await nativeQueueStats();
        setPending(s.pending);
      } else {
        setPending(await getPendingSalesCount());
      }
    } catch {}
  };

  useEffect(() => {
    setConn(getConnectivity());
    refreshPending();

    const offConn = onConnectivityChange(s => {
      setConn(s);
      if (s === 'OFFLINE') setSyncing(false);
      refreshPending();
    });

    const offSync = onSyncEvent(e => {
      if (e.status === 'syncing') setSyncing(true);
      if (e.type === 'sync:complete' || e.type === 'sync:error') setSyncing(false);
      if (e.pendingCount !== undefined) setPending(e.pendingCount);
      else refreshPending();
    });

    const t = setInterval(refreshPending, 10_000);
    return () => { offConn(); offSync(); clearInterval(t); };
  }, []);

  const offline = conn === 'OFFLINE';
  const probing = conn === 'PROBING';

  const label = syncing
    ? pending > 0 ? `Syncing ${pending}…` : 'Syncing…'
    : offline
      ? pending > 0 ? `Offline · ${pending} queued` : 'Offline'
      : pending > 0
        ? `${pending} to sync`
        : probing ? 'Checking…' : 'Online';

  const cls = syncing
    ? 'border-sky-400/50 text-sky-300'
    : offline
      ? 'border-amber-400/50 text-amber-300'
      : pending > 0
        ? 'border-orange-400/50 text-orange-300'
        : 'border-emerald-400/40 text-emerald-300';

  const Icon = syncing ? RefreshCw : offline ? WifiOff : pending > 0 ? CloudUpload : Wifi;

  return (
    <button
      onClick={onSyncClick}
      title={offline ? 'API unreachable — sales queue locally and sync on reconnect' : 'API reachable'}
      className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full border transition-colors text-[10px] sm:text-xs font-medium hover:bg-white/10 ${cls}`}
    >
      <Icon size={14} className={syncing ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
