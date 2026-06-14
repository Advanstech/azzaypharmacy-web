'use client';

/**
 * BranchContext — global active-branch state for multi-branch navigation.
 *
 * Rules:
 *  - Managerial roles (ROOT, SE_ADMIN, OWNER, MANAGER, HEAD_PHARMACIST) can switch branches.
 *    They default to "All Branches" which shows combined data, or pick a specific branch.
 *  - Branch staff (PHARMACIST, TECHNICIAN, CASHIER, etc.) are locked to their assigned branch.
 *    The switcher is not rendered for them; their branchId comes from the JWT.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { gql } from './gql';
import { Q_BRANCHES } from './gql';

export interface Branch {
  id: string;
  name: string;
  location?: string;
  phone?: string;
}

export const MANAGERIAL_ROLES = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'];

interface BranchContextValue {
  branches: Branch[];
  activeBranchId: string | null; // null = "All Branches"
  activeBranchName: string;
  setActiveBranch: (id: string | null) => void;
  canSwitchBranch: boolean;
  loadingBranches: boolean;
}

const BranchContext = createContext<BranchContextValue>({
  branches: [],
  activeBranchId: null,
  activeBranchName: 'All Branches',
  setActiveBranch: () => {},
  canSwitchBranch: false,
  loadingBranches: false,
});

const STORAGE_KEY = 'azzay_active_branch';

export function BranchProvider({
  children,
  role,
  assignedBranchId,
  assignedBranchName,
}: {
  children: ReactNode;
  role: string;
  assignedBranchId?: string;
  assignedBranchName?: string;
}) {
  const isManager = MANAGERIAL_ROLES.includes(role);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(() => {
    if (!isManager) return assignedBranchId ?? null;
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ?? null;
    } catch {
      return null;
    }
  });

  // Fetch branches list for managers
  useEffect(() => {
    if (!isManager) return;
    setLoadingBranches(true);
    gql<{ branches: Branch[] }>(Q_BRANCHES)
      .then(d => setBranches(d.branches ?? []))
      .catch(console.warn)
      .finally(() => setLoadingBranches(false));
  }, [isManager]);

  const setActiveBranch = useCallback((id: string | null) => {
    if (!isManager) return;
    setActiveBranchIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [isManager]);

  const activeBranchName = activeBranchId
    ? (branches.find(b => b.id === activeBranchId)?.name ?? assignedBranchName ?? 'Branch')
    : isManager
      ? 'All Branches'
      : (assignedBranchName ?? 'My Branch');

  return (
    <BranchContext.Provider value={{
      branches,
      activeBranchId: isManager ? activeBranchId : (assignedBranchId ?? null),
      activeBranchName,
      setActiveBranch,
      canSwitchBranch: isManager,
      loadingBranches,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}

/**
 * Returns a filter function for any array of items that have a `branchId` field.
 * Managers with activeBranchId=null see everything.
 * Everyone else sees only their active branch.
 */
export function useBranchFilter() {
  const { activeBranchId, canSwitchBranch } = useBranch();
  return useCallback(<T extends { branchId?: string }>(items: T[]): T[] => {
    if (canSwitchBranch && activeBranchId === null) return items; // All branches
    const targetId = activeBranchId;
    if (!targetId) return items;
    return items.filter(item => item.branchId === targetId);
  }, [activeBranchId, canSwitchBranch]);
}
