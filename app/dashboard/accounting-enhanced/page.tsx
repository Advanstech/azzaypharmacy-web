'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight,
  Plus, Filter, Receipt, ShoppingCart, Package, FileText, Wallet, Building2,
  BarChart3, PieChart, Download, Calendar, ChevronDown, ChevronRight, ShieldAlert,
  AlertCircle, CheckCircle, Clock, Eye, Edit, Trash2, Save, Loader2, Settings,
  Bell, Target, Zap, Activity, Users, Percent, Calculator, Banknote, TrendingDown as TrendingDownIcon,
  FileSpreadsheet, Printer, Mail, Share2, RefreshCw
} from 'lucide-react';

const ACCOUNT_CATEGORIES = {
  REVENUE: { label: 'Revenue', color: '#10B981', icon: TrendingUp },
  COGS: { label: 'Cost of Goods', color: '#EF4444', icon: Package },
  OPERATING: { label: 'Operating', color: '#F59E0B', icon: CreditCard },
  FINANCIAL: { label: 'Financial', color: '#8B5CF6', icon: DollarSign },
  TAXES: { label: 'Taxes', color: '#64748B', icon: FileText },
};

const REPORT_TYPES = {
  P_L: { label: 'Profit & Loss', description: 'Revenue, expenses, and profit analysis' },
  BALANCE_SHEET: { label: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
  CASH_FLOW: { label: 'Cash Flow', description: 'Cash inflows and outflows' },
  AGED_PAYABLES: { label: 'Aged Payables', description: 'Outstanding invoices by age' },
  AGED_RECEIVABLES: { label: 'Aged Receivables', description: 'Outstanding payments by age' },
  BUDGET_VARIANCE: { label: 'Budget Variance', description: 'Budget vs actual performance' },
};

export default function EnhancedAccountingPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { sales, products, ledger, purchases, refetchLedger, me } = useStore();
  const branchFilter = useBranchFilter();
  const branchSales = useMemo(() => branchFilter(sales), [branchFilter, sales]);
  const branchProducts = useMemo(() => branchFilter(products), [branchFilter, products]);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports' | 'budget' | 'payables' | 'analytics'>('overview');
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Budget Modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetData, setBudgetData] = useState({
    category: '',
    budgetAmount: 0,
    period: 'monthly',
    notes: '',
  });

  // Transaction Modal
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionData, setTransactionData] = useState({
    type: 'DEBIT',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });

  useEffect(() => setMounted(true), []);
  useEffect(() => { refetchLedger(); }, [refetchLedger]);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const role = me?.role || user?.user_metadata?.role;
  const isManager = ['SE_ADMIN', 'ROOT', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'ACCOUNTANT'].includes(role || '');

  if (!isManager && mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-xl shadow-red-500/5">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
        <p className="text-slate-500 max-w-md">This financial management console is reserved for administrative personnel.</p>
      </div>
    );
  }

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
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  // Enhanced financial data - using real data from store
  const financialData = useMemo(() => {
    // Use real sales data for revenue
    const salesRevenue = branchSales.reduce((sum, sale) => sum + ((sale as any).total || 0), 0);
    
    // Use real purchases for COGS
    const purchasesCost = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    
    // Use real expenses for operating expenses
    const operatingExpenses = ledger
      .filter(l => l.type === 'DEBIT' && l.category && ['SALARIES', 'RENT', 'UTILITIES', 'MARKETING'].includes(l.category))
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    
    const revenue = salesRevenue;
    const expenses = purchasesCost + operatingExpenses;
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Category breakdown
    const categoryBreakdown = {
      REVENUE: salesRevenue,
      COGS: purchasesCost,
      OPERATING: operatingExpenses,
      FINANCIAL: ledger.filter(l => l.category && ['BANK_FEES', 'INTEREST'].includes(l.category)).reduce((sum, l) => sum + (l.amount || 0), 0),
      TAXES: ledger.filter(l => l.category && l.category.includes('TAX')).reduce((sum, l) => sum + (l.amount || 0), 0),
    };

    // Budget data (simulated for now)
    const budgetData = {
      REVENUE: { budget: 15000, actual: categoryBreakdown.REVENUE, variance: categoryBreakdown.REVENUE - 15000 },
      COGS: { budget: 6000, actual: categoryBreakdown.COGS, variance: categoryBreakdown.COGS - 6000 },
      OPERATING: { budget: 5000, actual: categoryBreakdown.OPERATING, variance: categoryBreakdown.OPERATING - 5000 },
      FINANCIAL: { budget: 500, actual: categoryBreakdown.FINANCIAL, variance: categoryBreakdown.FINANCIAL - 500 },
      TAXES: { budget: 1000, actual: categoryBreakdown.TAXES, variance: categoryBreakdown.TAXES - 1000 },
    };

    // Cash flow analysis
    const cashFlow = {
      operating: revenue - purchasesCost - operatingExpenses,
      investing: ledger.filter(l => l.category === 'EQUIPMENT').reduce((sum, l) => sum + (l.amount || 0), 0),
      financing: ledger.filter(l => l.category === 'LOAN').reduce((sum, l) => sum + (l.amount || 0), 0),
      net: (revenue - purchasesCost - operatingExpenses) + ledger.filter(l => l.category === 'LOAN').reduce((sum, l) => sum + (l.amount || 0), 0),
    };

    return {
      revenue,
      expenses,
      netProfit,
      profitMargin,
      categoryBreakdown,
      budgetData,
      cashFlow,
      ledger,
      grossProfit: revenue - purchasesCost,
      operatingProfit: revenue - purchasesCost - operatingExpenses,
      ebitda: revenue - purchasesCost - operatingExpenses + categoryBreakdown.FINANCIAL + categoryBreakdown.TAXES,
    };
  }, [branchSales, purchases, ledger]);

  // Key metrics
  const metrics = useMemo(() => {
    return {
      totalRevenue: financialData.revenue,
      totalExpenses: financialData.expenses,
      netProfit: financialData.netProfit,
      profitMargin: financialData.profitMargin,
      grossProfit: financialData.grossProfit,
      operatingProfit: financialData.operatingProfit,
      ebitda: financialData.ebitda,
      cashFlow: financialData.cashFlow.net,
    };
  }, [financialData]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BranchBanner />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Enhanced Accounting</h1>
          <p className="text-sm" style={{ color: card.muted }}>Comprehensive financial management with real-time reporting and budget tracking</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
            {(['month', 'quarter', 'year'] as const).map(period => (
              <button
                key={period}
                onClick={() => setDateRange(period)}
                className="px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: dateRange === period ? card.primary : 'transparent',
                  color: dateRange === period ? (isDark ? '#060B14' : '#fff') : card.muted,
                }}
              >
                {period}
              </button>
            ))}
          </div>
          <button onClick={() => setShowTransactionModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Plus size={16} />
            Add Transaction
          </button>
          <button onClick={() => setShowBudgetModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.success + '18', color: card.success, border: `1px solid ${card.success}30` }}>
            <Target size={16} />
            Set Budget
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Revenue', 
            value: `GH₵ ${(metrics.totalRevenue/1000).toFixed(1)}k`, 
            sub: `${dateRange} sales`,
            icon: TrendingUp, 
            color: card.success,
            change: '+15.3%',
            changeType: 'increase' as const
          },
          { 
            label: 'Net Profit', 
            value: `GH₵ ${(metrics.netProfit/1000).toFixed(1)}k`, 
            sub: `${metrics.profitMargin.toFixed(1)}% margin`,
            icon: DollarSign, 
            color: card.primary,
            change: '+8.7%',
            changeType: 'increase' as const
          },
          { 
            label: 'Operating Expenses', 
            value: `GH₵ ${(financialData.categoryBreakdown.OPERATING/1000).toFixed(1)}k`, 
            sub: 'Running costs',
            icon: CreditCard, 
            color: card.warning,
            change: '+3.2%',
            changeType: 'increase' as const
          },
          { 
            label: 'Cash Flow', 
            value: `GH₵ ${(metrics.cashFlow/1000).toFixed(1)}k`, 
            sub: 'Net cash position',
            icon: Activity, 
            color: metrics.cashFlow >= 0 ? card.success : card.danger,
            change: metrics.cashFlow >= 0 ? '+12.1%' : '-5.4%',
            changeType: metrics.cashFlow >= 0 ? 'increase' as const : 'decrease' as const
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'transactions', label: 'Transactions', icon: FileText, count: financialData.ledger.length },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
          { id: 'budget', label: 'Budget', icon: Target },
          { id: 'payables', label: 'Payables', icon: Building2 },
          { id: 'analytics', label: 'Analytics', icon: PieChart },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent', color: activeTab === tab.id ? card.primary : card.muted }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === tab.id ? card.primary : 'rgba(148,163,184,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : card.muted }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profit & Loss Summary */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Profit & Loss Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: card.success + '10' }}>
                <span className="text-sm font-medium" style={{ color: card.text }}>Total Revenue</span>
                <span className="font-mono text-base font-bold" style={{ color: card.success }}>GH₵ {metrics.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: card.inputBg }}>
                <span className="text-sm" style={{ color: card.muted }}>Cost of Goods Sold</span>
                <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {financialData.categoryBreakdown.COGS.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: card.inputBg }}>
                <span className="text-sm font-medium" style={{ color: card.text }}>Gross Profit</span>
                <span className="font-mono text-sm font-bold" style={{ color: card.primary }}>GH₵ {metrics.grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: card.inputBg }}>
                <span className="text-sm" style={{ color: card.muted }}>Operating Expenses</span>
                <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {financialData.categoryBreakdown.OPERATING.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t" style={{ borderColor: card.border }}>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: card.primaryBg, border: `1px solid ${card.primaryBorder}` }}>
                  <span className="text-sm font-medium" style={{ color: card.primary }}>Net Profit</span>
                  <span className="font-mono text-lg font-bold" style={{ color: card.primary }}>GH₵ {metrics.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Variance */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Budget Variance</h3>
            <div className="space-y-3">
              {Object.entries(financialData.budgetData).map(([category, data]) => {
                const variancePercent = ((data.variance / data.budget) * 100).toFixed(1);
                const isPositive = data.variance >= 0;
                
                return (
                  <div key={category} className="p-3 rounded-xl" style={{ background: card.inputBg }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: card.text }}>
                        {ACCOUNT_CATEGORIES[category as keyof typeof ACCOUNT_CATEGORIES]?.label || category}
                      </span>
                      <span className={`text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{variancePercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                      <span>Budget: GH₵{data.budget.toLocaleString()}</span>
                      <span>•</span>
                      <span>Actual: GH₵{data.actual.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ 
                          width: `${Math.min(100, (data.actual / data.budget) * 100)}%`, 
                          background: isPositive ? card.success : card.danger 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div>
              <h2 className="font-display text-sm font-bold" style={{ color: card.text }}>General Ledger</h2>
              <p className="text-xs mt-0.5" style={{ color: card.subtle }}>{financialData.ledger.length} transactions</p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Filter size={14} />
                Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Download size={14} />
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${card.divider}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                  {['Date', 'Reference', 'Description', 'Category', 'Amount', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financialData.ledger.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" style={{ borderBottom: `1px solid ${card.divider}` }}>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: card.muted }}>{transaction.date}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-medium" style={{ color: card.primary }}>{(transaction as any).reference || 'N/A'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm" style={{ color: card.text }}>{transaction.description}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-medium px-2 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                        {transaction.category?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-bold" style={{ color: transaction.type === 'CREDIT' ? card.success : card.danger }}>
                        {transaction.type === 'CREDIT' ? '+' : '-'}GH₵ {transaction.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-500" title="Edit">
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(REPORT_TYPES).map(([key, report]) => {
            const Icon = key === 'P_L' ? BarChart3 : key === 'BALANCE_SHEET' ? FileSpreadsheet : key === 'CASH_FLOW' ? Activity : FileText;
            
            return (
              <div key={key} className="rounded-2xl border p-5 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer" 
                style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}
                onClick={() => setSelectedReport(key)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primaryBg, color: card.primary }}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-sm font-bold" style={{ color: card.text }}>{report.label}</h3>
                    <p className="text-xs" style={{ color: card.subtle }}>{report.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: card.primary, color: '#fff' }}>
                    Generate
                  </button>
                  <button className="p-2 rounded-lg" style={{ background: card.inputBg, color: card.muted }}>
                    <Download size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-bold" style={{ color: card.text }}>Budget Management</h3>
            <button onClick={() => setShowBudgetModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: card.primary, color: '#fff' }}>
              <Plus size={16} />
              Create Budget
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(financialData.budgetData).map(([category, data]) => {
              const categoryConfig = ACCOUNT_CATEGORIES[category as keyof typeof ACCOUNT_CATEGORIES];
              const Icon = categoryConfig.icon;
              const variancePercent = ((data.variance / data.budget) * 100).toFixed(1);
              const isPositive = data.variance >= 0;
              
              return (
                <div key={category} className="p-4 rounded-xl border" style={{ background: card.inputBg, borderColor: card.border }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${categoryConfig.color}18`, color: categoryConfig.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium" style={{ color: card.text }}>{categoryConfig.label}</h4>
                      <p className="text-xs" style={{ color: card.subtle }}>Monthly budget</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{variancePercent}%
                      </span>
                      <p className="text-xs" style={{ color: card.subtle }}>variance</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs" style={{ color: card.subtle }}>Budget</p>
                      <p className="font-medium" style={{ color: card.text }}>GH₵{data.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: card.subtle }}>Actual</p>
                      <p className="font-medium" style={{ color: card.text }}>GH₵{data.actual.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: card.subtle }}>Remaining</p>
                      <p className="font-medium" style={{ color: isPositive ? card.success : card.danger }}>
                        GH₵{Math.max(0, data.budget - data.actual).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ 
                        width: `${Math.min(100, (data.actual / data.budget) * 100)}%`, 
                        background: isPositive ? card.success : card.danger 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
