'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry or Crashlytics
    console.error('Dashboard Error Boundary caught:', error);
  }, [error]);

  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-6">
      <div 
        className="w-20 h-20 rounded-2xl flex items-center justify-center animate-bounce-slow"
        style={{ 
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`
        }}
      >
        <AlertTriangle size={32} style={{ color: '#EF4444' }} />
      </div>
      
      <div className="max-w-md">
        <h2 
          className="font-display text-2xl font-bold mb-2"
          style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
        >
          Something went wrong
        </h2>
        <p 
          className="text-sm mb-6"
          style={{ color: isDark ? '#94A3B8' : '#64748B' }}
        >
          We encountered an unexpected error while loading this dashboard component. The issue has been logged.
        </p>
        
        <div 
          className="p-3 rounded-lg text-xs font-mono text-left mb-6 overflow-hidden break-all"
          style={{ 
            background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)',
            color: isDark ? '#EF4444' : '#DC2626'
          }}
        >
          {error.message || 'Unknown render error occurred'}
        </div>

        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm mx-auto transition-all hover:scale-105 active:scale-95"
          style={{
            background: isDark ? 'rgba(0, 217, 255, 0.15)' : 'rgba(14, 165, 233, 0.1)',
            color: isDark ? '#00D9FF' : '#0EA5E9',
            border: `1px solid ${isDark ? 'rgba(0, 217, 255, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`,
          }}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}
