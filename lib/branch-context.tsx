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
  equivalentBranchIds?: string[];
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
const MAIN_BRANCH_ALIAS_NAMES = ['main branch', 'dormaa central main branch'];

function isMainBranchAlias(branch?: Branch) {
  return !!branch && MAIN_BRANCH_ALIAS_NAMES.includes(branch.name.trim().toLowerCase());
}

function normalizeBranches(branches: Branch[]) {
  const hasDormaaMain = branches.some(b => b.name.trim().toLowerCase() === 'dormaa central main branch');
  if (!hasDormaaMain) return branches;
  const aliasIds = branches.filter(isMainBranchAlias).map(b => b.id);
  return branches
    .filter(b => b.name.trim().toLowerCase() !== 'main branch')
    .map(b => isMainBranchAlias(b) ? { ...b, equivalentBranchIds: aliasIds } : b);
}

function getEquivalentBranchIds(branches: Branch[], activeBranchId: string | null) {
  if (!activeBranchId) return [];
  const selectedBranch = branches.find(b => b.id === activeBranchId);
  if (selectedBranch?.equivalentBranchIds?.length) return selectedBranch.equivalentBranchIds;
  if (!isMainBranchAlias(selectedBranch)) return [activeBranchId];
  return branches.filter(isMainBranchAlias).map(b => b.id);
}

function getCanonicalBranchId(branches: Branch[], activeBranchId: string | null) {
  if (!activeBranchId) return null;
  const selectedBranch = branches.find(b => b.id === activeBranchId);
  if (!isMainBranchAlias(selectedBranch)) return activeBranchId;
  return branches.find(b => b.name.trim().toLowerCase() === 'dormaa central main branch')?.id ?? activeBranchId;
}

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

  const displayBranches = normalizeBranches(branches);
  const canonicalActiveBranchId = isManager ? getCanonicalBranchId(branches, activeBranchId) : (assignedBranchId ?? null);
  const activeBranchName = canonicalActiveBranchId
    ? (displayBranches.find(b => b.id === canonicalActiveBranchId)?.name ?? branches.find(b => b.id === canonicalActiveBranchId)?.name ?? assignedBranchName ?? 'Branch')
    : isManager
      ? 'All Branches'
      : (assignedBranchName ?? 'My Branch');

  return (
    <BranchContext.Provider value={{
      branches: displayBranches,
      activeBranchId: canonicalActiveBranchId,
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
 * Everyone else sees only their active branch (exact match, no equivalent branches).
 */
export function useBranchFilter() {
  const { branches, activeBranchId, canSwitchBranch } = useBranch();
  return useCallback(<T extends { branchId?: string }>(items: T[]): T[] => {
    console.log(`[BranchFilter] canSwitchBranch=${canSwitchBranch}, activeBranchId=${activeBranchId}, items.length=${items.length}`);
    if (canSwitchBranch && activeBranchId === null) {
      console.log(`[BranchFilter] Returning all items (manager with null branch)`);
      return items; // All branches for managers
    }
    if (!activeBranchId) {
      console.log(`[BranchFilter] No active branch, returning all items`);
      return items; // No branch filter if no active branch
    }
    // For non-managers, use exact branch match only (no equivalent branches)
    const filtered = items.filter(item => item.branchId === activeBranchId);
    console.log(`[BranchFilter] Filtered to ${filtered.length} items for branch ${activeBranchId}`);
    return filtered;
  }, [activeBranchId, canSwitchBranch]);
}
