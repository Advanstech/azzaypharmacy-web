/**
 * Azzay Pharmacy NEXUS — Tauri Native Bridge
 *
 * Thin wrappers around the Rust commands (SQLite outbox, native sync daemon,
 * ESC/POS printing, connectivity probe). Every function no-ops or falls back
 * gracefully when running in a plain browser.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// ── Outbox (SQLite pending-sales queue owned by the Rust daemon) ─────────────

export interface OutboxRow {
  id: string;
  variables: string;
  status: string;
  attempts: number;
  last_error?: string;
  created_at: number;
}

export interface QueueStats {
  pending: number;
  dead: number;
  oldest_pending?: number;
}

export async function nativeEnqueueSale(id: string, variables: unknown, mutation?: string): Promise<void> {
  await tauriInvoke('outbox_enqueue', { id, variables: JSON.stringify(variables), mutation: mutation ?? null });
}

export async function nativeQueueStats(): Promise<QueueStats> {
  return tauriInvoke<QueueStats>('outbox_stats');
}

export async function nativeListQueue(status?: 'pending' | 'dead'): Promise<OutboxRow[]> {
  return tauriInvoke<OutboxRow[]>('outbox_list', { status });
}

export async function nativeRemoveFromQueue(id: string): Promise<void> {
  await tauriInvoke('outbox_remove', { id });
}

export async function nativeRetryQueuedSale(id: string): Promise<void> {
  await tauriInvoke('outbox_retry', { id });
}

/** Feed the daemon the API URL + JWT so it can push sales natively. */
export async function nativeSetSyncAuth(apiUrl: string | null, token: string | null): Promise<void> {
  await tauriInvoke('set_sync_auth', { apiUrl: apiUrl ?? null, token: token ?? null });
}

/** Kick the daemon's drain loop immediately (manual "sync now"). */
export async function nativeSyncNow(): Promise<void> {
  await tauriInvoke('sync_now');
}

// ── Connectivity probe (native TCP+HTTP — truthful even when webview lies) ───

export async function nativeProbeApi(apiUrl: string): Promise<boolean> {
  const res = await tauriInvoke<{ online: boolean }>('probe_api', { apiUrl });
  return res.online;
}

// ── Printing ─────────────────────────────────────────────────────────────────

export interface PrinterInfo {
  name: string;
  is_default: boolean;
}

export interface ReceiptPayload {
  shop_name?: string;
  branch_name?: string;
  address?: string;
  phone?: string;
  receipt_no: string;
  cashier?: string;
  customer?: string;
  date?: string;
  items: { name: string; qty: number; price: number; total: number }[];
  total: number;
  amount_paid?: number;
  change?: number;
  discount?: number;
  payment_method?: string;
  footer?: string;
  paper_width?: 58 | 80;
}

export async function nativeListPrinters(): Promise<PrinterInfo[]> {
  return tauriInvoke<PrinterInfo[]>('list_printers');
}

/** Silent thermal print via OS spooler (RAW). Pass printerName or omit for default. */
export async function nativePrintReceipt(
  receipt: ReceiptPayload,
  printerName?: string,
  openDrawer?: boolean,
): Promise<void> {
  await tauriInvoke('print_receipt', {
    receipt,
    printerName: printerName ?? null,
    openDrawer: openDrawer ?? null,
  });
}

/** Silent thermal print straight to a network printer (IP:9100, no driver). */
export async function nativePrintReceiptTcp(
  receipt: ReceiptPayload,
  host: string,
  port = 9100,
  openDrawer?: boolean,
): Promise<void> {
  await tauriInvoke('print_receipt_tcp', {
    receipt,
    host,
    port,
    openDrawer: openDrawer ?? null,
  });
}

export async function nativeOpenDrawer(opts?: { printerName?: string; host?: string; port?: number }): Promise<void> {
  await tauriInvoke('open_drawer', {
    printerName: opts?.printerName ?? null,
    host: opts?.host ?? null,
    port: opts?.port ?? null,
  });
}

// ── Inventory Deltas ─────────────────────────────────────────────────────────

export interface NativeInventoryDelta {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  created_at: number;
}

export async function nativeRecordInventoryDelta(productId: string, branchId: string, quantity: number): Promise<void> {
  await tauriInvoke('record_inventory_delta', { productId, branchId, quantity });
}

export async function nativeGetPendingDeltas(): Promise<NativeInventoryDelta[]> {
  return tauriInvoke<NativeInventoryDelta[]>('get_pending_deltas');
}

export async function nativeClearInventoryDeltas(ids: string[]): Promise<void> {
  await tauriInvoke('clear_inventory_deltas', { ids });
}

// ── Staff Profiles (durable SQLite cache) ────────────────────────────────────

export interface NativeStaffProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  position?: string;
  branch_id?: string;
  branch_name?: string;
  branch_phone?: string;
  synced_at: number;
}

export interface NativeStaffProfileInput {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  position?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  branch_phone?: string | null;
}

/**
 * Save the staff directory to SQLite (called after every successful API fetch).
 * Survives OS updates, app reinstalls, and the signOut() IndexedDB wipe.
 */
export async function nativeSaveStaffProfiles(profiles: NativeStaffProfileInput[]): Promise<void> {
  await tauriInvoke('save_staff_profiles', { profiles });
}

/**
 * Return the locally cached staff directory.
 * Returns an empty array on first boot before the first online sync.
 */
export async function nativeGetStaffProfiles(): Promise<NativeStaffProfile[]> {
  return tauriInvoke<NativeStaffProfile[]>('get_staff_profiles');
}

// ── Backup ───────────────────────────────────────────────────────────────────

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  created_at: number;
}

export async function nativeCreateBackup(data: string): Promise<string> {
  return tauriInvoke<string>('create_backup', { data });
}

export async function nativeListBackups(): Promise<BackupInfo[]> {
  return tauriInvoke<BackupInfo[]>('list_backups');
}

export async function nativeRestoreBackup(path: string): Promise<string> {
  return tauriInvoke<string>('restore_backup', { path });
}

export async function nativeDeleteBackup(path: string): Promise<void> {
  await tauriInvoke('delete_backup', { path });
}

// ── Native events ────────────────────────────────────────────────────────────

export interface NativeSyncStatus {
  state: 'online' | 'offline' | 'syncing';
  pending: number;
  synced: number;
  failed: number;
  last_error?: string;
  last_sync?: number;
}

export interface NativeConnectivity {
  online: boolean;
  ts: number;
}

export async function onNativeSyncStatus(cb: (s: NativeSyncStatus) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<NativeSyncStatus>('nexus://sync-status', e => cb(e.payload));
}

export async function onNativeConnectivity(cb: (c: NativeConnectivity) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<NativeConnectivity>('nexus://connectivity', e => cb(e.payload));
}
