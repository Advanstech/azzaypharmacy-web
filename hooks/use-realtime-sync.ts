/**
 * Azzay Pharmacy NEXUS — Real-time Sales Hook
 * Live updates for manager dashboards using Tauri events
 * Polled mode when Tauri unavailable, event-based when available
 */

import { useEffect, useState, useCallback } from 'react';
import { onSyncEvent, getSyncStatus, type SyncEvent } from '@/lib/tauri-sync';

export interface RealtimeSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  message?: string;
  connectionStatus: 'online' | 'offline' | 'syncing';
}

/**
 * Hook to track real-time sync status
 * Automatically updates when sync events occur
 * Re-triggers refetch callbacks to update UI
 */
export function useRealtimeSyncStatus(
  onSalesUpdate?: () => void,
): RealtimeSyncStatus {
  const [status, setStatus] = useState<RealtimeSyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    connectionStatus: navigator.onLine ? 'online' : 'offline',
  });

  useEffect(() => {
    // Subscribe to sync events
    const unsubscribe = onSyncEvent((event: SyncEvent) => {
      setStatus(prev => ({
        ...prev,
        isOnline: event.status === 'online' || event.status === 'syncing',
        isSyncing: event.status === 'syncing',
        connectionStatus: event.status,
        pendingCount: event.pendingCount ?? prev.pendingCount,
        syncedCount: event.syncedCount ?? prev.syncedCount,
        failedCount: event.failedCount ?? prev.failedCount,
        message: event.message,
        lastSync: event.type === 'sync:complete' ? new Date() : prev.lastSync,
      }));

      // Trigger sales refetch on successful sync
      if (event.type === 'sync:complete' && event.syncedCount && event.syncedCount > 0 && onSalesUpdate) {
        console.log('[realtime] Synced sales detected, refetching...');
        setTimeout(() => onSalesUpdate(), 500);
      }
    });

    return () => unsubscribe();
  }, [onSalesUpdate]);

  return status;
}

/**
 * Hook for sync status indicator with visual feedback
 */
export function useSyncIndicator() {
  const { isOnline, isSyncing, message } = useRealtimeSyncStatus();

  const getIndicatorColor = useCallback((): 'success' | 'warning' | 'error' | 'info' => {
    if (isSyncing) return 'info';
    if (!isOnline) return 'warning';
    return 'success';
  }, [isOnline, isSyncing]);

  const getIndicatorText = useCallback((): string => {
    if (isSyncing) return message || 'Syncing...';
    if (!isOnline) return 'Offline Mode';
    return 'All synced';
  }, [isOnline, isSyncing, message]);

  const getIndicatorIcon = useCallback((): string => {
    if (isSyncing) return 'sync'; // spinner
    if (!isOnline) return 'wifi-off';
    return 'check-circle';
  }, [isOnline, isSyncing]);

  return {
    color: getIndicatorColor(),
    text: getIndicatorText(),
    icon: getIndicatorIcon(),
    isOnline,
    isSyncing,
  };
}

/**
 * Hook for poll-based sync (fallback when Tauri events unavailable)
 * Checks sync status at intervals and triggers refetch
 */
export function usePollSyncStatus(
  refetchCallback?: () => Promise<void>,
  pollInterval: number = 5000, // 5 seconds
) {
  const [lastPollTime, setLastPollTime] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      const status = getSyncStatus();
      
      // If just synced, trigger refetch
      if (status.isOnline && lastPollTime === 0) {
        console.log('[poll-sync] Online, triggering refetch');
        await refetchCallback?.();
      }

      setLastPollTime(Date.now());
    }, pollInterval);

    return () => clearInterval(interval);
  }, [refetchCallback, pollInterval, lastPollTime]);
}
