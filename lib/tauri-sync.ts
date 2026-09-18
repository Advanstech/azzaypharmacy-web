/**
 * Azzay Pharmacy NEXUS — Sync Engine
 *
 * Flushes the offline pending-sales queue to the API whenever connectivity
 * allows. Driven by the real connectivity probe (lib/connectivity.ts), not
 * navigator.onLine.
 *
 * Triggers:
 *  - startup (after auth is ready)
 *  - OFFLINE → ONLINE transition
 *  - periodic flush while online (every 60s if queue non-empty)
 *  - manualSync() from the UI
 *
 * Every sale carries a stable clientRef so the server dedupes retries —
 * a response lost mid-request can never create a duplicate sale.
 */

import { 
  getPendingSales, 
  deletePendingSale, 
  savePendingSale, 
  getPendingInventoryDeltas,
  markInventoryDeltaSynced,
  recordInventoryDeltaError,
  type PendingSale 
} from './offline';
import { errorHandler, ErrorCategory, ErrorSeverity } from './error-handler';
import { gql } from './gql';
import {
  startConnectivityMonitor,
  onConnectivityChange,
  isApiReachable,
  forceProbe,
} from './connectivity';
import {
  isTauri,
  nativeSyncNow,
  nativeProbeApi,
  onNativeSyncStatus,
  onNativeConnectivity,
} from './tauri-native';

export interface SyncEvent {
  type: 'sync:start' | 'sync:progress' | 'sync:complete' | 'sync:error' | 'connection:changed';
  status: 'online' | 'offline' | 'syncing';
  pendingCount?: number;
  syncedCount?: number;
  failedCount?: number;
  message?: string;
  timestamp: number;
}

let isSyncing = false;
let syncListeners: ((event: SyncEvent) => void)[] = [];
let monitorStop: (() => void) | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

const FLUSH_INTERVAL_MS = 60_000;
const MAX_RETRIES = 10;

const M_SYNC_SALE = `
  mutation SyncSale(
    $userId: String!
    $branchId: String!
    $items: [SaleItemInput!]!
    $paymentMethod: PaymentMethod!
    $amountPaid: Float!
    $customerId: String
    $customerName: String
    $customerPhone: String
    $customerEmail: String
    $cashAmount: Float
    $momoAmount: Float
    $clientRef: String
  ) {
    createSale(
      userId: $userId
      branchId: $branchId
      items: $items
      paymentMethod: $paymentMethod
      amountPaid: $amountPaid
      customerId: $customerId
      customerName: $customerName
      customerPhone: $customerPhone
      customerEmail: $customerEmail
      cashAmount: $cashAmount
      momoAmount: $momoAmount
      clientRef: $clientRef
    ) {
      id receiptNo totalAmount
    }
  }
`;

const M_SYNC_DELTAS = `
  mutation SyncInventoryDeltas($branchId: String!, $deltas: [InventoryDeltaInput!]!) {
    syncInventoryDeltas(branchId: $branchId, deltas: $deltas)
  }
`;

/**
 * Initialize the sync engine — call once from the store provider.
 * Safe to call multiple times.
 */
export async function initTauriSync() {
  if (started) return;
  started = true;
  console.log('[sync] Initializing sync engine');

  monitorStop = startConnectivityMonitor();

  // Flush whenever connectivity is (re)gained
  onConnectivityChange(status => {
    emitSyncEvent({
      type: 'connection:changed',
      status: status === 'ONLINE' ? 'online' : 'offline',
      timestamp: Date.now(),
    });
    if (status === 'ONLINE') {
      // Small settle delay — the API may just have restarted
      setTimeout(() => syncPendingSales(), 800);
    }
  });

  if (isTauri()) {
    // Native daemon owns the queue + drain loop. Bridge its status events into
    // the same SyncEvent shape the UI already listens to.
    onNativeSyncStatus(s => {
      emitSyncEvent({
        type: s.state === 'syncing' ? 'sync:progress' : 'sync:complete',
        status: s.state === 'syncing' ? 'syncing' : s.state === 'online' ? 'online' : 'offline',
        pendingCount: s.pending >= 0 ? s.pending : undefined,
        syncedCount: s.synced || undefined,
        failedCount: s.failed || undefined,
        message: s.last_error || undefined,
        timestamp: Date.now(),
      });
    }).catch(e => console.warn('[sync] native status listener failed:', e));

    onNativeConnectivity(c => {
      emitSyncEvent({
        type: 'connection:changed',
        status: c.online ? 'online' : 'offline',
        timestamp: Date.now(),
      });
    }).catch(e => console.warn('[sync] native connectivity listener failed:', e));

    // The daemon drains on its own schedule — just kick it once at startup.
    setTimeout(() => nativeSyncNow().catch(() => {}), 2000);
    return;
  }

  // Browser path — JS owns the drain loop.
  flushTimer = setInterval(() => {
    if (isApiReachable()) syncPendingSales();
  }, FLUSH_INTERVAL_MS);

  // Startup flush — probe first; sync runs once the probe confirms reachability
  const reachable = await forceProbe();
  if (reachable) syncPendingSales();
}

/** Push all queued sales to the server, oldest first. */
export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  if (isTauri()) {
    // Rust daemon owns the drain — kick it; progress arrives via nexus://sync-status
    nativeSyncNow().catch(e => console.warn('[sync] native drain kick failed:', e));
    return { synced: 0, failed: 0 };
  }
  if (isSyncing) return { synced: 0, failed: 0 };
  if (!isApiReachable()) {
    // Kick a probe — if it succeeds, connectivity handler will call us back
    forceProbe();
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const pendingSales = await getPendingSales();
    const totalPending = pendingSales.length;

    if (totalPending === 0) return { synced: 0, failed: 0 };

    emitSyncEvent({
      type: 'sync:start',
      status: 'syncing',
      pendingCount: totalPending,
      timestamp: Date.now(),
      message: `Syncing ${totalPending} pending sale${totalPending !== 1 ? 's' : ''}…`,
    });

    for (const sale of pendingSales) {
      // Re-check reachability mid-loop — bail early if we went offline
      if (!isApiReachable()) break;

      try {
        // Generic queued ops (held sales, future non-sale writes) carry their
        // own mutation+variables; regular sales map flat fields → createSale.
        if (sale.op) {
          const result = await gql<any>(sale.op.mutation, sale.op.variables);
          if (result && Object.keys(result).length > 0) {
            await deletePendingSale(sale.id);
            syncedCount++;
            console.log(`[sync] ✅ Synced queued op ${sale.id}`);
          } else {
            throw new Error('Empty mutation response');
          }
        } else {
          const result = await gql<any>(M_SYNC_SALE, {
            userId: sale.cashier_id || 'unknown',
            branchId: sale.branch_id || 'unknown',
            items: sale.items.map(item => ({
              productId: item.productId,
              quantity: item.qty,
            })),
            paymentMethod: sale.payment_method.toUpperCase(),
            amountPaid: sale.total,
            customerId: sale.customerId || undefined,
            customerName: sale.customerName || undefined,
            customerPhone: sale.customerPhone || undefined,
            customerEmail: sale.customerEmail || undefined,
            cashAmount: sale.cashAmount || undefined,
            momoAmount: sale.momoAmount || undefined,
            clientRef: sale.id, // stable idempotency key — retries dedupe server-side
          });

          if (result?.createSale) {
            await deletePendingSale(sale.id);
            syncedCount++;
            console.log(`[sync] ✅ Synced sale ${sale.id} → ${result.createSale.receiptNo}`);
          }
        }
      } catch (err: any) {
        const errorMsg: string = err?.message || 'Unknown error';
        const isNetwork = /networkerror|fetch|timeout|unreachable|premature|abort/i.test(errorMsg);

        if (isNetwork) {
          // Connectivity dropped mid-sync — stop, will resume on next ONLINE transition
          console.warn(`[sync] Network error mid-sync, pausing: ${errorMsg}`);
          forceProbe();
          break;
        }

        failedCount++;
        const retryCount = ((sale as any)._retryCount || 0) + 1;
        console.error(`[sync] ❌ Sale ${sale.id} failed (${retryCount}/${MAX_RETRIES}):`, errorMsg);
        
        const isConflict = /conflict|out of sync/i.test(errorMsg);
        if (isConflict) {
          errorHandler.handleConflictError(sale.id, err);
        }

        const isPermanent = /not found|invalid|validation|unauthorized|forbidden|duplicate/i.test(errorMsg) && !isConflict;
        if (retryCount >= MAX_RETRIES && isPermanent) {
          console.warn(`[sync] ⚠️ Retiring sale ${sale.id} after ${retryCount} permanent failures`);
          await deletePendingSale(sale.id);
        } else {
          await savePendingSale({
            ...sale,
            _retryCount: retryCount,
            _lastError: errorMsg,
            _lastRetry: Date.now(),
          } as any);
        }
      }

      emitSyncEvent({
        type: 'sync:progress',
        status: 'syncing',
        syncedCount,
        failedCount,
        pendingCount: totalPending - syncedCount - failedCount,
        timestamp: Date.now(),
        message: `Synced ${syncedCount}/${totalPending}`,
      });
    }

    emitSyncEvent({
      type: 'sync:complete',
      status: isApiReachable() ? 'online' : 'offline',
      syncedCount,
      failedCount,
      timestamp: Date.now(),
      message: failedCount === 0
        ? `Synced ${syncedCount} sale${syncedCount !== 1 ? 's' : ''}`
        : `Synced ${syncedCount}, ${failedCount} failed`,
    });
  } finally {
    isSyncing = false;
  }

  // Also sync inventory deltas
  if (isApiReachable()) {
    await syncInventoryDeltasFn();
  }

  return { synced: syncedCount, failed: failedCount };
}

async function syncInventoryDeltasFn() {
  try {
    const pendingDeltas = await getPendingInventoryDeltas();
    if (pendingDeltas.length === 0) return;

    // Group by branchId
    const deltasByBranch: Record<string, any[]> = {};
    for (const delta of pendingDeltas) {
      if (!deltasByBranch[delta.branchId]) deltasByBranch[delta.branchId] = [];
      deltasByBranch[delta.branchId].push(delta);
    }

    for (const branchId of Object.keys(deltasByBranch)) {
      const deltas = deltasByBranch[branchId];
      try {
        await gql(M_SYNC_DELTAS, {
          branchId,
          deltas: deltas.map(d => ({ productId: d.productId, quantity: d.quantity }))
        });
        
        // Mark all as synced
        const now = Date.now();
        for (const delta of deltas) {
          await markInventoryDeltaSynced(delta.id, now);
        }
      } catch (err: any) {
        console.error(`[sync] Failed to sync inventory deltas for branch ${branchId}:`, err);
        errorHandler.logError(
          'Failed to sync inventory deltas',
          ErrorCategory.SYNC,
          ErrorSeverity.WARNING,
          { branchId },
          err.stack
        );
        for (const delta of deltas) {
          await recordInventoryDeltaError(delta.id, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[sync] Error in syncInventoryDeltasFn:', err);
  }
}

export function onSyncEvent(callback: (event: SyncEvent) => void): () => void {
  syncListeners.push(callback);
  return () => { syncListeners = syncListeners.filter(l => l !== callback); };
}

function emitSyncEvent(event: SyncEvent) {
  syncListeners.forEach(listener => {
    try { listener(event); } catch (err) { console.error('[sync] listener error:', err); }
  });
}

export function getSyncStatus(): { isSyncing: boolean; isOnline: boolean } {
  return { isSyncing, isOnline: isApiReachable() };
}

/**
 * Queue a non-sale GraphQL write for offline sync.
 * Tauri → native SQLite outbox; browser → IndexedDB pending_sales with `op`.
 * `flat` supplies display fields so the queued item reads sensibly in the
 * pending-sales UI. The op drains via the same engine as offline sales.
 */
export async function enqueueOfflineOp(args: {
  clientRef: string;
  mutation: string;
  variables: Record<string, any>;
  flat?: Partial<PendingSale>;
}): Promise<void> {
  if (isTauri()) {
    const { nativeEnqueueSale } = await import('./tauri-native');
    await nativeEnqueueSale(args.clientRef, args.variables, args.mutation);
    return;
  }
  await savePendingSale({
    id: args.clientRef,
    items: args.flat?.items ?? [],
    total: args.flat?.total ?? 0,
    payment_method: args.flat?.payment_method ?? 'N/A',
    cashier_name: args.flat?.cashier_name ?? 'Unknown',
    cashier_id: args.flat?.cashier_id,
    branch_name: args.flat?.branch_name ?? 'Unknown',
    branch_id: args.flat?.branch_id,
    customerName: args.flat?.customerName,
    timestamp: Date.now(),
    op: { mutation: args.mutation, variables: args.variables },
  });
}

/** True when the failure looks like connectivity, not a server rejection. */
export function isNetworkishError(err: any): boolean {
  const m = (err?.message || String(err) || '').toLowerCase();
  return /networkerror|fetch|timeout|unreachable|premature|abort|econnrefused|failed to fetch|signal timed out/.test(m);
}

export async function manualSync() {
  if (isTauri()) {
    const reachable = await nativeProbeApi(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
    ).catch(() => false);
    if (reachable) await nativeSyncNow().catch(() => {});
    return { synced: 0, failed: 0 };
  }
  const reachable = await forceProbe();
  if (!reachable) return { synced: 0, failed: 0 };
  return syncPendingSales();
}
