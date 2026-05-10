'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, TrendingUp, TrendingDown, DollarSign, CreditCard,
  ShoppingCart, Users, Calendar, Download, RefreshCw, Eye, Edit,
  Trash2, Plus, BarChart3, PieChart, Clock, CheckCircle, AlertCircle,
  Package, Receipt, Printer, ArrowUpRight, ArrowDownRight, Star,
  Award, Target, Zap, Bell, Settings, MoreVertical, ChevronDown,
  ChevronRight, X, Save, Loader2
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { usePagination } from '@/hooks/use-pagination';

const PAYMENT_METHODS = {
  CASH: { label: 'Cash', color: '#10B981', icon: '💵' },
  MOMO: { label: 'Mobile Money', color: '#0EA5E9', icon: '📱' },
  CARD: { label: 'Card', color: '#8B5CF6', icon: '💳' },
  NHIS: { label: 'NHIS', color: '#F59E0B', icon: '🏥' },
  CREDIT: { label: 'Credit', color: '#EF4444', icon: '💰' },
};

const SALES_METRICS = {
  DAILY: { label: 'Today', period: 'day' },
  WEEKLY: { label: 'This Week', period: 'week' },
  MONTHLY: { label: 'This Month', period: 'month' },
  YEARLY: { label: 'This Year', period: 'year' },
};

export default function EnhancedSalesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { sales, loadingSales, refetchSales, me, products, customers } = useStore();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [metricPeriod, setMetricPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('DAILY');

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

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
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  // Enhanced sales data with analytics
  const enrichedSales = useMemo(() => {
    return sales.map(sale => ({
      ...sale,
      profit: sale.totalAmount * 0.3, // Assuming 30% profit margin
      itemsCount: sale.items?.length || 0,
      customerType: (sale as any).customerId ? 'Registered' : 'Walk-in',
      averageItemValue: sale.totalAmount / (sale.items?.length || 1),
      timeOfDay: new Date(sale.createdAt).getHours(),
      dayOfWeek: new Date(sale.createdAt).toLocaleDateString('en-US', { weekday: 'short' }),
    }));
  }, [sales]);

  // Filter sales
  const filteredSales = useMemo(() => {
    return enrichedSales.filter(sale => {
      const matchSearch = !search ||
        sale.id.toLowerCase().includes(search.toLowerCase()) ||
        ((sale as any).customerName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        ((sale as any).receiptNo?.toLowerCase() || '').includes(search.toLowerCase());

      const matchPayment = paymentFilter === 'all' || sale.paymentMethod === paymentFilter;
      const matchStatus = statusFilter === 'all' || (sale as any).status === statusFilter;
      
      const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
      const matchDateFrom = !dateFrom || saleDate >= dateFrom;
      const matchDateTo = !dateTo || saleDate <= dateTo;
      
      return matchSearch && matchPayment && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [enrichedSales, search, paymentFilter, statusFilter, dateFrom, dateTo]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const periodSales = filteredSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const now = new Date();
      
      switch (metricPeriod) {
        case 'DAILY':
          return saleDate.toDateString() === now.toDateString();
        case 'WEEKLY':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        case 'MONTHLY':
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'YEARLY':
          return saleDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });

    const totalRevenue = periodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = periodSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const totalTransactions = periodSales.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Payment method breakdown
    const paymentBreakdown = periodSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    // Top products
    const productSales = periodSales.flatMap(sale => sale.items || []);
    const topProducts = productSales.reduce((acc, item) => {
      const productId = (item as any).productId || item.product?.id;
      const existing = acc.find(p => p.productId === productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += (item as any).total || (item.quantity * item.unitPrice);
      } else {
        acc.push({
          productId: productId,
          productName: item.product?.name || 'Unknown',
          quantity: item.quantity,
          revenue: (item as any).total || (item.quantity * item.unitPrice),
        });
      }
      return acc;
    }, [] as any[]).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Hourly sales pattern
    const hourlySales = Array.from({ length: 24 }, (_, hour) => {
      const hourSales = periodSales.filter(sale => new Date(sale.createdAt).getHours() === hour);
      return {
        hour,
        revenue: hourSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        transactions: hourSales.length,
      };
    });

    return {
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageTransaction,
      paymentBreakdown,
      topProducts,
      hourlySales,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }, [filteredSales, metricPeriod]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSales,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredSales,
    itemsPerPage: 10,
  });

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Sales Analytics</h1>
          <p className="text-sm" style={{ color: card.muted }}>Real-time sales performance and customer insights</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
            {Object.entries(SALES_METRICS).map(([key, metric]) => (
              <button
                key={key}
                onClick={() => setMetricPeriod(key as any)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: metricPeriod === key ? card.primary : 'transparent',
                  color: metricPeriod === key ? (isDark ? '#060B14' : '#fff') : card.muted,
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Revenue', 
            value: `GH₵ ${(metrics.totalRevenue/1000).toFixed(1)}k`, 
            sub: `${metrics.totalTransactions} transactions`,
            icon: DollarSign, 
            color: '#10B981',
            change: '+12.5%',
            changeType: 'increase' as const
          },
          { 
            label: 'Total Profit', 
            value: `GH₵ ${(metrics.totalProfit/1000).toFixed(1)}k`, 
            sub: `${metrics.profitMargin.toFixed(1)}% margin`,
            icon: TrendingUp, 
            color: '#8B5CF6',
            change: '+8.2%',
            changeType: 'increase' as const
          },
          { 
            label: 'Avg Transaction', 
            value: `GH₵ ${metrics.averageTransaction.toFixed(0)}`, 
            sub: 'Per sale',
            icon: ShoppingCart, 
            color: '#0EA5E9',
            change: '-2.1%',
            changeType: 'decrease' as const
          },
          { 
            label: 'Top Product', 
            value: metrics.topProducts[0]?.productName?.split(' ')[0] || 'N/A', 
            sub: `${metrics.topProducts[0]?.quantity || 0} sold`,
            icon: Star, 
            color: '#F59E0B',
            change: '+5 new',
            changeType: 'increase' as const
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                    <Icon size={16} />
                  </div>
                  <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  {s.changeType === 'increase' ? (
                    <ArrowUpRight size={14} style={{ color: card.success }} />
                  ) : (
                    <ArrowDownRight size={14} style={{ color: card.danger }} />
                  )}
                  <span className="text-[10px] font-bold" style={{ color: s.changeType === 'increase' ? card.success : card.danger }}>
                    {s.change}
                  </span>
                </div>
              </div>
              <p className="font-display text-lg font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: card.muted }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Payment Methods</h3>
          <div className="space-y-3">
            {Object.entries(metrics.paymentBreakdown).map(([method, amount]) => {
              const methodConfig = PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS];
              const percentage = (amount / metrics.totalRevenue) * 100;
              return (
                <div key={method} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24">
                    <span className="text-lg">{methodConfig?.icon}</span>
                    <span className="text-xs font-medium" style={{ color: card.text }}>{methodConfig?.label}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: methodConfig?.color }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: card.text }}>GH₵ {amount.toLocaleString()}</p>
                    <p className="text-[9px]" style={{ color: card.subtle }}>{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Top Products</h3>
          <div className="space-y-3">
            {metrics.topProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: card.primaryBg, color: card.primary }}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: card.text }}>{product.productName}</p>
                  <p className="text-[10px]" style={{ color: card.subtle }}>{product.quantity} units sold</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: card.primary }}>GH₵ {product.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        {/* Filters */}
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
          <div className="flex gap-3 flex-1">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sales..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
            </div>
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
              <option value="all">All Payments</option>
              {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                <option key={key} value={key}>{method.label}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
          </div>
          <button onClick={() => refetchSales()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                {['Receipt', 'Time', 'Customer', 'Items', 'Payment', 'Total', 'Profit', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((sale, i) => {
                const methodConfig = PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS];
                const isProfitable = (sale.profit || 0) > 0;
                
                return (
                  <tr key={sale.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" style={{ borderBottom: i < paginatedSales.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium" style={{ color: card.primary }}>
                          {(sale as any).receiptNo || sale.id.slice(-8).toUpperCase()}
                        </span>
                        {sale.customerType === 'Registered' && (
                          <Users size={12} style={{ color: card.success }} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: card.text }}>
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px]" style={{ color: card.subtle }}>
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: card.text }}>
                          {sale.customerName || 'Walk-in'}
                        </p>
                        <p className="text-[10px]" style={{ color: card.subtle }}>
                          {sale.customerType}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: card.text }}>{sale.itemsCount}</p>
                        <p className="text-[10px]" style={{ color: card.subtle }}>
                          GH₵ {sale.averageItemValue.toFixed(0)} avg
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{methodConfig?.icon}</span>
                        <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: `${methodConfig?.color}18`, color: methodConfig?.color }}>
                          {methodConfig?.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-bold" style={{ color: card.text }}>
                        GH₵ {sale.totalAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <p className="font-mono text-sm font-bold" style={{ color: isProfitable ? card.success : card.danger }}>
                          {isProfitable ? '+' : ''}GH₵ {(sale.profit || 0).toLocaleString()}
                        </p>
                        {isProfitable && <TrendingUp size={12} style={{ color: card.success }} />}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: card.success + '18', color: card.success }}>
                        Completed
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedSale(sale); setShowDetailsModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-500" title="Print Receipt">
                          <Printer size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500" title="Request Refund">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
          <p className="text-xs" style={{ color: card.muted }}>
            Showing <span className="font-bold" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold" style={{ color: card.text }}>{totalItems}</span> sales
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={prevPage} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              Previous
            </button>
            <button disabled={currentPage === totalPages} onClick={nextPage} className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primary, color: '#fff' }}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-2xl rounded-2xl border overflow-hidden" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Sale Details</h2>
                  <p className="text-xs" style={{ color: card.muted }}>{selectedSale.receiptNo || selectedSale.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Date & Time', value: new Date(selectedSale.createdAt).toLocaleString() },
                  { label: 'Customer', value: selectedSale.customerName || 'Walk-in' },
                  { label: 'Payment Method', value: selectedSale.paymentMethod },
                  { label: 'Items Count', value: `${selectedSale.itemsCount} items` },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: card.inputBg }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{item.label}</p>
                    <p className="text-sm font-medium mt-1" style={{ color: card.text }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="border rounded-xl overflow-hidden" style={{ borderColor: card.border }}>
                <table className="w-full text-left">
                  <thead style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC' }}>
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Product</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: card.subtle }}>Qty</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: card.subtle }}>Price</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: card.subtle }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${card.border}` }}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium" style={{ color: card.text }}>{item.product?.name}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm" style={{ color: card.text }}>{item.quantity}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-mono" style={{ color: card.muted }}>GH₵ {item.unitPrice.toFixed(2)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold font-mono" style={{ color: card.text }}>GH₵ {(item.total || (item.quantity * item.unitPrice)).toFixed(2)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC' }}>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold" style={{ color: card.text }}>Total</td>
                      <td className="px-4 py-3 text-lg font-bold font-mono" style={{ color: card.primary }}>GH₵ {selectedSale.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowDetailsModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>
                  Close
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: card.primary }}>
                  <Printer size={16} />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
