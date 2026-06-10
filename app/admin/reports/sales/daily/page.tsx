'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, Calendar, Filter, RefreshCw, 
  TrendingUp, Users, ShoppingBag, CreditCard, Search,
  ChevronLeft, ChevronRight, Receipt
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

export default function DailySalesReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, products } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter sales by selected date
  const dailySales = useMemo(() => {
    return sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === selectedDate);
  }, [sales, selectedDate]);

  // Apply additional filters
  const filteredSales = useMemo(() => {
    let filtered = dailySales;
    if (paymentFilter !== 'All') {
      filtered = filtered.filter(s => s.paymentMethod === paymentFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.customerName?.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.items.some(i => i.product.name.toLowerCase().includes(term))
      );
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dailySales, paymentFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Computed metrics
  const metrics = useMemo(() => {
    const totalRevenue = dailySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = dailySales.length;
    const uniqueCustomers = new Set(dailySales.map(s => s.customerPhone || s.customerName)).size;
    const totalItems = dailySales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    
    const byPayment: Record<string, number> = {};
    dailySales.forEach(s => {
      byPayment[s.paymentMethod] = (byPayment[s.paymentMethod] || 0) + s.totalAmount;
    });

    const totalProfit = dailySales.reduce((sum, s) => {
      const saleCogs = s.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product.id);
        const cost = product ? product.costPrice : (item.unitPrice * 0.5);
        return itemSum + (cost * item.quantity);
      }, 0);
      return sum + (s.totalAmount - saleCogs);
    }, 0);

    return { totalRevenue, totalTransactions, uniqueCustomers, totalItems, byPayment, totalProfit };
  }, [dailySales, products]);

  const handleExport = () => {
    const rows = [
      ['Date', 'Sale ID', 'Customer', 'Phone', 'Items', 'Payment', 'Subtotal', 'Discount', 'Total', 'Profit', 'Cashier'],
      ...filteredSales.map(s => {
        const saleCogs = s.items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.product.id);
          return sum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
        }, 0);
        return [
          new Date(s.createdAt).toLocaleDateString('en-GB'),
          s.id,
          s.customerName || 'Walk-in',
          s.customerPhone || 'N/A',
          String(s.items.reduce((sum, i) => sum + i.quantity, 0)),
          s.paymentMethod,
          (s.subtotal || s.totalAmount).toFixed(2),
          (s.discountAmt || 0).toFixed(2),
          s.totalAmount.toFixed(2),
          (s.totalAmount - saleCogs).toFixed(2),
          s.user?.name || 'Unknown',
        ];
      }),
    ];
    downloadCSV(`daily-sales-detail-${selectedDate}.csv`, rows);
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
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Daily Sales Report</h1>
            <p className="text-sm" style={{ color: card.muted }}>Detailed transaction history with profit analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: '#10B981' },
          { label: 'Transactions', value: String(metrics.totalTransactions), icon: Receipt, color: '#0EA5E9' },
          { label: 'Customers', value: String(metrics.uniqueCustomers), icon: Users, color: '#8B5CF6' },
          { label: 'Items Sold', value: String(metrics.totalItems), icon: ShoppingBag, color: '#F59E0B' },
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

      {/* Payment Method Breakdown */}
      <div className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <h3 className="font-bold text-sm mb-3" style={{ color: card.text }}>Payment Methods</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(metrics.byPayment).map(([method, amount]) => (
            <div key={method} className="px-3 py-2 rounded-lg" style={{ background: card.primaryBg }}>
              <span className="text-xs font-bold" style={{ color: card.primary }}>{method}</span>
              <p className="font-bold" style={{ color: card.text }}>GH₵ {amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
          <input 
            type="text"
            placeholder="Search customer, receipt, or product..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
        </div>
        <select 
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}>
          <option value="All">All Payments</option>
          <option value="Cash">Cash</option>
          <option value="MoMo">Mobile Money</option>
          <option value="Card">Card</option>
          <option value="NHIS">NHIS</option>
          <option value="SPLIT">Split Payment</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Time</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Receipt</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Items</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Payment</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Total</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((sale) => {
                const saleCogs = sale.items.reduce((sum, item) => {
                  const product = products.find(p => p.id === item.product.id);
                  return sum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
                }, 0);
                const profit = sale.totalAmount - saleCogs;
                return (
                  <tr key={sale.id} className="border-t" style={{ borderColor: card.border }}>
                    <td className="px-4 py-3 text-sm" style={{ color: card.text }}>
                      {new Date(sale.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: card.primaryBg, color: card.primary }}>
                        {sale.receiptNo || sale.id.slice(-6)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: card.text }}>{sale.customerName || 'Walk-in'}</p>
                      {sale.customerPhone && <p className="text-xs" style={{ color: card.subtle }}>{sale.customerPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: card.text }}>
                      {sale.items.reduce((sum, i) => sum + i.quantity, 0)} items
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded" 
                        style={{ 
                          background: sale.paymentMethod === 'Cash' ? 'rgba(16,185,129,0.1)' : 
                                    sale.paymentMethod === 'MoMo' ? 'rgba(139,92,246,0.1)' : 
                                    sale.paymentMethod === 'NHIS' ? 'rgba(14,165,233,0.1)' : 'rgba(245,158,11,0.1)',
                          color: sale.paymentMethod === 'Cash' ? '#10B981' : 
                                 sale.paymentMethod === 'MoMo' ? '#8B5CF6' : 
                                 sale.paymentMethod === 'NHIS' ? '#0EA5E9' : '#F59E0B'
                        }}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                      GH₵ {sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold" style={{ color: profit > 0 ? '#10B981' : '#EF4444' }}>
                        GH₵ {profit.toFixed(2)}
                      </span>
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
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length}
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
