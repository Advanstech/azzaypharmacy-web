'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  ArrowLeft, Download, Users, Clock, CheckCircle, XCircle,
  Search, UserCircle, Wifi, WifiOff, Shield, Building2,
} from 'lucide-react';

function downloadCSV(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csv = rows.map(r => r.map(c => {
    if (c == null) return '""';
    const str = String(c).replace(/"/g, '""');
    return `"${str}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const ROLE_COLORS: Record<string, string> = {
  ROOT: '#EF4444', SE_ADMIN: '#EF4444', OWNER: '#F97316',
  MANAGER: '#8B5CF6', HEAD_PHARMACIST: '#0EA5E9',
  PHARMACIST: '#10B981', DISPENSER: '#14B8A6',
  CASHIER: '#F59E0B', ACCOUNTANT: '#6366F1',
};

function lastSeenLabel(lastSeen?: string): { text: string; isRecent: boolean } {
  if (!lastSeen) return { text: 'Never', isRecent: false };
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 5) return { text: 'Just now', isRecent: true };
  if (mins < 60) return { text: `${mins}m ago`, isRecent: true };
  if (hrs < 24) return { text: `${hrs}h ago`, isRecent: hrs < 4 };
  if (days === 1) return { text: 'Yesterday', isRecent: false };
  return { text: `${days}d ago`, isRecent: false };
}

export default function StaffAttendancePage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { staff, sales, refetchStaff } = useStore();

  useEffect(() => {
    if (staff.length === 0) refetchStaff();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Filters
  const [search, setSearch] = useState('');
  const [dutyFilter, setDutyFilter] = useState<'All' | 'OnDuty' | 'OffDuty'>('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  const uniqueBranches = useMemo(() => {
    const s = new Set(staff.map(m => m.branch?.name).filter(Boolean) as string[]);
    return ['All', ...Array.from(s)];
  }, [staff]);

  const uniqueRoles = useMemo(() => {
    const s = new Set(staff.map(m => m.role));
    return ['All', ...Array.from(s)];
  }, [staff]);

  // Today's sales per staff member
  const todaySalesByStaff = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    sales.forEach(s => {
      if (!s.cashierId) return;
      const d = new Date(s.createdAt).toISOString().split('T')[0];
      if (d !== today) return;
      if (!map[s.cashierId]) map[s.cashierId] = { count: 0, revenue: 0 };
      map[s.cashierId].count += 1;
      map[s.cashierId].revenue += s.totalAmount;
    });
    return map;
  }, [sales, today]);

  const filtered = useMemo(() => {
    let list = [...staff];
    if (dutyFilter === 'OnDuty') list = list.filter(m => m.isOnDuty);
    if (dutyFilter === 'OffDuty') list = list.filter(m => !m.isOnDuty);
    if (branchFilter !== 'All') list = list.filter(m => m.branch?.name === branchFilter);
    if (roleFilter !== 'All') list = list.filter(m => m.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.branch?.name || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [staff, dutyFilter, branchFilter, roleFilter, search]);

  const kpis = useMemo(() => ({
    total: staff.length,
    onDuty: staff.filter(m => m.isOnDuty).length,
    active: staff.filter(m => m.isActive).length,
    inactive: staff.filter(m => !m.isActive).length,
    branches: new Set(staff.map(m => m.branchId).filter(Boolean)).size,
  }), [staff]);

  const handleExport = () => {
    const rows: (string | number | boolean | null | undefined)[][] = [
      ['STAFF ATTENDANCE REPORT'],
      ['Generated:', new Date().toLocaleString('en-GB')],
      ['Date:', today],
      [''],
      ['Name', 'Email', 'Role', 'Branch', 'On Duty', 'Active', 'Last Seen', 'Phone', "Today's Sales", "Today's Revenue (GH₵)"],
      ...filtered.map(m => {
        const perf = todaySalesByStaff[m.id];
        return [
          m.name, m.email, m.role,
          m.branch?.name || 'N/A',
          m.isOnDuty ? 'YES' : 'NO',
          m.isActive ? 'YES' : 'NO',
          m.lastSeen ? new Date(m.lastSeen).toLocaleString('en-GB') : 'Never',
          m.phone || 'N/A',
          String(perf?.count || 0),
          (perf?.revenue || 0).toFixed(2),
        ];
      }),
      [''],
      ['SUMMARY'],
      ['Total Staff', String(kpis.total)],
      ['On Duty', String(kpis.onDuty)],
      ['Active', String(kpis.active)],
      ['Inactive', String(kpis.inactive)],
    ];
    downloadCSV(`staff-attendance-${today}.csv`, rows);
  };

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/reports')}
            className="p-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <ArrowLeft size={20} style={{ color: card.text }} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: card.text }}>
              <Clock size={22} style={{ color: '#06B6D4' }} />
              Staff Attendance Log
            </h1>
            <p className="text-sm" style={{ color: card.muted }}>
              Live duty status · {kpis.onDuty} of {kpis.total} currently on duty
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primary}30` }}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Staff', value: String(kpis.total), icon: Users, color: card.primary },
          { label: 'On Duty Now', value: String(kpis.onDuty), icon: Wifi, color: card.success },
          { label: 'Off Duty', value: String(kpis.total - kpis.onDuty), icon: WifiOff, color: card.muted },
          { label: 'Active', value: String(kpis.active), icon: CheckCircle, color: '#10B981' },
          { label: 'Inactive', value: String(kpis.inactive), icon: XCircle, color: card.danger },
        ].map((k, i) => (
          <div key={i} className="rounded-xl border p-3" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: card.subtle }}>{k.label}</span>
            </div>
            <p className="font-display text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* On-duty live strip */}
      {kpis.onDuty > 0 && (
        <div className="p-4 rounded-xl border flex flex-wrap gap-2 items-center"
          style={{ background: `${card.success}08`, borderColor: `${card.success}30` }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.success }}>On Duty:</span>
          {staff.filter(m => m.isOnDuty).map(m => (
            <span key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: `${ROLE_COLORS[m.role] || card.primary}15`, color: ROLE_COLORS[m.role] || card.primary }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: card.success }} />
              {m.name}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl border" style={{ background: card.bg, borderColor: card.border }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: card.muted }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, role…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none"
            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
        </div>
        {(['All', 'OnDuty', 'OffDuty'] as const).map(f => (
          <button key={f} onClick={() => setDutyFilter(f)}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: dutyFilter === f ? (f === 'OnDuty' ? `${card.success}20` : f === 'OffDuty' ? `${card.danger}15` : card.primaryBg) : card.bg,
              color: dutyFilter === f ? (f === 'OnDuty' ? card.success : f === 'OffDuty' ? card.danger : card.primary) : card.muted,
              border: `1px solid ${dutyFilter === f ? (f === 'OnDuty' ? `${card.success}40` : f === 'OffDuty' ? `${card.danger}30` : `${card.primary}40`) : card.border}`,
            }}>
            {f === 'All' ? 'All Staff' : f === 'OnDuty' ? '● On Duty' : '○ Off Duty'}
          </button>
        ))}
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
          {uniqueBranches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
          {uniqueRoles.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>)}
        </select>
        <span className="flex items-center text-xs font-bold px-3 py-2 rounded-lg"
          style={{ background: `${card.primary}15`, color: card.primary }}>
          {filtered.length} staff
        </span>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_120px_120px_100px] gap-3 px-4 py-3 border-b text-[10px] font-bold uppercase tracking-wider"
          style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: card.border, color: card.subtle }}>
          <span>Staff Member</span>
          <span>Role / Branch</span>
          <span>Duty Status</span>
          <span>Last Seen</span>
          <span className="text-right">Today's Sales</span>
          <span className="text-right">Account</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: card.muted }}>
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No staff found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: card.border }}>
            {filtered.map(m => {
              const roleColor = ROLE_COLORS[m.role] || card.primary;
              const { text: lastSeenText, isRecent } = lastSeenLabel(m.lastSeen);
              const perf = todaySalesByStaff[m.id];
              const branchLabel = m.branch?.name || 'No Branch';

              return (
                <div key={m.id}
                  className="grid grid-cols-[2fr_1fr_1fr_120px_120px_100px] gap-3 px-4 py-3.5 items-center transition-colors hover:bg-white/5">

                  {/* Staff Member */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name}
                          className="w-9 h-9 rounded-xl object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
                          style={{ background: `${roleColor}20`, color: roleColor }}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{
                          background: m.isOnDuty ? card.success : card.muted,
                          borderColor: card.bg,
                        }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: card.text }}>{m.name}</p>
                      <p className="text-[10px]" style={{ color: card.muted }}>{m.email}</p>
                    </div>
                  </div>

                  {/* Role / Branch */}
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${roleColor}15`, color: roleColor }}>
                      {m.role.replace('_', ' ')}
                    </span>
                    <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: card.muted }}>
                      <Building2 size={9} /> {branchLabel}
                    </p>
                  </div>

                  {/* Duty Status */}
                  <div className="flex items-center gap-2">
                    {m.isOnDuty ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${card.success}15`, color: card.success }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: card.success }} />
                        On Duty
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${card.muted}15`, color: card.muted }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.muted }} />
                        Off Duty
                      </span>
                    )}
                  </div>

                  {/* Last Seen */}
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: isRecent ? card.success : card.subtle }} />
                    <span className="text-xs" style={{ color: isRecent ? card.success : card.muted }}>
                      {lastSeenText}
                    </span>
                  </div>

                  {/* Today's Sales */}
                  <div className="text-right">
                    {perf ? (
                      <>
                        <p className="text-xs font-bold" style={{ color: card.text }}>{perf.count} sale{perf.count !== 1 ? 's' : ''}</p>
                        <p className="text-[10px] font-mono" style={{ color: card.success }}>GH₵ {perf.revenue.toFixed(2)}</p>
                      </>
                    ) : (
                      <p className="text-[10px]" style={{ color: card.subtle }}>—</p>
                    )}
                  </div>

                  {/* Account Status */}
                  <div className="flex justify-end">
                    {m.isActive ? (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${card.success}10`, color: card.success }}>Active</span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${card.danger}10`, color: card.danger }}>Inactive</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-xs"
            style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: card.border, color: card.muted }}>
            <span>{filtered.filter(m => m.isOnDuty).length} on duty · {filtered.filter(m => !m.isOnDuty).length} off duty</span>
            <span>
              Total today: {Object.values(todaySalesByStaff).reduce((s, v) => s + v.count, 0)} sales ·
              GH₵ {Object.values(todaySalesByStaff).reduce((s, v) => s + v.revenue, 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
