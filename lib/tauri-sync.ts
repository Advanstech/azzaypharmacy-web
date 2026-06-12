/**
 * Azzay Pharmacy NEXUS — Tauri Background Sync Manager
 * Handles offline sync, connection detection, and real-time events
 * Zero impact on existing code - purely additive
 */

import { getPendingSales, deletePendingSale, isOnline } from './offline';
import { gql } from './gql';

export interface SyncEvent {
  type: 'sync:start' | 'sync:progress' | 'sync:complete' | 'sync:error' | 'connection:changed';
  status: 'online' | 'offline' | 'syncing';
  pendingCount?: number;
  syncedCount?: number;
  failedCount?: number;
  message?: string;
  timestamp: number;
}

// Global sync state
let isSyncing = false;
let syncListeners: ((event: SyncEvent) => void)[] = [];

/**
 * Initialize Tauri background sync
 * Call once on app startup from layout.tsx or root provider
 */
export async function initTauriSync() {
  console.log('[tauri-sync] Initializing background sync');
  
  // Detect connection changes
  setupConnectionDetection();
  
  // Initial sync check
  if (isOnline()) {
    await syncPendingSales();
  }
}

/**
 * Setup connection detection and auto-sync on reconnect
 */
function setupConnectionDetection() {
  const handleOnline = async () => {
    console.log('[tauri-sync] Back online! Starting sync...');
    emitSyncEvent({
      type: 'connection:changed',
      status: 'online',
      timestamp: Date.now(),
    });
    
    // Small delay to ensure network is stable
    setTimeout(() => syncPendingSales(), 500);
  };

  const handleOffline = () => {
    console.log('[tauri-sync] Gone offline');
    emitSyncEvent({
      type: 'connection:changed',
      status: 'offline',
      timestamp: Date.now(),
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Cleanup on next sync init (optional)
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Main sync function - syncs all pending sales from IndexedDB
 */
export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  if (isSyncing || !isOnline()) {
    console.log('[tauri-sync] Skipping sync: already syncing or offline');
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const pendingSales = await getPendingSales();
    const totalPending = pendingSales.length;

    if (totalPending === 0) {
      console.log('[tauri-sync] No pending sales to sync');
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    emitSyncEvent({
      type: 'sync:start',
      status: 'syncing',
      pendingCount: totalPending,
      timestamp: Date.now(),
      message: `Starting sync of ${totalPending} pending sale(s)`,
    });

    // Sync each pending sale
    for (let i = 0; i < pendingSales.length; i++) {
      const sale = pendingSales[i];
      
      try {
        // Reconstruct the createSale mutation variables from cached data
        const result = await gql<any>(`
          mutation SyncSale($userId: ID!, $branchId: ID!, $items: [SaleItemInput!]!, $paymentMethod: PaymentMethod!, $amountPaid: Float!) {
            createSale(userId: $userId, branchId: $branchId, items: $items, paymentMethod: $paymentMethod, amountPaid: $amountPaid) {
              id receiptNo totalAmount
            }
          }
        `, {
          userId: (sale as any).cashier_id || 'unknown',
          branchId: (sale as any).branch_id || 'unknown',
          items: sale.items.map(item => ({ productId: item.name, quantity: item.qty })),
          paymentMethod: sale.payment_method,
          amountPaid: sale.total,
        });

        if (result) {
          // Delete from pending queue on success
          await deletePendingSale(sale.id);
          syncedCount++;
          console.log(`[tauri-sync] ✅ Synced sale ${i + 1}/${totalPending}: ${sale.id}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`[tauri-sync] ❌ Failed to sync sale ${sale.id}:`, err);
      }

      // Emit progress event
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

    // Emit completion event
    emitSyncEvent({
      type: 'sync:complete',
      status: 'online',
      syncedCount,
      failedCount,
      timestamp: Date.now(),
      message: failedCount === 0 
        ? `✅ Successfully synced ${syncedCount} sale(s)!`
        : `⚠️ Synced ${syncedCount} sale(s), ${failedCount} failed`,
    });

    console.log(`[tauri-sync] Sync complete: ${syncedCount} synced, ${failedCount} failed`);
  } catch (err) {
    console.error('[tauri-sync] Sync error:', err);
    emitSyncEvent({
      type: 'sync:error',
      status: 'offline',
      timestamp: Date.now(),
      message: `Sync error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    failedCount++;
  } finally {
    isSyncing = false;
  }

  return { synced: syncedCount, failed: failedCount };
}

/**
 * Listen to sync events
 * Used by UI components to show sync progress/status
 */
export function onSyncEvent(callback: (event: SyncEvent) => void): () => void {
  syncListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
}

/**
 * Emit sync event to all listeners
 */
function emitSyncEvent(event: SyncEvent) {
  syncListeners.forEach(listener => {
    try {
      listener(event);
    } catch (err) {
      console.error('[tauri-sync] Listener error:', err);
    }
  });
}

/**
 * Get current sync status
 */
export function getSyncStatus(): { isSyncing: boolean; isOnline: boolean } {
  return {
    isSyncing,
    isOnline: isOnline(),
  };
}

/**
 * Manually trigger sync (useful for button clicks)
 */
export async function manualSync() {
  if (!isOnline()) {
    console.warn('[tauri-sync] Cannot sync while offline');
    return { synced: 0, failed: 0 };
  }
  return syncPendingSales();
}
