'use client';

import { useEffect } from 'react';
import { checkForAppUpdate } from '@/lib/updater';

export function UpdateChecker() {
  useEffect(() => {
    // Small delay so the check doesn't compete with initial data loads
    const t = setTimeout(() => { void checkForAppUpdate(); }, 5000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
