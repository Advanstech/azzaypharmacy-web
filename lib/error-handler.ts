export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYNC = 'sync',
  NETWORK = 'network',
  CONFLICT = 'conflict',
  STORAGE = 'storage',
  BACKUP = 'backup',
  TAURI = 'tauri',
  UNKNOWN = 'unknown'
}

export interface ErrorLog {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  details?: any;
  stackTrace?: string;
  resolved: boolean;
  recovery?: string;
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedCount: number;
  errorsByCategory: Record<string, number>;
}

class ErrorHandler {
  private logs: ErrorLog[] = [];
  private listeners: ((error: ErrorLog) => void)[] = [];
  private readonly MAX_LOGS = 100;

  logError(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: any,
    stackTrace?: string,
    recovery?: string
  ): ErrorLog {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      message,
      category,
      severity,
      timestamp: Date.now(),
      details,
      stackTrace,
      resolved: false,
      recovery,
    };

    this.logs.unshift(errorLog);
    
    // Circular buffer logic
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    this.emit(errorLog);
    
    // Also log to console for development
    if (severity === ErrorSeverity.CRITICAL) {
      console.error(`[CRITICAL - ${category}] ${message}`, details || '', stackTrace || '');
    } else if (severity === ErrorSeverity.ERROR) {
      console.error(`[ERROR - ${category}] ${message}`, details || '');
    } else if (severity === ErrorSeverity.WARNING) {
      console.warn(`[WARNING - ${category}] ${message}`, details || '');
    } else {
      console.log(`[INFO - ${category}] ${message}`, details || '');
    }

    return errorLog;
  }

  handleSyncError(error: any, context?: any) {
    this.logError(
      error.message || 'Unknown sync error',
      ErrorCategory.SYNC,
      ErrorSeverity.ERROR,
      context,
      error.stack,
      'Check network connection and try manual sync.'
    );
  }

  handleNetworkError(error: any, context?: any) {
    this.logError(
      error.message || 'Network unreachable',
      ErrorCategory.NETWORK,
      ErrorSeverity.WARNING,
      context,
      error.stack,
      'Wait for connection to be restored. Operations will be queued offline.'
    );
  }

  handleStorageError(error: any, storeName?: string) {
    this.logError(
      error.message || 'Storage operation failed',
      ErrorCategory.STORAGE,
      ErrorSeverity.CRITICAL,
      { storeName },
      error.stack,
      'Clear cache or ensure device has sufficient free space.'
    );
  }

  handleConflictError(saleId: string, error: any) {
    this.logError(
      error.message || `Conflict detected for sale ${saleId}`,
      ErrorCategory.CONFLICT,
      ErrorSeverity.WARNING,
      { saleId },
      error.stack,
      'Use the Conflict Resolution panel to resolve manually.'
    );
  }

  handleBackupError(operation: string, error: any) {
    this.logError(
      error.message || `Backup operation '${operation}' failed`,
      ErrorCategory.BACKUP,
      ErrorSeverity.ERROR,
      { operation },
      error.stack,
      'Check folder permissions and disk space.'
    );
  }

  handleTauriError(command: string, error: any) {
    this.logError(
      error.message || `Native command '${command}' failed`,
      ErrorCategory.TAURI,
      ErrorSeverity.ERROR,
      { command },
      error.stack,
      'Ensure the desktop app is up to date.'
    );
  }

  getAllErrors(): ErrorLog[] {
    return [...this.logs];
  }

  getErrorsByCategory(category: ErrorCategory): ErrorLog[] {
    return this.logs.filter(e => e.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): ErrorLog[] {
    return this.logs.filter(e => e.severity === severity);
  }

  getRecentErrors(count: number): ErrorLog[] {
    return this.logs.slice(0, count);
  }

  getCriticalErrors(): ErrorLog[] {
    return this.logs.filter(e => e.severity === ErrorSeverity.CRITICAL && !e.resolved);
  }

  getStats(): ErrorStats {
    const stats: ErrorStats = {
      totalErrors: this.logs.length,
      unresolvedCount: this.logs.filter(e => !e.resolved).length,
      errorsByCategory: {}
    };

    for (const cat of Object.values(ErrorCategory)) {
      stats.errorsByCategory[cat] = this.logs.filter(e => e.category === cat).length;
    }

    return stats;
  }

  resolveError(id: string) {
    const error = this.logs.find(e => e.id === id);
    if (error) {
      error.resolved = true;
    }
  }

  clearAll() {
    this.logs = [];
  }

  clearByCategory(category: ErrorCategory) {
    this.logs = this.logs.filter(e => e.category !== category);
  }

  exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  subscribe(callback: (error: ErrorLog) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(error: ErrorLog) {
    this.listeners.forEach(l => {
      try { l(error); } catch (e) { console.error('Error in listener', e); }
    });
  }
}

export const errorHandler = new ErrorHandler();

// A simple React Hook to consume the error monitor
import { useState, useEffect } from 'react';

export function useErrorMonitoring() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats>(errorHandler.getStats());

  useEffect(() => {
    // Initial sync
    setLogs(errorHandler.getAllErrors());
    setStats(errorHandler.getStats());

    const unsubscribe = errorHandler.subscribe(() => {
      setLogs(errorHandler.getAllErrors());
      setStats(errorHandler.getStats());
    });

    return unsubscribe;
  }, []);

  return {
    logs,
    stats,
    criticalErrors: logs.filter(e => e.severity === ErrorSeverity.CRITICAL && !e.resolved),
    resolve: (id: string) => {
      errorHandler.resolveError(id);
      setLogs(errorHandler.getAllErrors());
      setStats(errorHandler.getStats());
    },
    clearAll: () => {
      errorHandler.clearAll();
      setLogs([]);
      setStats(errorHandler.getStats());
    }
  };
}
