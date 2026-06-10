'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, FileText, TrendingUp, TrendingDown,
  DollarSign, ShoppingCart, Receipt, ArrowUpRight, ArrowDownRight,
  Percent
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

export default function ProfitLossReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, products, expenses } = useStore();

  // Calculate all financial metrics
  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    const totalCogs = sales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product.id);
        return itemSum + ((product ? product.costPrice : item.unitPrice * 0.5) * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const approvedExpenses = expenses.filter(e => e.status === 'APPROVED');
    const totalOperatingExpenses = approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Breakdown by category
    const expensesByCategory: Record<string, number> = {};
    approvedExpenses.forEach(e => {
      const cat = String(e.category || 'Uncategorized');
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount);
    });

    return {
      totalRevenue, totalCogs, grossProfit, grossMargin,
      totalOperatingExpenses, netProfit, netMargin,
      approvedExpenses, expensesByCategory,
      totalTransactions: sales.length,
      avgTransaction: sales.length > 0 ? totalRevenue / sales.length : 0,
    };
  }, [sales, products, expenses]);

  const handleExport = () => {
    const rows = [
      ['PROFIT & LOSS STATEMENT'],
      ['Generated:', new Date().toLocaleString('en-GB')],
      [''],
      ['REVENUE'],
      ['Total Revenue', metrics.totalRevenue.toFixed(2), `${metrics.totalTransactions} transactions`],
      ['Average Transaction', metrics.avgTransaction.toFixed(2)],
      [''],
      ['COST OF GOODS SOLD'],
      ['Total COGS', `-${metrics.totalCogs.toFixed(2)}`],
      [''],
      ['GROSS PROFIT'],
      ['Gross Profit', metrics.grossProfit.toFixed(2)],
      ['Gross Margin %', `${metrics.grossMargin.toFixed(1)}%`],
      [''],
      ['OPERATING EXPENSES'],
      ...Object.entries(metrics.expensesByCategory).map(([cat, amount]) => [
        cat, `-${amount.toFixed(2)}`
      ]),
      ['Total Operating Expenses', `-${metrics.totalOperatingExpenses.toFixed(2)}`],
      [''],
      ['NET PROFIT'],
      ['Net Profit', metrics.netProfit.toFixed(2)],
      ['Net Margin %', `${metrics.netMargin.toFixed(1)}%`],
    ];
    downloadCSV(`profit-loss-statement-${new Date().toISOString().split('T')[0]}.csv`, rows);
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
  };

  const isProfitable = metrics.netProfit >= 0;

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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Profit & Loss Statement</h1>
            <p className="text-sm" style={{ color: card.muted }}>Financial performance summary</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: DollarSign, color: card.primary },
          { label: 'Gross Profit', value: `GH₵ ${metrics.grossProfit.toFixed(2)}`, icon: TrendingUp, color: card.success },
          { label: 'Net Profit', value: `GH₵ ${metrics.netProfit.toFixed(2)}`, icon: isProfitable ? ArrowUpRight : ArrowDownRight, color: isProfitable ? card.success : card.danger },
          { label: 'Net Margin', value: `${metrics.netMargin.toFixed(1)}%`, icon: Percent, color: isProfitable ? card.success : card.danger },
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

      {/* P&L Statement */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="p-4 border-b" style={{ borderColor: card.border }}>
          <h3 className="font-bold" style={{ color: card.text }}>Statement of Profit & Loss</h3>
          <p className="text-xs" style={{ color: card.muted }}>All figures in Ghana Cedis (GH₵)</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Revenue Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: card.success }}>
              <DollarSign size={14} />
              Revenue
            </h4>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: card.text }}>Total Revenue ({metrics.totalTransactions} transactions)</span>
                <span className="font-mono font-bold" style={{ color: card.text }}>GH₵ {metrics.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: card.muted }}>Average Transaction Value</span>
                <span className="font-mono" style={{ color: card.muted }}>GH₵ {metrics.avgTransaction.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* COGS Section */}
          <div className="pt-4 border-t" style={{ borderColor: card.border }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: card.danger }}>
              <ShoppingCart size={14} />
              Cost of Goods Sold
            </h4>
            <div className="pl-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: card.text }}>Product Costs (Actual)</span>
                <span className="font-mono font-bold" style={{ color: card.danger }}>-GH₵ {metrics.totalCogs.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="pt-4 border-t" style={{ borderColor: card.border, background: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)' }}>
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold" style={{ color: card.success }}>GROSS PROFIT</h4>
              <div className="text-right">
                <p className="font-display text-lg font-bold font-mono" style={{ color: card.success }}>
                  GH₵ {metrics.grossProfit.toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: card.muted }}>{metrics.grossMargin.toFixed(1)}% margin</p>
              </div>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="pt-4 border-t" style={{ borderColor: card.border }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: card.danger }}>
              <Receipt size={14} />
              Operating Expenses
            </h4>
            <div className="space-y-2 pl-4">
              {Object.entries(metrics.expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span style={{ color: card.text }}>{cat}</span>
                  <span className="font-mono" style={{ color: card.danger }}>-GH₵ {amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: card.border }}>
                <span className="font-bold" style={{ color: card.text }}>Total Operating Expenses</span>
                <span className="font-mono font-bold" style={{ color: card.danger }}>-GH₵ {metrics.totalOperatingExpenses.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="pt-6 border-t-2" style={{ borderColor: isProfitable ? card.success : card.danger, background: isProfitable ? (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)') : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)') }}>
            <div className="flex justify-between items-center p-2">
              <h4 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: isProfitable ? card.success : card.danger }}>
                {isProfitable ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                NET PROFIT
              </h4>
              <div className="text-right">
                <p className="font-display text-2xl font-bold font-mono" style={{ color: isProfitable ? card.success : card.danger }}>
                  GH₵ {metrics.netProfit.toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: card.muted }}>{metrics.netMargin.toFixed(1)}% net margin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
