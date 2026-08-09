'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useBranch } from '@/lib/branch-context';
import { exportToExcel } from '@/lib/export-excel';
import { getEffectiveToday } from '@/lib/effective-date';
import { usePagination } from '@/hooks/use-pagination';
import { 
  ArrowLeft, Download, Calendar, Filter, RefreshCw, 
  TrendingUp, Users, ShoppingBag, CreditCard, Search,
  ChevronLeft, ChevronRight, Receipt
} from 'lucide-react';

export default function DailySalesReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const searchParams = useSearchParams();
  const { sales: allSales, products } = useStore();
  const { activeBranchId, activeBranchName } = useBranch();
  const sales = useMemo(() => activeBranchId ? allSales.filter(s => s.branchId === activeBranchId) : allSales, [allSales, activeBranchId]);
  const effectiveDay = useMemo(() => getEffectiveToday(sales), [sales]);
  const [selectedDate, setSelectedDate] = useState(searchParams?.get('to') || searchParams?.get('from') || new Date().toISOString().split('T')[0]);
  // Apply effective date once data loads, but only if the URL did not already specify one
  useEffect(() => {
    if (sales.length > 0 && !searchParams?.get('to') && !searchParams?.get('from')) {
      setSelectedDate(effectiveDay);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales.length, effectiveDay]);
  // Persist user date changes to the URL for cross-report sync
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (selectedDate !== params.get('from') || selectedDate !== params.get('to')) {
      params.set('from', selectedDate);
      params.set('to', selectedDate);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [selectedDate, router, searchParams]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

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
        s.user?.name?.toLowerCase().includes(term) ||
        s.cashierId?.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.items.some(i => i.product.name.toLowerCase().includes(term))
      );
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dailySales, paymentFilter, searchTerm]);

  const { currentPage, totalPages, paginatedData: paginatedSales, nextPage, prevPage, goToPage, startIndex, endIndex } = usePagination({ data: filteredSales });

  // Computed metrics
  const metrics = useMemo(() => {
    const totalRevenue = dailySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = dailySales.length;
    const uniqueCustomers = new Set(dailySales.map(s => s.customerPhone || s.customerName)).size;
    const totalItems = dailySales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    
    const byPayment: Record<string, number> = {};
    dailySales.forEach(s => {
      if (s.paymentMethod === 'SPLIT') {
        byPayment['CASH'] = (byPayment['CASH'] || 0) + (s.cashAmount || 0);
        byPayment['MOMO'] = (byPayment['MOMO'] || 0) + (s.momoAmount || 0);
      } else {
        byPayment[s.paymentMethod] = (byPayment[s.paymentMethod] || 0) + s.totalAmount;
      }
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
    const rows = filteredSales.map(s => {
      const saleCogs = s.items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product.id);
        return sum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
      }, 0);
      return [
        new Date(s.createdAt).toLocaleDateString('en-GB'),
        s.id,
        s.customerName || 'Walk-in',
        s.customerPhone || 'N/A',
        s.items.reduce((sum, i) => sum + i.quantity, 0),
        s.paymentMethod,
        s.notes === 'CONVERTED_FROM_PENDING' ? 'Pending Hold' : 'Direct',
        (s.subtotal || s.totalAmount),
        (s.discountAmt || 0),
        s.totalAmount,
        (s.totalAmount - saleCogs),
        s.user?.name || 'Unknown',
      ];
    });
    exportToExcel({
      filename: `daily-sales-report-${activeBranchName.replace(/\s+/g, '-').toLowerCase()}-${selectedDate}`,
      title: 'Daily Sales Report',
      subtitle: 'Azzay Pharmacy — Detailed Transaction History',
      meta: [{ label: 'Branch', value: activeBranchName }, { label: 'Date', value: selectedDate }],
      summary: [
        { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}` },
        { label: 'Transactions', value: metrics.totalTransactions },
        { label: 'Total Profit', value: `GH₵ ${metrics.totalProfit.toFixed(2)}` },
      ],
      headers: ['Date', 'Sale ID', 'Customer', 'Phone', 'Items', 'Payment', 'Origin', 'Subtotal', 'Discount', 'Total', 'Profit', 'Cashier'],
      rows,
      currencyColumns: [7, 8, 9, 10],
      numberColumns: [4],
      sheetName: 'Daily Sales',
    });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button 
            onClick={() => router.push('/admin/reports')}
            className="p-3 rounded-2xl transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center backdrop-blur-xl"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${card.border}`, color: card.text }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-1">
              Daily Sales Report
            </h1>
            <p className="text-sm font-medium" style={{ color: card.muted }}>Detailed transaction history with profit analysis · <span className="font-bold" style={{ color: card.primary }}>{activeBranchName}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-2xl backdrop-blur-xl shadow-inner" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', border: `1px solid ${card.border}` }}>
            <Calendar size={16} className="mx-3" style={{ color: card.subtle }} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); goToPage(1); }}
              className="pr-4 py-2 rounded-xl text-sm font-bold bg-transparent focus:outline-none"
              style={{ color: card.text }}
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all hover:scale-105 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#FFF' }}>
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: '#10B981', glow: 'rgba(16,185,129,0.2)' },
          { label: 'Transactions', value: String(metrics.totalTransactions), icon: Receipt, color: '#0EA5E9', glow: 'rgba(14,165,233,0.2)' },
          { label: 'Customers', value: String(metrics.uniqueCustomers), icon: Users, color: '#8B5CF6', glow: 'rgba(139,92,246,0.2)' },
          { label: 'Items Sold', value: String(metrics.totalItems), icon: ShoppingBag, color: '#F59E0B', glow: 'rgba(245,158,11,0.2)' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-3xl border p-5 relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-xl backdrop-blur-xl" 
            style={{ background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.7)', borderColor: card.border }}>
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-30 transition-opacity group-hover:opacity-50" style={{ background: kpi.color }} />
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2.5 rounded-xl shadow-inner" style={{ background: `linear-gradient(135deg, ${kpi.color}30, ${kpi.color}05)`, color: kpi.color, border: `1px solid ${kpi.color}40` }}>
                <kpi.icon size={18} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: card.subtle }}>{kpi.label}</span>
            </div>
            <p className="font-display text-2xl font-black relative z-10 tracking-tight" style={{ color: card.text }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Payment Method Breakdown */}
      <div className="rounded-3xl border p-6 backdrop-blur-xl shadow-lg relative z-10" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.7)', borderColor: card.border }}>
        <h3 className="font-black text-sm mb-4 tracking-wider uppercase" style={{ color: card.subtle }}>Payment Methods Breakdown</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(metrics.byPayment).map(([method, amount]) => (
            <div key={method} className="px-5 py-3 rounded-2xl flex items-center gap-3 transition-transform hover:scale-105 cursor-default" 
              style={{ background: card.primaryBg, border: `1px solid ${card.primaryBorder}` }}>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md" style={{ background: card.primaryBg, color: card.primary }}>{method}</span>
              <p className="font-display font-black" style={{ color: card.text }}>GH₵ {amount.toFixed(2)}</p>
            </div>
          ))}
          {Object.keys(metrics.byPayment).length === 0 && (
             <p className="text-xs font-medium" style={{ color: card.muted }}>No payment data for this period.</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-sky-500" size={18} style={{ color: card.subtle }} />
          <input 
            type="text"
            placeholder="Search customer, receipt, or product..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); goToPage(1); }}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all focus:ring-2 focus:outline-none backdrop-blur-xl shadow-sm"
            style={{ background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)', border: `1px solid ${card.border}`, color: card.text, outlineColor: card.primary }}
          />
        </div>
        <select 
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); goToPage(1); }}
          className="px-5 py-3.5 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:outline-none backdrop-blur-xl shadow-sm appearance-none cursor-pointer"
          style={{ background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)', border: `1px solid ${card.border}`, color: card.text, outlineColor: card.primary, minWidth: '180px' }}>
          <option value="All">All Payments</option>
          <option value="Cash">Cash</option>
          <option value="MoMo">Mobile Money</option>
          <option value="Card">Card</option>
          <option value="NHIS">NHIS</option>
          <option value="SPLIT">Split Payment</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl border overflow-hidden shadow-2xl relative z-10 backdrop-blur-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.7)', borderColor: card.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(241,245,249,0.5)' }}>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Time</th>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Receipt</th>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Customer</th>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Staff</th>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Items</th>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Payment</th>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Origin</th>
                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Total</th>
                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Profit</th>
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
                  <tr key={sale.id} className="border-t transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: card.border }}>
                    <td className="px-5 py-4 text-xs font-bold" style={{ color: card.text }}>
                      {new Date(sale.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono" style={{ color: card.muted }}>{sale.receiptNo || sale.id.slice(-6)}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold" style={{ color: card.text }}>{sale.customerName || 'Walk-in'}</p>
                      {sale.customerPhone && <p className="text-[10px]" style={{ color: card.subtle }}>{sale.customerPhone}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold" style={{ color: card.text }}>{sale.user?.name || 'Unknown'}</p>
                      {sale.user?.role && <p className="text-[10px] capitalize" style={{ color: card.subtle }}>{sale.user.role.toLowerCase()}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: card.text }}>
                      {sale.items.reduce((sum, i) => sum + i.quantity, 0)} units
                    </td>
                    <td className="px-5 py-4">
                      {sale.paymentMethod === 'SPLIT' ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: card.primaryBg, color: card.primary }}>
                            SPLIT
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: card.muted }}>
                            CASH GH₵ {(sale.cashAmount || 0).toFixed(2)} · MOMO GH₵ {(sale.momoAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md"
                          style={{ background: card.primaryBg, color: card.primary }}>
                          {sale.paymentMethod}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {sale.notes === 'CONVERTED_FROM_PENDING' ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                          Pending Hold
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: card.primaryBg, color: card.primary }}>
                          Direct
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm font-black" style={{ color: card.text }}>
                      GH₵ {sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm font-black" style={{ color: profit >= 0 ? '#10B981' : '#EF4444' }}>
                      GH₵ {profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {paginatedSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm font-bold" style={{ color: card.muted }}>
                    No sales found for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: card.border }}>
            <span className="text-xs" style={{ color: card.muted }}>
              Showing {startIndex} - {endIndex} of {filteredSales.length}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-50"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronLeft size={16} style={{ color: card.text }} />
              </button>
              <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={nextPage}
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
