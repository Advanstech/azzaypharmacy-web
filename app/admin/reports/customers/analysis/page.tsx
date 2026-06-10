'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, Users, Search, Phone, ShoppingBag,
  ChevronLeft, ChevronRight, Crown, Star, TrendingUp
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

export default function CustomerAnalysisReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, customers } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'visits' | 'name'>('spent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Analyze customer data from sales
  const customerAnalysis = useMemo(() => {
    const data: Record<string, {
      name: string;
      phone: string;
      visits: number;
      totalSpent: number;
      items: number;
      lastVisit: string;
      firstVisit: string;
      avgSale: number;
    }> = {};

    // Process sales data
    sales.forEach(s => {
      const key = s.customerPhone || s.customerName || 'Walk-in';
      if (!data[key]) {
        data[key] = {
          name: s.customerName || 'Walk-in',
          phone: s.customerPhone || 'N/A',
          visits: 0,
          totalSpent: 0,
          items: 0,
          lastVisit: s.createdAt,
          firstVisit: s.createdAt,
          avgSale: 0,
        };
      }
      data[key].visits += 1;
      data[key].totalSpent += s.totalAmount;
      data[key].items += s.items.reduce((sum, i) => sum + i.quantity, 0);
      
      const saleDate = new Date(s.createdAt);
      if (saleDate > new Date(data[key].lastVisit)) data[key].lastVisit = s.createdAt;
      if (saleDate < new Date(data[key].firstVisit)) data[key].firstVisit = s.createdAt;
    });

    // Calculate averages
    Object.values(data).forEach(c => {
      c.avgSale = c.visits > 0 ? c.totalSpent / c.visits : 0;
    });

    return Object.values(data);
  }, [sales]);

  // Sort and filter
  const filteredCustomers = useMemo(() => {
    let filtered = customerAnalysis;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      if (sortBy === 'visits') return b.visits - a.visits;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [customerAnalysis, searchTerm, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customerAnalysis.length;
    const totalRevenue = customerAnalysis.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalVisits = customerAnalysis.reduce((sum, c) => sum + c.visits, 0);
    const topCustomer = customerAnalysis[0];
    const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    
    return { totalCustomers, totalRevenue, totalVisits, topCustomer, avgCustomerValue };
  }, [customerAnalysis]);

  const handleExport = () => {
    const rows = [
      ['Customer', 'Phone', 'Visits', 'Items', 'Total Spent', 'Avg Sale', 'First Visit', 'Last Visit'],
      ...filteredCustomers.map(c => [
        c.name, c.phone, String(c.visits), String(c.items),
        c.totalSpent.toFixed(2), c.avgSale.toFixed(2),
        new Date(c.firstVisit).toLocaleDateString('en-GB'),
        new Date(c.lastVisit).toLocaleDateString('en-GB'),
      ]),
    ];
    downloadCSV(`customer-analysis-${new Date().toISOString().split('T')[0]}.csv`, rows);
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
    gold: '#F59E0B',
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Customer Analysis</h1>
            <p className="text-sm" style={{ color: card.muted }}>Customer spending patterns and loyalty metrics</p>
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
          { label: 'Total Customers', value: String(metrics.totalCustomers), icon: Users, color: card.primary },
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: '#10B981' },
          { label: 'Total Visits', value: String(metrics.totalVisits), icon: ShoppingBag, color: '#8B5CF6' },
          { label: 'Avg Customer Value', value: `GH₵ ${metrics.avgCustomerValue.toFixed(2)}`, icon: Star, color: card.gold },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} style={{ color: kpi.color }} />
              <span className="text-xs font-medium" style={{ color: card.subtle }}>{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Top Customer */}
      {metrics.topCustomer && (
        <div className="rounded-xl border p-4" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(16,185,129,0.1) 100%)', borderColor: card.gold, boxShadow: card.shadow }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full" style={{ background: 'rgba(245,158,11,0.2)' }}>
              <Crown size={24} style={{ color: card.gold }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: card.gold }}>Top Customer</p>
              <p className="font-display text-lg font-bold" style={{ color: card.text }}>{metrics.topCustomer.name}</p>
              <p className="text-sm flex items-center gap-1" style={{ color: card.muted }}>
                <Phone size={12} />
                {metrics.topCustomer.phone}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold" style={{ color: card.gold }}>GH₵ {metrics.topCustomer.totalSpent.toFixed(2)}</p>
              <p className="text-xs" style={{ color: card.muted }}>{metrics.topCustomer.visits} visits • {metrics.topCustomer.items} items</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
          <input 
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
        </div>
        <select 
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as 'spent' | 'visits' | 'name'); setCurrentPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}>
          <option value="spent">Sort by: Total Spent</option>
          <option value="visits">Sort by: Visit Count</option>
          <option value="name">Sort by: Name</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Customer</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Visits</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Items</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Total Spent</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Avg Sale</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer, idx) => (
                <tr key={idx} className="border-t" style={{ borderColor: card.border }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: card.text }}>{customer.name}</p>
                    <p className="text-xs flex items-center gap-1" style={{ color: card.subtle }}>
                      <Phone size={10} />
                      {customer.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: card.text }}>{customer.visits}</td>
                  <td className="px-4 py-3 text-center" style={{ color: card.text }}>{customer.items}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {customer.totalSpent.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: card.subtle }}>
                    GH₵ {customer.avgSale.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: card.text }}>
                    {new Date(customer.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length}
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
