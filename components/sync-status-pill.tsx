'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudUpload, RotateCcw } from 'lucide-react';
import { manualSync, onSyncEvent, retryDeadQueue } from '@/lib/tauri-sync';
import { getConnectivity, onConnectivityChange, type ConnectivityStatus } from '@/lib/connectivity';
import { getPendingSales } from '@/lib/offline';
import { getAuthUserId } from '@/lib/gql';
import { canSyncQueuedOperation } from '@/lib/offline-ops';
import { isTauri, nativeListQueue } from '@/lib/tauri-native';

/**
 * Live connectivity + pending-sync indicator.
 * Green = API reachable & queue empty · Amber = offline · Blue = syncing.
 * Shows the pending-sale count when the outbox has items queued.
 */
export function SyncStatusPill({ onSyncClick }: { onSyncClick?: () => void }) {
  const [conn, setConn] = useState<ConnectivityStatus>(() => getConnectivity());
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [dead, setDead] = useState(0);

  const refreshPending = async () => {
    try {
      const authUserId = getAuthUserId();
      if (!authUserId) {
        setPending(0);
        setDead(0);
        return;
      }
      if (isTauri()) {
        const [pendingRows, deadRows] = await Promise.all([
          nativeListQueue('pending'),
          nativeListQueue('dead'),
        ]);
        const belongsToUser = (row: { variables: string }) => {
          try {
            const variables = JSON.parse(row.variables);
            const ownerUserId = variables._syncOwnerId ?? variables.userId;
            return typeof ownerUserId === 'string' && canSyncQueuedOperation(ownerUserId, authUserId);
          } catch {
            return false;
          }
        };
        setPending(pendingRows.filter(belongsToUser).length);
        setDead(deadRows.filter(belongsToUser).length);
      } else {
        const sales = await getPendingSales();
        setPending(sales.filter(sale =>
          canSyncQueuedOperation(
            sale.cashier_id
              || (typeof sale.op?.variables._syncOwnerId === 'string' ? sale.op.variables._syncOwnerId : undefined)
              || (typeof sale.op?.variables.userId === 'string' ? sale.op.variables.userId : undefined),
            authUserId,
          )
        ).length);
        setDead(0);
      }
    } catch {}
  };

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshPending, 0);

    const offConn = onConnectivityChange(s => {
      setConn(s);
      if (s === 'OFFLINE') setSyncing(false);
      refreshPending();
    });

    const offSync = onSyncEvent(e => {
      if (e.status === 'syncing') setSyncing(true);
      if (e.type === 'sync:complete' || e.type === 'sync:error') setSyncing(false);
      refreshPending();
    });

    const t = setInterval(refreshPending, 10_000);
    return () => {
      window.clearTimeout(initialRefresh);
      offConn();
      offSync();
      clearInterval(t);
    };
  }, []);

  const offline = conn === 'OFFLINE';
  const probing = conn === 'PROBING';
  const retryable = dead > 0;

  const label = syncing
    ? pending > 0 ? `Syncing ${pending}…` : 'Syncing…'
    : offline
      ? pending > 0 ? `Offline · ${pending} queued` : 'Offline'
      : retryable
        ? `${pending} queued • ${dead} retryable`
        : pending > 0
          ? `${pending} to sync`
          : probing ? 'Checking…' : 'Online';

  const cls = syncing
    ? 'border-sky-400/50 text-sky-300'
    : offline
      ? 'border-amber-400/50 text-amber-300'
      : retryable
        ? 'border-red-400/50 text-red-300'
        : pending > 0
          ? 'border-orange-400/50 text-orange-300'
          : 'border-emerald-400/40 text-emerald-300';

  const Icon = syncing ? RefreshCw : retryable ? RotateCcw : offline ? WifiOff : pending > 0 ? CloudUpload : Wifi;

  return (
    <button
      onClick={async () => {
        if (retryable && isTauri()) {
          await retryDeadQueue();
          await manualSync().catch(() => {});
          return;
        }
        if (onSyncClick) {
          onSyncClick();
          return;
        }
        await manualSync().catch(() => {});
      }}
      title={
        retryable
          ? 'Retry failed queued items before the next sync pass'
          : offline
            ? 'API unreachable — sales queue locally and sync on reconnect'
            : 'API reachable'
      }
      className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full border transition-colors text-[10px] sm:text-xs font-medium hover:bg-white/10 ${cls}`}
    >
      <Icon size={14} className={syncing ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
