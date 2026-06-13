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
  const itemsPerPage = 10;

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

    return Object.values(performance).sort((a, b) => b.revenue - a.revenue);
  }, [sales, staff]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staffPerformance;
    const term = searchTerm.toLowerCase();
    return staffPerformance.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term) ||
      s.branch.toLowerCase().includes(term)
    );
  }, [staffPerformance, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Top performers for chart
  const topPerformers = useMemo(() => {
    const performers = staffPerformance.slice(0, 5).map(s => ({
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
      <div className="relative">
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

      {/* Staff Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Staff Member</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Role & Branch</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Sales</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Items</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Avg Sale</th>
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: card.border }}>
            <span className="text-xs" style={{ color: card.muted }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-50"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronLeft size={16} style={{ color: card.text }} />
              </button>
              <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg transition-all disabled:opacity-50"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronRight size={16} style={{ color: card.text }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
