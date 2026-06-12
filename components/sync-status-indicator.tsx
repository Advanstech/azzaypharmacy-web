'use client';

import { useRealtimeSyncStatus, useSyncIndicator } from '@/hooks/use-realtime-sync';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncIndicatorProps {
  onSalesUpdate?: () => void;
  className?: string;
  variant?: 'compact' | 'full';
}

/**
 * Real-time sync status indicator with visual feedback
 * Shows connection status and sync progress
 */
export function SyncStatusIndicator({
  onSalesUpdate,
  className = '',
  variant = 'compact',
}: SyncIndicatorProps) {
  const status = useRealtimeSyncStatus(onSalesUpdate);
  const indicator = useSyncIndicator();

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${className}`}
        style={{
          background: indicator.color === 'success'
            ? 'rgba(16,185,129,0.1)'
            : indicator.color === 'warning'
              ? 'rgba(245,158,11,0.1)'
              : 'rgba(59,130,246,0.1)',
          color: indicator.color === 'success'
            ? '#10B981'
            : indicator.color === 'warning'
              ? '#F59E0B'
              : '#3B82F6',
        }}>
        {status.isSyncing && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
            <RefreshCw size={12} />
          </motion.div>
        )}
        {!status.isSyncing && indicator.icon === 'wifi-off' && <WifiOff size={12} />}
        {!status.isSyncing && indicator.icon === 'check-circle' && <CheckCircle size={12} />}
        <span>{indicator.text}</span>
      </motion.div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {status.isSyncing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
              <RefreshCw size={16} />
            </motion.div>
          ) : status.isOnline ? (
            <CheckCircle size={16} style={{ color: '#10B981' }} />
          ) : (
            <AlertCircle size={16} style={{ color: '#F59E0B' }} />
          )}
          <span className="font-medium">{indicator.text}</span>
        </div>
      </div>

      {status.message && (
        <p className="text-xs opacity-70 mb-2">{status.message}</p>
      )}

      {status.pendingCount > 0 && (
        <div className="text-xs space-y-1">
          <div>Pending: {status.pendingCount}</div>
          <div>Synced: {status.syncedCount}</div>
          {status.failedCount > 0 && <div>Failed: {status.failedCount}</div>}
        </div>
      )}

      {status.lastSync && (
        <p className="text-[10px] opacity-50 mt-2">
          Last sync: {status.lastSync.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

/**
 * Minimal sync badge for top navigation
 */
export function SyncBadge() {
  const indicator = useSyncIndicator();

  const iconMap = {
    'sync': <RefreshCw size={14} className="animate-spin" />,
    'wifi-off': <WifiOff size={14} />,
    'check-circle': <CheckCircle size={14} />,
  };

  const colorMap = {
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200' },
    error: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-200' },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200' },
  };

  const colors = colorMap[indicator.color];

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
      {iconMap[indicator.icon as keyof typeof iconMap] || iconMap['check-circle']}
      <span>{indicator.text}</span>
    </div>
  );
}
