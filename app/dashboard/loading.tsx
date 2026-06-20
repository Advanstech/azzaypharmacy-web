'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function DashboardLoading() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const skeletonBg = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)';
  const pulseColor = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)';

  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Top Banner Skeleton */}
      <div 
        className="h-12 w-full rounded-xl"
        style={{ background: skeletonBg }}
      >
        <div className="h-full w-full rounded-xl animate-pulse" style={{ background: pulseColor }} />
      </div>

      {/* Title Area Skeleton */}
      <div className="flex justify-between items-center pb-4 pt-4 -mt-6">
        <div>
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-2"></div>
          <div className="h-4 w-64 rounded bg-slate-100 dark:bg-slate-800"></div>
        </div>
        <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-700"></div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="rounded-2xl border p-5 h-32"
            style={{ 
              background: skeletonBg,
              borderColor: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)'
            }}
          >
            <div className="flex gap-2 items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
              <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <div className="w-32 h-6 rounded bg-slate-300 dark:bg-slate-600 mb-2"></div>
            <div className="w-24 h-3 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div 
          className="lg:col-span-2 rounded-2xl border p-6 h-[300px]"
          style={{ 
            background: skeletonBg,
            borderColor: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)'
          }}
        >
          <div className="w-40 h-5 rounded bg-slate-200 dark:bg-slate-700 mb-8"></div>
          <div className="w-full h-full rounded bg-slate-200/50 dark:bg-slate-700/50 flex items-end gap-2 pb-12 px-4">
             {/* Chart bars mock */}
             {[1,2,3,4,5,6,7].map(j => (
                <div key={j} className="flex-1 rounded-t-sm bg-slate-300 dark:bg-slate-600" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
             ))}
          </div>
        </div>

        <div 
          className="rounded-2xl border p-6 h-[300px]"
          style={{ 
            background: skeletonBg,
            borderColor: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)'
          }}
        >
           <div className="w-32 h-5 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>
           <div className="space-y-6 mt-4">
              {[1,2,3,4].map(j => (
                <div key={j} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-3 rounded bg-slate-200 dark:bg-slate-700"></div>
                    <div className="w-2/3 h-2 rounded bg-slate-300 dark:bg-slate-600"></div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
