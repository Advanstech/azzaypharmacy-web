/**
 * Azzay Pharmacy NEXUS — Offline Utility
 * Handles IndexedDB persistence for products, staff, and pending sales.
 */

const DB_NAME = 'azzay-offline';
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains('pending_sales')) {
        const store = db.createObjectStore('pending_sales', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
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
    const stores = ['products_cache', 'staff_cache', 'pending_sales'];
    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
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
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  payment_method: string;
  cashier_name: string;
  cashier_id?: string;
  branch_name: string;
  branch_id?: string;
  timestamp: number;
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
