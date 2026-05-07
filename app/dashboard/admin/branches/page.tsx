'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Plus, MapPin, Phone, Shield, Activity, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';

const BRANCHES = [
  { id: '1', name: 'Azzay Pharmacy', type: 'LICENSED_PHARMACY', address: 'Main Street, Dormaa Central', town: 'Dormaa', region: 'Bono Region', phone: '+233 24 123 4567', licenseNo: 'FDA-GH-2024-001', licenseExp: '2026-12-31', isActive: true, staff: 5 },
  { id: '2', name: 'Azzay Chemical Shop', type: 'CHEMICAL_SHOP', address: 'Market Road, Dormaa', town: 'Dormaa', region: 'Bono Region', phone: '+233 24 987 6543', licenseNo: 'FDA-GH-2024-002', licenseExp: '2026-06-30', isActive: true, staff: 2 },
];

export default function BranchesPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Branches</h1>
          <p className="text-sm" style={{ color: card.muted }}>Manage your pharmacy network and branch operations.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
          style={{
            background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
            color: isDark ? '#0A0E1A' : '#fff',
            boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
          }}>
          <Plus size={18} />
          Add Branch
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Branches', value: BRANCHES.length, color: '#0EA5E9' },
          { label: 'Active', value: BRANCHES.filter(b => b.isActive).length, color: '#10B981' },
          { label: 'Total Staff', value: BRANCHES.reduce((a, b) => a + b.staff, 0), color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border p-5 backdrop-blur-xl"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <p className="font-display text-3xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-sm" style={{ color: card.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {BRANCHES.map(branch => (
          <div key={branch.id} className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            {/* Header */}
            <div className="p-5 border-b flex items-start justify-between"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl"
                  style={{ background: card.primaryBg, color: card.primary }}>
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold" style={{ color: card.text }}>{branch.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: branch.type === 'LICENSED_PHARMACY' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)',
                      color: branch.type === 'LICENSED_PHARMACY' ? '#0EA5E9' : '#10B981',
                    }}>
                    {branch.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {branch.isActive
                  ? <CheckCircle size={18} style={{ color: '#10B981' }} />
                  : <XCircle size={18} style={{ color: '#EF4444' }} />}
                <button className="p-1.5 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={15} style={{ color: card.subtle }} />
                <span style={{ color: card.muted }}>{branch.address}, {branch.region}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={15} style={{ color: card.subtle }} />
                <span style={{ color: card.muted }}>{branch.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield size={15} style={{ color: card.subtle }} />
                <span style={{ color: card.muted }}>License: {branch.licenseNo}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  Exp: {branch.licenseExp}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <button className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                Manage Branch
              </button>
              <button className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: card.muted, border: `1px solid ${card.border}` }}>
                View Staff ({branch.staff})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
