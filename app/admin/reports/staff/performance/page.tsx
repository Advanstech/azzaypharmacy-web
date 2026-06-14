'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, Users, TrendingUp, ShoppingBag,
  Search, ChevronLeft, ChevronRight, Award, Clock, Store
} from 'lucide-react';
// Using CSS-based charts instead of recharts

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

export default function StaffPerformanceReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, staff, products } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'revenue' | 'sales' | 'items' | 'name'>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Calculate staff performance metrics
  const staffPerformance = useMemo(() => {
    const performance: Record<string, {
      name: string;
      email: string;
      role: string;
      branch: string;
      isOnDuty: boolean;
      isActive: boolean;
      sales: number;
      revenue: number;
      items: number;
      customers: Set<string>;
    }> = {};

    // Initialize all staff
    staff.forEach(s => {
      performance[s.id] = {
        name: s.name,
        email: s.email,
        role: s.role,
        branch: s.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (s.branch?.name ? 'Main Branch' : 'N/A'),
        isOnDuty: s.isOnDuty,
        isActive: s.isActive,
        sales: 0,
        revenue: 0,
        items: 0,
        customers: new Set(),
      };
    });

    // Aggregate sales data
    sales.forEach(s => {
      if (s.cashierId && performance[s.cashierId]) {
        performance[s.cashierId].sales += 1;
        performance[s.cashierId].revenue += s.totalAmount;
        performance[s.cashierId].items += s.items.reduce((sum, i) => sum + i.quantity, 0);
        if (s.customerPhone) performance[s.cashierId].customers.add(s.customerPhone);
      }
    });

    return Object.values(performance);
  }, [sales, staff]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setCurrentPage(1);
  };

  // Filter + sort staff
  const filteredStaff = useMemo(() => {
    let list = [...staffPerformance];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.role.toLowerCase().includes(term) ||
        s.branch.toLowerCase().includes(term)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'revenue') cmp = a.revenue - b.revenue;
      else if (sortField === 'sales') cmp = a.sales - b.sales;
      else if (sortField === 'items') cmp = a.items - b.items;
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [staffPerformance, searchTerm, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedStaff = filteredStaff.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  // Page number buttons (show up to 7: first, last, and surrounding current)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    const left = Math.max(2, safeCurrentPage - 1);
    const right = Math.min(totalPages - 1, safeCurrentPage + 1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Top performers for chart
  const topPerformers = useMemo(() => {
    const performers = [...staffPerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(s => ({
      name: s.name.split(' ')[0],
      revenue: s.revenue,
      sales: s.sales,
    }));
    const maxRevenue = Math.max(...performers.map(p => p.revenue), 1);
    return { performers, maxRevenue };
  }, [staffPerformance]);

  // Metrics
  const metrics = useMemo(() => {
    const totalRevenue = staffPerformance.reduce((sum, s) => sum + s.revenue, 0);
    const totalSales = staffPerformance.reduce((sum, s) => sum + s.sales, 0);
    const activeStaff = staffPerformance.filter(s => s.isActive).length;
    const onDuty = staffPerformance.filter(s => s.isOnDuty).length;
    const topPerformer = staffPerformance[0];
    
    return { totalRevenue, totalSales, activeStaff, onDuty, topPerformer };
  }, [staffPerformance]);

  const handleExport = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Branch', 'Status', 'Total Sales', 'Revenue', 'Items Sold', 'Unique Customers', 'Avg Sale'],
      ...filteredStaff.map(s => [
        s.name, s.email, s.role, s.branch,
        s.isOnDuty ? 'On Duty' : s.isActive ? 'Active' : 'Inactive',
        String(s.sales), s.revenue.toFixed(2), String(s.items),
        String(s.customers.size),
        s.sales > 0 ? (s.revenue / s.sales).toFixed(2) : '0.00',
      ]),
    ];
    downloadCSV(`staff-performance-${new Date().toISOString().split('T')[0]}.csv`, rows);
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
  };

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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Staff Performance Report</h1>
            <p className="text-sm" style={{ color: card.muted }}>Sales performance and activity metrics by staff member</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: '#10B981' },
          { label: 'Total Sales', value: String(metrics.totalSales), icon: ShoppingBag, color: '#0EA5E9' },
          { label: 'Active Staff', value: `${metrics.activeStaff}/${staff.length}`, icon: Users, color: '#8B5CF6' },
          { label: 'On Duty Now', value: String(metrics.onDuty), icon: Clock, color: '#F59E0B' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} style={{ color: kpi.color }} />
              <span className="text-xs font-medium" style={{ color: card.subtle }}>{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold" style={{ color: card.text }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Top Performer */}
      {metrics.topPerformer && (
        <div className="rounded-xl border p-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(14,165,233,0.1) 100%)', borderColor: '#8B5CF6', boxShadow: card.shadow }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Award size={24} style={{ color: '#8B5CF6' }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>Top Performer</p>
              <p className="font-display text-lg font-bold" style={{ color: card.text }}>{metrics.topPerformer.name}</p>
              <p className="text-sm" style={{ color: card.muted }}>{metrics.topPerformer.role} • {metrics.topPerformer.branch}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold" style={{ color: '#8B5CF6' }}>GH₵ {metrics.topPerformer.revenue.toFixed(2)}</p>
              <p className="text-xs" style={{ color: card.muted }}>{metrics.topPerformer.sales} sales • {metrics.topPerformer.items} items</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Chart */}
      <div className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <h3 className="font-bold text-sm mb-4" style={{ color: card.text }}>Top 5 Performers - Revenue</h3>
        <div className="h-64 overflow-x-auto">
          <div className="flex items-end justify-between h-full gap-4 min-w-[400px] px-4">
            {topPerformers.performers.map((p, i) => (
              <div key={i} className="flex flex-col items-center flex-1 group relative">
                <div 
                  className="w-full max-w-[60px] rounded-t transition-all hover:opacity-80"
                  style={{ 
                    height: `${(p.revenue / topPerformers.maxRevenue) * 100}%`, 
                    minHeight: p.revenue > 0 ? '8px' : '0',
                    background: '#8B5CF6',
                  }}
                />
                <span className="text-xs mt-2 font-medium" style={{ color: card.text }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: card.subtle }}>GH₵ {(p.revenue / 1000).toFixed(1)}k</span>
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  GH₵ {p.revenue.toFixed(2)}<br/>{p.sales} sales
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
          <input
            type="text"
            placeholder="Search staff by name, email, role or branch..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: card.muted }}>Per page:</span>
          <select
            value={itemsPerPage}
            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1.5 rounded-lg text-sm border outline-none"
            style={{ background: card.bg, borderColor: card.border, color: card.text }}>
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: card.primaryBg, color: card.primary }}>
          {filteredStaff.length} staff
        </span>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                {[
                  { key: 'name', label: 'Staff Member', align: 'left' },
                  { key: null, label: 'Role & Branch', align: 'left' },
                  { key: null, label: 'Status', align: 'center' },
                  { key: 'sales', label: 'Sales', align: 'center' },
                  { key: 'items', label: 'Items', align: 'center' },
                  { key: 'revenue', label: 'Revenue', align: 'right' },
                  { key: null, label: 'Avg Sale', align: 'right' },
                ].map(col => (
                  <th key={col.label}
                    className={`px-4 py-3 text-${col.align} text-xs font-bold uppercase tracking-wider select-none ${col.key ? 'cursor-pointer hover:opacity-70' : ''}`}
                    style={{ color: col.key && sortField === col.key ? card.primary : card.subtle }}
                    onClick={() => col.key && toggleSort(col.key as typeof sortField)}>
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.key && (
                        sortField === col.key
                          ? <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>
                          : <span className="text-[10px] opacity-30">↕</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedStaff.map((member) => (
                <tr key={member.email} className="border-t" style={{ borderColor: card.border }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: card.text }}>{member.name}</p>
                    <p className="text-xs" style={{ color: card.subtle }}>{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm" style={{ color: card.text }}>{member.role}</p>
                    <p className="text-xs flex items-center gap-1" style={{ color: card.subtle }}>
                      <Store size={10} />
                      {member.branch?.toLowerCase?.().includes('chemical') ? 'Chemical Shop' : 'Main Branch'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold px-2 py-1 rounded" 
                      style={{ 
                        background: member.isOnDuty ? 'rgba(16,185,129,0.1)' : member.isActive ? 'rgba(14,165,233,0.1)' : 'rgba(148,163,184,0.1)',
                        color: member.isOnDuty ? '#10B981' : member.isActive ? '#0EA5E9' : '#94A3B8'
                      }}>
                      {member.isOnDuty ? 'On Duty' : member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: card.text }}>{member.sales}</td>
                  <td className="px-4 py-3 text-center" style={{ color: card.text }}>{member.items}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {member.revenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: card.subtle }}>
                    {member.sales > 0 ? (member.revenue / member.sales).toFixed(2) : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination footer — always visible */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC' }}>
          <span className="text-xs" style={{ color: card.muted }}>
            {filteredStaff.length === 0
              ? 'No results'
              : `Showing ${(safeCurrentPage - 1) * itemsPerPage + 1}–${Math.min(safeCurrentPage * itemsPerPage, filteredStaff.length)} of ${filteredStaff.length}`
            }
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronLeft size={15} style={{ color: card.text }} />
              </button>
              {pageNumbers.map((pg, idx) =>
                pg === '...'
                  ? <span key={`ellipsis-${idx}`} className="px-1 text-sm" style={{ color: card.subtle }}>…</span>
                  : <button
                      key={pg}
                      onClick={() => setCurrentPage(pg as number)}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: safeCurrentPage === pg ? card.primary : card.bg,
                        color: safeCurrentPage === pg ? (isDark ? '#060B14' : '#fff') : card.text,
                        border: `1px solid ${safeCurrentPage === pg ? card.primary : card.border}`,
                      }}>
                      {pg}
                    </button>
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronRight size={15} style={{ color: card.text }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
