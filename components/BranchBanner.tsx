'use client';

/**
 * BranchBanner — shows inline notice when a manager is viewing a specific branch.
 * Renders nothing if: user is on "All Branches", or user cannot switch branches.
 */

import { Building2, Globe, X } from 'lucide-react';
import { useBranch } from '@/lib/branch-context';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export function BranchBanner() {
  const { activeBranchId, activeBranchName, canSwitchBranch, setActiveBranch } = useBranch();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !canSwitchBranch || activeBranchId === null) return null;

  const isDark = resolvedTheme === 'dark';
  const accent = isDark ? '#00D9FF' : '#0EA5E9';

  return (
    <div
      className="flex items-center justify-between px-4 py-2 rounded-xl mb-4 text-sm font-bold"
      style={{
        background: isDark ? 'rgba(0,217,255,0.08)' : 'rgba(14,165,233,0.08)',
        border: `1px solid ${isDark ? 'rgba(0,217,255,0.2)' : 'rgba(14,165,233,0.25)'}`,
        color: accent,
      }}
    >
      <div className="flex items-center gap-2">
        <Building2 size={14} />
        <span>Viewing: <strong>{activeBranchName}</strong></span>
        <span className="text-[10px] font-normal opacity-70">— data filtered to this branch</span>
      </div>
      <button
        onClick={() => setActiveBranch(null)}
        className="flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 transition-opacity"
        title="Switch to All Branches"
      >
        <Globe size={11} /> All Branches
      </button>
    </div>
  );
}
