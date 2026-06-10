'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, Store, Phone, Mail, Package,
  Search, ChevronLeft, ChevronRight, TrendingUp, Award,
  Calendar, Star
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

export default function SupplierPerformanceReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { suppliers, purchases } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Analyze supplier performance
  const supplierAnalysis = useMemo(() => {
    const data: Record<string, {
      id: string;
      name: string;
      phone: string;
      email: string;
      address: string;
      categories: string[];
      totalOrders: number;
      totalValue: number;
      lastOrderDate: string | null;
    }> = {};

    // Initialize all suppliers
    suppliers.forEach(s => {
      data[s.id] = {
        id: s.id,
        name: s.name,
        phone: s.phone || 'N/A',
        email: s.email || 'N/A',
        address: s.address || 'N/A',
        categories: s.categories || [],
        totalOrders: 0,
        totalValue: 0,
        lastOrderDate: null,
      };
    });

    // Aggregate purchase data
    purchases.forEach(p => {
      if (p.supplier && data[p.supplier.id]) {
        data[p.supplier.id].totalOrders += 1;
        data[p.supplier.id].totalValue += p.total;
        
        const orderDate = new Date(p.invoiceDate);
        if (!data[p.supplier.id].lastOrderDate || orderDate > new Date(data[p.supplier.id].lastOrderDate!)) {
          data[p.supplier.id].lastOrderDate = p.invoiceDate;
        }
      }
    });

    return Object.values(data).sort((a, b) => b.totalValue - a.totalValue);
  }, [suppliers, purchases]);

  // Filter
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return supplierAnalysis;
    const term = searchTerm.toLowerCase();
    return supplierAnalysis.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.phone.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.categories.some(c => c.toLowerCase().includes(term))
    );
  }, [supplierAnalysis, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Metrics
  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalOrders = purchases.length;
    const totalValue = purchases.reduce((sum, p) => sum + p.total, 0);
    const topSupplier = supplierAnalysis[0];
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

    return { totalSuppliers, totalOrders, totalValue, topSupplier, avgOrderValue };
  }, [suppliers, purchases, supplierAnalysis]);

  const handleExport = () => {
    const rows = [
      ['Supplier', 'Phone', 'Email', 'Categories', 'Total Orders', 'Total Value', 'Avg Order', 'Last Order'],
      ...filteredSuppliers.map(s => [
        s.name, s.phone, s.email,
        s.categories.join(', '),
        String(s.totalOrders),
        s.totalValue.toFixed(2),
        s.totalOrders > 0 ? (s.totalValue / s.totalOrders).toFixed(2) : '0.00',
        s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString('en-GB') : 'Never',
      ]),
    ];
    downloadCSV(`supplier-performance-${new Date().toISOString().split('T')[0]}.csv`, rows);
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
    purple: '#8B5CF6',
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Supplier Performance</h1>
            <p className="text-sm" style={{ color: card.muted }}>Purchase history and supplier analytics</p>
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
          { label: 'Total Suppliers', value: String(metrics.totalSuppliers), icon: Store, color: card.primary },
          { label: 'Total Orders', value: String(metrics.totalOrders), icon: Package, color: '#10B981' },
          { label: 'Total Value', value: `GH₵ ${metrics.totalValue.toFixed(2)}`, icon: TrendingUp, color: card.purple },
          { label: 'Avg Order', value: `GH₵ ${metrics.avgOrderValue.toFixed(2)}`, icon: Star, color: card.gold },
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

      {/* Top Supplier */}
      {metrics.topSupplier && metrics.topSupplier.totalOrders > 0 && (
        <div className="rounded-xl border p-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(245,158,11,0.1) 100%)', borderColor: card.purple, boxShadow: card.shadow }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Award size={24} style={{ color: card.purple }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: card.purple }}>Top Supplier</p>
              <p className="font-display text-lg font-bold" style={{ color: card.text }}>{metrics.topSupplier.name}</p>
              <p className="text-sm" style={{ color: card.muted }}>
                {metrics.topSupplier.categories.join(', ')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold" style={{ color: card.purple }}>GH₵ {metrics.topSupplier.totalValue.toFixed(2)}</p>
              <p className="text-xs" style={{ color: card.muted }}>{metrics.topSupplier.totalOrders} orders</p>
              {metrics.topSupplier.lastOrderDate && (
                <p className="text-xs flex items-center gap-1 justify-end" style={{ color: card.subtle }}>
                  <Calendar size={10} />
                  Last: {new Date(metrics.topSupplier.lastOrderDate).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
        <input 
          type="text"
          placeholder="Search suppliers by name, contact, or category..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
        />
      </div>

      {/* Suppliers Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Contact</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Categories</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Orders</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Total Value</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Avg Order</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id} className="border-t" style={{ borderColor: card.border }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: card.text }}>{supplier.name}</p>
                    <p className="text-xs flex items-center gap-1" style={{ color: card.subtle }}>
                      <Store size={10} />
                      {supplier.address.substring(0, 30)}{supplier.address.length > 30 ? '...' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs flex items-center gap-1" style={{ color: card.subtle }}>
                      <Phone size={10} />
                      {supplier.phone}
                    </p>
                    <p className="text-xs flex items-center gap-1" style={{ color: card.subtle }}>
                      <Mail size={10} />
                      {supplier.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {supplier.categories.slice(0, 2).map((cat, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ background: card.primaryBg, color: card.primary }}>
                          {cat}
                        </span>
                      ))}
                      {supplier.categories.length > 2 && (
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: card.primaryBg, color: card.primary }}>
                          +{supplier.categories.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: card.text }}>{supplier.totalOrders}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {supplier.totalValue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: card.muted }}>
                    {supplier.totalOrders > 0 ? (supplier.totalValue / supplier.totalOrders).toFixed(2) : '0.00'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: card.text }}>
                    {supplier.lastOrderDate 
                      ? new Date(supplier.lastOrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : 'Never'
                    }
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
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSuppliers.length)} of {filteredSuppliers.length}
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
