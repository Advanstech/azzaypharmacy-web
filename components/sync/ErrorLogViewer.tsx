'use client';

import { useErrorMonitoring, ErrorSeverity } from '@/lib/error-handler';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';

export default function ErrorLogViewer() {
  const { logs, stats, resolve, clearAll } = useErrorMonitoring();

  const getIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return <AlertCircle className="text-red-600 w-5 h-5" />;
      case ErrorSeverity.ERROR: return <AlertTriangle className="text-orange-500 w-5 h-5" />;
      case ErrorSeverity.WARNING: return <AlertTriangle className="text-yellow-500 w-5 h-5" />;
      case ErrorSeverity.INFO: return <Info className="text-blue-500 w-5 h-5" />;
    }
  };

  if (logs.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-500">
        No recent errors or warnings.
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg flex flex-col max-h-[600px]">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">System Logs</h2>
          <p className="text-sm text-gray-500">Total: {stats.totalErrors} | Unresolved: {stats.unresolvedCount}</p>
        </div>
        <button 
          onClick={clearAll}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
          title="Clear all logs"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto p-2 space-y-2 flex-1">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`p-3 rounded-lg border ${log.resolved ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-red-100 shadow-sm'}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{getIcon(log.severity)}</div>
                <div>
                  <h4 className="font-medium text-gray-900">{log.message}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.timestamp).toLocaleString()} • Category: {log.category.toUpperCase()}
                  </p>
                  {log.recovery && !log.resolved && (
                    <p className="text-sm mt-2 p-2 bg-blue-50 text-blue-800 rounded">
                      <strong>Suggestion:</strong> {log.recovery}
                    </p>
                  )}
                  {log.details && (
                    <pre className="mt-2 p-2 bg-gray-100 text-xs rounded overflow-x-auto max-w-full">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
              {!log.resolved && (
                <button 
                  onClick={() => resolve(log.id)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Mark as resolved"
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
