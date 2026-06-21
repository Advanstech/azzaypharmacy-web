'use client';

import { useCustomAuth } from '@/lib/custom-auth';
import { StoreProvider } from '@/lib/store';
import { type ReactNode } from 'react';

export function RootStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useCustomAuth();
  // Derive token reactively from auth state — stays in sync after login/logout/background verify
  const token = session?.access_token ?? null;

  return (
    <StoreProvider token={token}>
      {children}
    </StoreProvider>
  );
}
