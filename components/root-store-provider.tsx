'use client';

import { useCustomAuth } from '@/lib/custom-auth';
import { StoreProvider, useStore } from '@/lib/store';
import { BranchProvider } from '@/lib/branch-context';
import { type ReactNode } from 'react';

function AppBranchProvider({ children }: { children: ReactNode }) {
  const { me } = useStore();

  if (!me) return <>{children}</>;

  return (
    <BranchProvider
      role={me.role}
      assignedBranchId={me.branchId}
      assignedBranchName={me.branch?.name}
    >
      {children}
    </BranchProvider>
  );
}

export function RootStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useCustomAuth();
  // Derive token reactively from auth state — stays in sync after login/logout/background verify
  const token = session?.access_token ?? null;

  return (
    <StoreProvider token={token}>
      <AppBranchProvider>{children}</AppBranchProvider>
    </StoreProvider>
  );
}
