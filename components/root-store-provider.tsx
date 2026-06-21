'use client';

import { useCustomAuth } from '@/lib/custom-auth';
import { StoreProvider } from '@/lib/store';
import { useEffect, type ReactNode } from 'react';

export function RootStoreProvider({ children }: { children: ReactNode }) {
  const { loading } = useCustomAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  useEffect(() => {
    console.log(`[RootStore] token=${token ? 'YES' : 'MISSING'} loading=${loading}`);
  }, [token, loading]);

  return (
    <StoreProvider token={token}>
      {children}
    </StoreProvider>
  );
}
