/**
 * Azzay Pharmacy NEXUS — Offline Utility
 * Handles IndexedDB persistence for products, staff, and pending sales.
 */

const DB_NAME = 'azzay-offline';
const DB_VERSION = 3;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('products_cache')) {
        db.createObjectStore('products_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('staff_cache')) {
        db.createObjectStore('staff_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sales_cache')) {
        db.createObjectStore('sales_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_sales')) {
        const store = db.createObjectStore('pending_sales', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('inventory_deltas')) {
        const store = db.createObjectStore('inventory_deltas', { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      // Generic key-value store for arbitrary/dynamic cache keys (e.g. sales
      // filtered by branch + date range) that don't map to a fixed object store.
      if (!db.objectStoreNames.contains('kv_cache')) {
        db.createObjectStore('kv_cache', { keyPath: 'key' });
      }
    };
  });
}

/** Generic key-value cache for dynamic/composite cache keys (e.g. range-scoped queries). */
export async function saveKV(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('kv_cache', 'readwrite');
    tx.objectStore('kv_cache').put({ key, value });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn(`[offline] Failed to save KV cache for ${key}:`, e);
  }
}

export async function getKV(key: string): Promise<any | undefined> {
  try {
    const db = await openDB();
    const tx = db.transaction('kv_cache', 'readonly');
    const request = tx.objectStore('kv_cache').get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn(`[offline] Failed to read KV cache for ${key}:`, e);
    return undefined;
  }
}

export async function saveToCache(storeName: string, items: any[]) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn(`[offline] Failed to save to ${storeName}:`, e);
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const stores = ['products_cache', 'staff_cache', 'sales_cache', 'pending_sales', 'inventory_deltas', 'kv_cache'];
    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch (e) {
    console.warn('[offline] Failed to clear cache:', e);
  }
}

export async function getFromCache(storeName: string): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn(`[offline] Failed to read from ${storeName}:`, e);
    return [];
  }
}

// Pending sale queue management
export interface PendingSale {
  id: string;
  items: Array<{ name: string; qty: number; price: number; productId?: string }>;
  total: number;
  payment_method: string;
  cashier_name: string;
  cashier_id?: string;
  branch_name: string;
  branch_id?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  cashAmount?: number;
  momoAmount?: number;
  notes?: string;
  timestamp: number;
  /**
   * Generic queued operation. When present, the drain posts this exact
   * mutation+variables instead of mapping the flat sale fields to createSale.
   * Used for held/pending sales and future non-sale offline ops.
   */
  op?: { mutation: string; variables: Record<string, any> };
}

export async function savePendingSale(sale: PendingSale): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    store.put(sale);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log(`[offline] Saved pending sale: ${sale.id}`);
  } catch (e) {
    console.error('[offline] Failed to save pending sale:', e);
    throw e;
  }
}

export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sales', 'readonly');
    const store = tx.objectStore('pending_sales');
    const request = store.getAll();
    const sales = await new Promise<PendingSale[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // Sort by timestamp (oldest first)
    return sales.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error('[offline] Failed to get pending sales:', e);
    return [];
  }
}

export async function deletePendingSale(saleId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    store.delete(saleId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log(`[offline] Deleted pending sale: ${saleId}`);
  } catch (e) {
    console.error('[offline] Failed to delete pending sale:', e);
    throw e;
  }
}

export async function getPendingSalesCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction('pending_sales', 'readonly');
    const store = tx.objectStore('pending_sales');
    const request = store.count();
    return await new Promise<number>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[offline] Failed to count pending sales:', e);
    return 0;
  }
}

// Inventory Deltas

export interface InventoryDelta {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  synced: boolean;
  timestamp: number;
  error?: string;
}

export async function recordInventoryDelta(productId: string, branchId: string, quantity: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('inventory_deltas', 'readwrite');
    const store = tx.objectStore('inventory_deltas');
    
    store.put({
      id: crypto.randomUUID(),
      productId,
      branchId,
      quantity,
      synced: false,
      timestamp: Date.now()
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[offline] Failed to record inventory delta:', e);
  }
}

export async function getPendingInventoryDeltas(): Promise<InventoryDelta[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('inventory_deltas', 'readonly');
    const store = tx.objectStore('inventory_deltas');
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[offline] Failed to get pending inventory deltas:', e);
    return [];
  }
}

export async function markInventoryDeltaSynced(id: string, timestamp: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('inventory_deltas', 'readwrite');
    const store = tx.objectStore('inventory_deltas');
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        store.put({ ...request.result, synced: true, timestamp });
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error(`[offline] Failed to mark delta ${id} synced:`, e);
  }
}

export async function recordInventoryDeltaError(id: string, message: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('inventory_deltas', 'readwrite');
    const store = tx.objectStore('inventory_deltas');
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        store.put({ ...request.result, error: message });
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error(`[offline] Failed to mark delta ${id} error:`, e);
  }
}

export async function getAggregatedInventoryChanges(): Promise<Record<string, Record<string, number>>> {
  const pending = await getPendingInventoryDeltas();
  const aggregated: Record<string, Record<string, number>> = {};
  
  for (const delta of pending) {
    if (!aggregated[delta.productId]) {
      aggregated[delta.productId] = {};
    }
    if (!aggregated[delta.productId][delta.branchId]) {
      aggregated[delta.productId][delta.branchId] = 0;
    }
    aggregated[delta.productId][delta.branchId] += delta.quantity;
  }
  
  return aggregated;
}

export async function clearSyncedInventoryDeltas(olderThan: number): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction('inventory_deltas', 'readwrite');
    const store = tx.objectStore('inventory_deltas');
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(true));

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let count = 0;
        const items = request.result;
        for (const item of items) {
          if (item.timestamp < olderThan) {
            store.delete(item.id);
            count++;
          }
        }
        resolve(count);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[offline] Failed to clear synced deltas:', e);
    return 0;
  }
}

// Backup & Restore Utilities

export async function exportIndexedDB(): Promise<string> {
  const db = await openDB();
  const exportData: Record<string, any[]> = {};
  const stores = ['products_cache', 'staff_cache', 'sales_cache', 'pending_sales', 'inventory_deltas', 'kv_cache'];

  for (const storeName of stores) {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const data = await new Promise<any[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      exportData[storeName] = data;
    } catch (e) {
      console.warn(`[offline] Skip export for store ${storeName}`);
    }
  }

  return JSON.stringify(exportData);
}

export async function importIndexedDB(jsonData: string): Promise<void> {
  try {
    const importData = JSON.parse(jsonData);
    const db = await openDB();

    for (const storeName of Object.keys(importData)) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        // Clear first
        store.clear();
        
        // Insert items
        const items = importData[storeName] || [];
        for (const item of items) {
          store.put(item);
        }

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    }
  } catch (e) {
    console.error('[offline] Failed to import IndexedDB backup:', e);
    throw e;
  }
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function setupOnlineStatusListener(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
