'use client';

import { useAuth } from '@/lib/auth-context';
import { StoreProvider } from '@/lib/store';
import { useEffect, type ReactNode } from 'react';

export function RootStoreProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const token = session?.access_token ?? null;

  useEffect(() => {
    console.log(`[RootStore] token=${token ? 'YES' : 'MISSING'} loading=${loading}`);
  }, [token, loading]);

  return (
    <StoreProvider token={token}>
      {children}
    </StoreProvider>
  );
}
