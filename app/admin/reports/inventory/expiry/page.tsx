'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, Calendar, AlertTriangle, Clock,
  Search, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2
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

export default function ExpiryTrackingReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { products } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [daysFilter, setDaysFilter] = useState('90');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Get expiry data
  const expiryData = useMemo(() => {
    const data: Array<{
      product: string;
      category: string;
      batchNo: string;
      expiryDate: string;
      quantity: number;
      daysLeft: number;
      costPrice: number;
      productId: string;
    }> = [];

    products.forEach(p => {
      p.stockItems?.forEach(item => {
        if (item.expiryDate && item.quantity > 0) {
          const expiry = new Date(item.expiryDate);
          const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          data.push({
            product: p.name,
            category: p.category,
            batchNo: item.batchNo || 'N/A',
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            daysLeft,
            costPrice: item.costPrice || p.costPrice,
            productId: p.id,
          });
        }
      });
    });

    return data.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products]);

  // Filter by days
  const filteredData = useMemo(() => {
    const maxDays = parseInt(daysFilter);
    let filtered = expiryData.filter(d => d.daysLeft <= maxDays);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.product.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term) ||
        d.batchNo.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [expiryData, daysFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Metrics
  const metrics = useMemo(() => {
    const expired = expiryData.filter(d => d.daysLeft <= 0).length;
    const critical = expiryData.filter(d => d.daysLeft > 0 && d.daysLeft <= 30).length;
    const warning = expiryData.filter(d => d.daysLeft > 30 && d.daysLeft <= 60).length;
    const attention = expiryData.filter(d => d.daysLeft > 60 && d.daysLeft <= 90).length;
    const totalValue = expiryData
      .filter(d => d.daysLeft <= 90)
      .reduce((sum, d) => sum + (d.costPrice * d.quantity), 0);
    
    return { expired, critical, warning, attention, totalValue };
  }, [expiryData]);

  const handleExport = () => {
    const rows = [
      ['Product', 'Category', 'Batch No', 'Expiry Date', 'Quantity', 'Days Left', 'Status', 'Value at Risk'],
      ...filteredData.map(d => {
        const status = d.daysLeft <= 0 ? 'EXPIRED' : d.daysLeft <= 30 ? 'CRITICAL' : d.daysLeft <= 60 ? 'WARNING' : 'ATTENTION';
        return [
          d.product, d.category, d.batchNo, d.expiryDate,
          String(d.quantity), String(d.daysLeft), status,
          (d.costPrice * d.quantity).toFixed(2),
        ];
      }),
    ];
    downloadCSV(`expiry-tracking-${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const getStatusBadge = (days: number) => {
    if (days <= 0) return { text: 'EXPIRED', bg: 'rgba(239,68,68,0.15)', color: '#EF4444', icon: AlertCircle };
    if (days <= 30) return { text: 'CRITICAL', bg: 'rgba(239,68,68,0.1)', color: '#EF4444', icon: AlertTriangle };
    if (days <= 60) return { text: 'WARNING', bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', icon: Clock };
    return { text: 'ATTENTION', bg: 'rgba(14,165,233,0.1)', color: '#0EA5E9', icon: CheckCircle2 };
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Expiry Tracking Report</h1>
            <p className="text-sm" style={{ color: card.muted }}>Monitor products approaching expiration</p>
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

      {/* Alert Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Expired', value: String(metrics.expired), color: '#EF4444', icon: AlertCircle },
          { label: 'Critical (≤30d)', value: String(metrics.critical), color: '#EF4444', icon: AlertTriangle },
          { label: 'Warning (31-60d)', value: String(metrics.warning), color: '#F59E0B', icon: Clock },
          { label: 'Value at Risk', value: `GH₵ ${metrics.totalValue.toFixed(2)}`, color: '#8B5CF6', icon: Calendar },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={16} style={{ color: item.color }} />
              <span className="text-xs font-medium" style={{ color: card.subtle }}>{item.label}</span>
            </div>
            <p className="font-display text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
          <input 
            type="text"
            placeholder="Search products or batches..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
        </div>
        <select 
          value={daysFilter}
          onChange={(e) => { setDaysFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}>
          <option value="30">Next 30 days</option>
          <option value="60">Next 60 days</option>
          <option value="90">Next 90 days</option>
          <option value="180">Next 6 months</option>
          <option value="365">Next 1 year</option>
        </select>
      </div>

      {/* Expiry Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Product</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Batch No</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Expiry Date</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Days Left</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Value at Risk</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => {
                const status = getStatusBadge(item.daysLeft);
                const StatusIcon = status.icon;
                return (
                  <tr key={`${item.productId}-${idx}`} className="border-t" style={{ borderColor: card.border }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: card.text }}>{item.product}</p>
                      <p className="text-xs" style={{ color: card.subtle }}>{item.category}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: card.text }}>{item.batchNo}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: card.text }}>{item.quantity}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: card.text }}>
                      {new Date(item.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${item.daysLeft <= 0 ? 'text-red-500' : item.daysLeft <= 30 ? 'text-amber-500' : 'text-blue-500'}`}>
                        {item.daysLeft <= 0 ? 'EXPIRED' : `${item.daysLeft} days`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded" 
                        style={{ background: status.bg, color: status.color }}>
                        <StatusIcon size={12} />
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                      GH₵ {(item.costPrice * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: card.border }}>
            <span className="text-xs" style={{ color: card.muted }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
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
