'use client';

import { useEffect, useRef } from 'react';

export function useAutoExport(ready: boolean, exportData: () => void) {
  const exportDataRef = useRef(exportData);
  const completedRequestRef = useRef<string | null>(null);

  useEffect(() => {
    exportDataRef.current = exportData;
  }, [exportData]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get('export') !== '1') {
        completedRequestRef.current = null;
        return;
      }

      const requestKey = `${url.pathname}${url.searchParams.toString()}`;
      if (completedRequestRef.current === requestKey) return;

      completedRequestRef.current = requestKey;
      url.searchParams.delete('export');
      window.history.replaceState(window.history.state, '', url);
      exportDataRef.current();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [ready]);
}
