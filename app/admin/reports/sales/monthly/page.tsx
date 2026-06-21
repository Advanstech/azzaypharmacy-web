'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getEffectiveToday } from '@/lib/effective-date';
import { 
  ArrowLeft, Download, Calendar, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, DollarSign, BarChart3, CreditCard,
  PieChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
// Simple CSS-based chart components instead of recharts

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

export default function MonthlyRevenueReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, products } = useStore();
  const effectiveDay = useMemo(() => getEffectiveToday(sales), [sales]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // Update to effective month once data loads
  useEffect(() => {
    if (sales.length > 0) {
      const d = new Date(effectiveDay);
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales.length]);

  // Parse selected month
  const [year, month] = selectedMonth.split('-').map(Number);

  // Filter sales for selected month
  const monthlySales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }, [sales, year, month]);

  // Computed metrics
  const metrics = useMemo(() => {
    const totalRevenue = monthlySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = monthlySales.length;
    const totalItems = monthlySales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    
    const byPayment: Record<string, { amount: number; count: number }> = {};
    const dailyRevenue: Record<string, number> = {};
    
    monthlySales.forEach(s => {
      // Payment method breakdown
      if (!byPayment[s.paymentMethod]) byPayment[s.paymentMethod] = { amount: 0, count: 0 };
      byPayment[s.paymentMethod].amount += s.totalAmount;
      byPayment[s.paymentMethod].count += 1;
      
      // Daily breakdown
      const day = new Date(s.createdAt).toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + s.totalAmount;
    });

    // Calculate profit
    const totalCogs = monthlySales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product.id);
        return itemSum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
      }, 0);
    }, 0);

    const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;

    return { 
      totalRevenue, totalTransactions, totalItems, byPayment, dailyRevenue,
      totalCogs, profitMargin, avgSale
    };
  }, [monthlySales, products]);

  // Calculate chart data
  const chartData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
      return {
        day: i + 1,
        revenue: metrics.dailyRevenue[day] || 0,
      };
    });
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
    return { data, maxRevenue };
  }, [metrics.dailyRevenue, selectedMonth, year, month]);

  const paymentChartData = useMemo(() => {
    const data = Object.entries(metrics.byPayment).map(([name, data]) => ({
      name,
      value: data.amount,
      count: data.count,
      percentage: metrics.totalRevenue > 0 ? (data.amount / metrics.totalRevenue) * 100 : 0,
    }));
    const totalPercentage = data.reduce((sum, d) => sum + d.percentage, 0);
    return { data, totalPercentage };
  }, [metrics.byPayment, metrics.totalRevenue]);

  const COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleExport = () => {
    const rows = [
      ['Date', 'Day', 'Transactions', 'Revenue', 'Avg Sale'],
      ...Object.entries(metrics.dailyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => {
          const daySales = monthlySales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === date);
          return [
            date,
            new Date(date).toLocaleDateString('en-GB', { weekday: 'short' }),
            String(daySales.length),
            revenue.toFixed(2),
            daySales.length > 0 ? (revenue / daySales.length).toFixed(2) : '0.00',
          ];
        }),
      ['', '', '', '', ''],
      ['Payment Method', 'Revenue', 'Transactions', 'Percentage'],
      ...Object.entries(metrics.byPayment).map(([method, data]) => [
        method,
        data.amount.toFixed(2),
        String(data.count),
        metrics.totalRevenue > 0 ? ((data.amount / metrics.totalRevenue) * 100).toFixed(1) + '%' : '0%',
      ]),
    ];
    downloadCSV(`monthly-revenue-${selectedMonth}.csv`, rows);
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Monthly Revenue Report</h1>
            <p className="text-sm" style={{ color: card.muted }}>Comprehensive revenue analysis and trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primary}30` }}>
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
            value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, 
            icon: DollarSign, 
            color: '#10B981',
            subtext: `${metrics.totalTransactions} transactions`
          },
          { 
            label: 'Net Profit', 
            value: `GH₵ ${(metrics.totalRevenue - metrics.totalCogs).toFixed(2)}`, 
            icon: TrendingUp, 
            color: '#0EA5E9',
            subtext: `${metrics.profitMargin.toFixed(1)}% margin`
          },
          { 
            label: 'Avg Sale Value', 
            value: `GH₵ ${metrics.avgSale.toFixed(2)}`, 
            icon: BarChart3, 
            color: '#F59E0B',
            subtext: 'per transaction'
          },
          { 
            label: 'Items Sold', 
            value: String(metrics.totalItems), 
            icon: CreditCard, 
            color: '#8B5CF6',
            subtext: 'total units'
          },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} style={{ color: kpi.color }} />
              <span className="text-xs font-medium" style={{ color: card.subtle }}>{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold" style={{ color: card.text }}>{kpi.value}</p>
            <p className="text-xs mt-1" style={{ color: card.muted }}>{kpi.subtext}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Revenue Chart */}
        <div className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: card.text }}>Daily Revenue Trend</h3>
          <div className="h-64 overflow-x-auto">
            <div className="flex items-end justify-between h-full gap-1 min-w-[600px]">
              {chartData.data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group relative">
                  <div 
                    className="w-full rounded-t transition-all hover:opacity-80"
                    style={{ 
                      height: `${(d.revenue / chartData.maxRevenue) * 100}%`, 
                      minHeight: d.revenue > 0 ? '4px' : '0',
                      background: card.primary,
                    }}
                  />
                  <span className="text-[10px] mt-1" style={{ color: card.subtle }}>{d.day}</span>
                  {d.revenue > 0 && (
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      GH₵ {d.revenue.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: card.text }}>Payment Methods</h3>
          <div className="space-y-3">
            {paymentChartData.data.map((entry, index) => (
              <div key={entry.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: card.text }}>{entry.name}</span>
                  <span className="font-bold" style={{ color: card.text }}>GH₵ {entry.value.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}>
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${entry.percentage}%`, 
                        background: COLORS[index % COLORS.length] 
                      }}
                    />
                  </div>
                  <span className="text-xs w-10 text-right" style={{ color: card.subtle }}>{entry.percentage.toFixed(1)}%</span>
                </div>
                <p className="text-xs" style={{ color: card.muted }}>{entry.count} transactions</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Method Details */}
      <div className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <h3 className="font-bold text-sm mb-4" style={{ color: card.text }}>Payment Method Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(metrics.byPayment).map(([method, data]) => {
            const percentage = metrics.totalRevenue > 0 ? (data.amount / metrics.totalRevenue) * 100 : 0;
            return (
              <div key={method} className="p-3 rounded-lg" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC' }}>
                <p className="text-xs font-bold mb-1" style={{ color: card.subtle }}>{method}</p>
                <p className="font-bold" style={{ color: card.text }}>GH₵ {data.amount.toFixed(2)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs" style={{ color: card.muted }}>{data.count} sales</span>
                  <span className="text-xs font-bold" style={{ color: percentage > 50 ? '#10B981' : card.muted }}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: card.primary }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
