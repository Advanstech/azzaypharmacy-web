'use client';

import { useState, useEffect } from 'react';
import { getSyncStatus, onSyncEvent, SyncEvent, manualSync } from '@/lib/tauri-sync';
import { useErrorMonitoring } from '@/lib/error-handler';
import { Cloud, CloudOff, CloudSync, AlertTriangle } from 'lucide-react';

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState(getSyncStatus());
  const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null);
  const { criticalErrors, stats } = useErrorMonitoring();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const unsub = onSyncEvent((event) => {
      setStatus(getSyncStatus());
      setLastEvent(event);
    });
    return unsub;
  }, []);

  const handleSyncClick = () => {
    manualSync();
  };

  const getIcon = () => {
    if (status.isSyncing) return <CloudSync className="w-5 h-5 animate-pulse text-blue-500" />;
    if (!status.isOnline) return <CloudOff className="w-5 h-5 text-red-500" />;
    if (criticalErrors.length > 0) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <Cloud className="w-5 h-5 text-green-500" />;
  };

  const getTooltip = () => {
    if (status.isSyncing) {
      return lastEvent?.message || 'Syncing in progress...';
    }
    if (!status.isOnline) {
      return 'Offline. Sales are queued.';
    }
    if (criticalErrors.length > 0) {
      return `${criticalErrors.length} critical errors. Sync may be impaired.`;
    }
    return `Online & Synced. Unresolved errors: ${stats.unresolvedCount}`;
  };

  return (
    <div 
      className="relative flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSyncClick}
    >
      {getIcon()}
      {isHovered && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white border shadow-lg rounded-md text-sm z-50">
          <p className="font-semibold">{status.isOnline ? 'Online' : 'Offline'}</p>
          <p className="text-gray-600 mt-1">{getTooltip()}</p>
          <div className="mt-2 text-xs text-gray-400">Click to force sync</div>
        </div>
      )}
    </div>
  );
}
