'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Loader2, Globe } from 'lucide-react';
import { useBranch } from '@/lib/branch-context';
import { useTheme } from 'next-themes';

export function BranchSwitcher({ isDark }: { isDark: boolean }) {
  const { branches, activeBranchId, activeBranchName, setActiveBranch, canSwitchBranch, loadingBranches } = useBranch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!canSwitchBranch) return null;

  const accent = isDark ? '#00D9FF' : '#0EA5E9';
  const cardBg = isDark ? '#0F172A' : '#FFFFFF';
  const border = isDark ? 'rgba(0,217,255,0.12)' : 'rgba(14,165,233,0.18)';
  const textMain = isDark ? '#F8FAFC' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';
  const hoverBg = isDark ? 'rgba(0,217,255,0.06)' : 'rgba(14,165,233,0.06)';
  const activeBg = isDark ? 'rgba(0,217,255,0.12)' : 'rgba(14,165,233,0.12)';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm"
        style={{
          background: activeBranchId === null ? `${accent}15` : `${accent}10`,
          borderColor: border,
          color: accent,
        }}
      >
        <span className="text-xs font-black uppercase tracking-wider opacity-80">Branch:</span>
        {activeBranchId === null
          ? <Globe size={15} />
          : <Building2 size={15} />}
        <span className="max-w-[140px] truncate">{activeBranchName}</span>
        {loadingBranches
          ? <Loader2 size={13} className="animate-spin" />
          : <ChevronDown size={13} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-56 rounded-2xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: cardBg, borderColor: border }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: border }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: textMuted }}>
              Switch Branch View
            </p>
          </div>

          {/* All Branches option */}
          <button
            onClick={() => { setActiveBranch(null); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
            style={{
              background: activeBranchId === null ? activeBg : 'transparent',
              color: activeBranchId === null ? accent : textMain,
            }}
            onMouseEnter={e => { if (activeBranchId !== null) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
            onMouseLeave={e => { if (activeBranchId !== null) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Globe size={14} style={{ color: activeBranchId === null ? accent : textMuted }} />
            <div className="flex-1">
              <p className="text-sm font-bold">All Branches</p>
              <p className="text-[10px]" style={{ color: textMuted }}>Combined view</p>
            </div>
            {activeBranchId === null && <Check size={13} style={{ color: accent }} />}
          </button>

          <div className="border-t" style={{ borderColor: border }} />

          {/* Individual branches */}
          {loadingBranches ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin" style={{ color: textMuted }} />
            </div>
          ) : (
            branches.map(b => (
              <button
                key={b.id}
                onClick={() => { setActiveBranch(b.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: activeBranchId === b.id ? activeBg : 'transparent',
                  color: activeBranchId === b.id ? accent : textMain,
                }}
                onMouseEnter={e => { if (activeBranchId !== b.id) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                onMouseLeave={e => { if (activeBranchId !== b.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Building2 size={14} style={{ color: activeBranchId === b.id ? accent : textMuted }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{b.name}</p>
                  {b.location && <p className="text-[10px] truncate" style={{ color: textMuted }}>{b.location}</p>}
                </div>
                {activeBranchId === b.id && <Check size={13} style={{ color: accent }} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
