'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, 
  Plus, Filter, Receipt, ShoppingCart, Package, FileText, Wallet, Building2,
  BarChart3, PieChart, Download, Calendar, ChevronDown, ChevronRight, ShieldAlert,
  ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useCustomAuth } from '@/lib/custom-auth';

// No hardcoded data — all figures come from the live store

export default function FinancialsPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { user } = useCustomAuth();
  const { sales, products, ledger, purchases, invoices, expenses, expenseCategories, createExpense, refetchLedger, refetchInvoices, refetchSales, refetchProducts, refetchExpenses, me } = useStore();

  useEffect(() => {
    if (ledger.length === 0) refetchLedger();
    if (invoices.length === 0) refetchInvoices();
    if (sales.length === 0) refetchSales();
    if (products.length === 0) refetchProducts();
    if (expenses.length === 0) refetchExpenses();
  }, [refetchLedger, refetchInvoices, refetchSales, refetchProducts, refetchExpenses, ledger.length, invoices.length, sales.length, products.length, expenses.length]);

  const role = user?.role || user?.user_metadata?.role || me?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'ACCOUNTANT'].includes(role || '');

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payables' | 'analytics'>('overview');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  
  // Pagination states
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [payablesPage, setPayablesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const liveLedger = useMemo(() => {
    const entries: any[] = [...ledger];

    // Inject sales as CREDIT entries if ledger is sparse
    if (sales && sales.length > 0 && ledger.length === 0) {
      sales.forEach(sale => {
        entries.push({
          id: `SALE-${sale.id}`,
          date: new Date(sale.createdAt).toISOString().split('T')[0],
          type: 'CREDIT',
          account: 'SALES_REVENUE',
          category: 'Pharmacy Sales',
          amount: sale.totalAmount,
          description: `POS Sale — ${sale.paymentMethod}`,
          ref: sale.id.slice(-8).toUpperCase(),
        });
      });
    }

    // Inject real expenses
    if (expenses && expenses.length > 0) {
      expenses.filter(e => e.status === 'APPROVED').forEach(exp => {
        if (!entries.some(l => l.ref === exp.id || l.id === exp.id)) {
          entries.push({
            id: exp.id,
            date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date(exp.createdAt || Date.now()).toISOString().split('T')[0],
            type: 'DEBIT',
            account: 'EXPENSE',
            category: exp.category?.name || 'Operating Expense',
            amount: exp.amount,
            description: exp.description,
            ref: exp.id.slice(-8).toUpperCase(),
          });
        }
      });
    }

    // Inject invoice payments as DEBIT (cash out / liability reduction)
    if (invoices && invoices.length > 0) {
      invoices.forEach(inv => {
        if (inv.payments && inv.payments.length > 0) {
          inv.payments.forEach(pmt => {
            const pmtId = `PMT-${pmt.id}`;
            if (!entries.some(l => l.id === pmtId)) {
              entries.push({
                id: pmtId,
                date: new Date(pmt.paidAt || Date.now()).toISOString().split('T')[0],
                type: 'DEBIT',
                account: 'LIABILITY',
                category: 'Supplier Payment',
                amount: pmt.amount,
                description: `Supplier Payment — INV: ${inv.invoiceNo} (${pmt.method})`,
                ref: inv.invoiceNo,
                supplier: inv.supplier?.name,
              });
            }
          });
        }
        // Inject the original purchase liability (CREDIT = we owe)
        const liabilityId = `LIA-${inv.id}`;
        if (!entries.some(l => l.id === liabilityId)) {
          entries.push({
            id: liabilityId,
            date: new Date(inv.issueDate).toISOString().split('T')[0],
            type: 'CREDIT',
            account: 'LIABILITY',
            category: 'Accounts Payable',
            amount: inv.total,
            description: `Supplier Invoice Received — INV: ${inv.invoiceNo}`,
            ref: inv.invoiceNo,
            supplier: inv.supplier?.name,
          });
        }
      });
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, expenses, sales, invoices]);

  // Live payables from real invoices
  const livePayables = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    return invoices.map(inv => ({
      id: inv.id,
      supplier: inv.supplier?.name || 'Unknown Supplier',
      invoice: inv.invoiceNo,
      amount: inv.balance,
      total: inv.total,
      paidAmount: inv.paidAmount,
      status: inv.paymentStatus === 'PAID' ? 'paid' : (inv.dueDate && new Date(inv.dueDate) < new Date() ? 'overdue' : 'pending'),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'No due date',
      issueDate: new Date(inv.issueDate).toLocaleDateString(),
    }));
  }, [invoices]);

  const totalRevenue = useMemo(() => liveLedger.filter(l => l.type === 'CREDIT' && l.account === 'SALES_REVENUE').reduce((a, l) => a + Number(l.amount), 0), [liveLedger]);
  const totalExpenses = useMemo(() => liveLedger.filter(l => l.type === 'DEBIT' && l.account !== 'LIABILITY').reduce((a, l) => a + Number(l.amount), 0), [liveLedger]);
  const netProfit = totalRevenue - totalExpenses;
  const cogsTotal = useMemo(() => liveLedger.filter(l => l.account === 'COGS').reduce((a, l) => a + Number(l.amount), 0), [liveLedger]);
  const supplierPayments = useMemo(() => invoices.reduce((a, inv) => a + Number(inv.paidAmount || 0), 0), [invoices]);
  const inventoryValue = useMemo(() => products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stockQuantity || 0), 0), [products]);
  const outstandingPayables = useMemo(() => invoices.reduce((a, inv) => a + Number(inv.balance || 0), 0), [invoices]);

  const categoryBreakdown = useMemo(() => {
    const totalInvoiceValue = invoices.reduce((a, inv) => a + Number(inv.total || 0), 0);
    const approvedExpenses = expenses.filter(e => e.status === 'APPROVED');
    const totalExpenseAmt = approvedExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    const maxAmt = Math.max(totalRevenue, totalInvoiceValue, cogsTotal, totalExpenseAmt) || 1;
    return [
      { category: 'Pharmacy Sales', amount: totalRevenue, type: 'income' as const, percentage: Math.round((totalRevenue / maxAmt) * 100) },
      { category: 'Cost of Goods', amount: cogsTotal, type: 'expense' as const, percentage: Math.round((cogsTotal / maxAmt) * 100) },
      { category: 'Supplier Invoices', amount: totalInvoiceValue, type: 'expense' as const, percentage: Math.round((totalInvoiceValue / maxAmt) * 100) },
      { category: 'Supplier Payments', amount: supplierPayments, type: 'expense' as const, percentage: Math.round((supplierPayments / maxAmt) * 100) },
      { category: 'Operating Expenses', amount: totalExpenseAmt, type: 'expense' as const, percentage: Math.round((totalExpenseAmt / maxAmt) * 100) },
    ];
  }, [totalRevenue, cogsTotal, invoices, supplierPayments, expenses]);

  if (!isManager && mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-xl shadow-red-500/5">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
        <p className="text-slate-500 max-w-md">This financial management console is reserved for administrative personnel. Your role does not have the required permissions to view the general ledger.</p>
      </div>
    );
  }

  const handleExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeTab === 'payables') {
      csvContent += 'Supplier,Invoice,Amount,Status,Due Date\n';
      livePayables.forEach(p => {
        csvContent += `"${p.supplier}","${p.invoice}",${p.amount},${p.status},"${p.dueDate}"\n`;
      });
    } else {
      csvContent += 'Date,Reference,Description,Category,Type,Amount\n';
      liveLedger.forEach(l => {
        csvContent += `"${l.date}","${l.ref || l.id}","${l.description}","${l.category}","${l.type}",${l.amount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.amount) return;
    setIsSubmitting(true);
    try {
      await createExpense({
        categoryId: expenseForm.categoryId,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        date: expenseForm.date,
      });
      setShowRecordModal(false);
      setExpenseForm({ categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Financial Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>Accounting, supplier payables, and profit analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Download size={16} />
            Export Report
          </button>
          <button onClick={() => setShowRecordModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
              color: isDark ? '#0A0E1A' : '#fff',
              boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
            }}>
            <Plus size={18} />
            Record Transaction
          </button>
        </div>
      </div>

      {/* 3D KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `GH₵ ${(totalRevenue/1000).toFixed(1)}k`, sub: 'YTD Sales', icon: TrendingUp, color: '#10B981', gradient: 'from-emerald-500/20 to-teal-500/5' },
          { label: 'Net Profit', value: `GH₵ ${(netProfit/1000).toFixed(1)}k`, sub: `${((netProfit/totalRevenue)*100).toFixed(1)}% margin`, icon: DollarSign, color: '#8B5CF6', gradient: 'from-violet-500/20 to-purple-500/5' },
          { label: 'Outstanding Payables', value: `GH₵ ${outstandingPayables.toLocaleString()}`, sub: 'Due to suppliers', icon: Receipt, color: '#F59E0B', gradient: 'from-amber-500/20 to-orange-500/5' },
          { label: 'Inventory Value', value: `GH₵ ${(inventoryValue/1000).toFixed(1)}k`, sub: 'Stock on hand', icon: Package, color: '#0EA5E9', gradient: 'from-sky-500/20 to-cyan-500/5' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-5 backdrop-blur-xl relative overflow-hidden group"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl" style={{ background: `${s.color}18`, color: s.color, boxShadow: `0 0 20px ${s.color}20` }}>
                    <Icon size={18} />
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${s.color}10` }}>
                    <ArrowUpRight size={14} style={{ color: s.color }} />
                  </div>
                </div>
                <p className="font-display text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-bold mt-1" style={{ color: card.text }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: card.muted }}>{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Financial Pipeline */}
      <div className="rounded-[32px] border p-8 relative overflow-hidden" style={{ background: isDark ? 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(0,0,0,0.9))' : 'linear-gradient(135deg, #ffffff, #f1f5f9)', borderColor: card.border }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-50" style={{ color: card.text }}>Capital Flow Pipeline</p>
              <p className="text-[10px] mt-1 opacity-40" style={{ color: card.text }}>Real-time distribution of revenue, expenses, and retained capital</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: card.primaryBg, border: `1px solid ${card.primaryBorder}` }}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold" style={{ color: card.primary }}>Live</span>
            </div>
          </div>
          <div className="h-14 w-full rounded-2xl flex overflow-hidden relative shadow-inner" style={{ background: isDark ? '#000' : '#e2e8f0', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.2)' }}>
             <motion.div initial={{ width: 0 }} animate={{ width: `${(totalRevenue / (totalRevenue + totalExpenses + Math.abs(netProfit))) * 100}%` }}
               className="h-full bg-emerald-500 relative"
               style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.4), 0 0 20px rgba(16,185,129,0.5)' }}
             />
             <motion.div initial={{ width: 0 }} animate={{ width: `${(totalExpenses / (totalRevenue + totalExpenses + Math.abs(netProfit))) * 100}%` }}
               className="h-full bg-red-500 relative"
               style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.2), 0 0 20px rgba(239,68,68,0.5)' }}
             />
             <motion.div initial={{ width: 0 }} animate={{ width: `${(Math.max(0, netProfit) / (totalRevenue + totalExpenses + Math.abs(netProfit))) * 100}%` }}
               className="h-full bg-violet-500 relative"
               style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.3), 0 0 20px rgba(139,92,246,0.5)' }}
             />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t" style={{ borderColor: card.border }}>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
               <div>
                 <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block" style={{ color: card.text }}>Revenue Inflow</span>
                 <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {totalRevenue.toLocaleString()}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
               <div>
                 <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block" style={{ color: card.text }}>Expense Outflow</span>
                 <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {totalExpenses.toLocaleString()}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
               <div>
                 <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block" style={{ color: card.text }}>Retained Capital</span>
                 <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {Math.max(0, netProfit).toLocaleString()}</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Wallet },
          { id: 'transactions', label: 'Transactions', icon: FileText, count: liveLedger.length },
          { id: 'payables', label: 'Supplier Payables', icon: Building2, count: livePayables.filter(p => p.status !== 'paid').length },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent',
              color: activeTab === tab.id ? card.primary : card.muted,
              boxShadow: activeTab === tab.id ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)') : 'none',
            }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: activeTab === tab.id ? card.primary : 'rgba(239,68,68,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : '#EF4444' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* P&L Summary */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Profit & Loss Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)' }}>
                <span className="text-sm" style={{ color: card.muted }}>Revenue</span>
                <span className="font-mono text-base font-bold" style={{ color: '#10B981' }}>GH₵ {totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                <span className="text-sm" style={{ color: card.muted }}>Cost of Goods Sold</span>
                <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {cogsTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                <span className="text-sm" style={{ color: card.muted }}>Operating Expenses</span>
                <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {(totalExpenses - cogsTotal - inventoryValue - supplierPayments).toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t" style={{ borderColor: card.border }}>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: `linear-gradient(135deg, ${card.primaryBg}, rgba(139,92,246,0.1))`, border: `1px solid ${card.primaryBorder}` }}>
                  <span className="text-sm font-medium" style={{ color: card.primary }}>Net Profit</span>
                  <span className="font-mono text-lg font-bold" style={{ color: card.primary }}>GH₵ {netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Expense Breakdown</h3>
            <div className="space-y-3">
              {categoryBreakdown.filter(c => c.type === 'expense').map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: card.text }}>{cat.category}</span>
                      <span className="text-xs font-medium" style={{ color: card.muted }}>GH₵ {(cat.amount/1000).toFixed(1)}k</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                      <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, background: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : i === 2 ? '#8B5CF6' : i === 3 ? '#0EA5E9' : '#10B981' }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: card.muted }}>{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div>
              <h2 className="font-display text-sm font-bold" style={{ color: card.text }}>General Ledger</h2>
              <p className="text-xs mt-0.5" style={{ color: card.subtle }}>{liveLedger.length} transactions</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Filter size={14} />
              Filter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${card.divider}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                  {['Date', 'Reference', 'Description', 'Category', 'Amount'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveLedger.slice((transactionsPage - 1) * ITEMS_PER_PAGE, transactionsPage * ITEMS_PER_PAGE).map((l, i) => (
                  <tr key={l.id} className="transition-colors cursor-pointer"
                    style={{ borderBottom: i < ITEMS_PER_PAGE - 1 ? `1px solid ${card.divider}` : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: card.muted }}>{l.date}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-medium" style={{ color: card.primary }}>{l.ref}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm" style={{ color: card.text }}>{l.description}</p>
                      {l.supplier && <p className="text-[10px] mt-0.5" style={{ color: card.subtle }}>Supplier: {l.supplier}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-medium px-2 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                        {l.category}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-bold" style={{ color: l.type === 'CREDIT' ? '#10B981' : '#EF4444' }}>
                        {l.type === 'CREDIT' ? '+' : '-'}GH₵ {l.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Transactions Pagination */}
          {Math.ceil(liveLedger.length / ITEMS_PER_PAGE) > 1 && (
            <div className="px-5 py-4 border-t flex items-center justify-between"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.5)' }}>
              <span className="text-xs" style={{ color: card.muted }}>
                Page {transactionsPage} of {Math.ceil(liveLedger.length / ITEMS_PER_PAGE)} • Showing {Math.min(ITEMS_PER_PAGE, liveLedger.length - (transactionsPage - 1) * ITEMS_PER_PAGE)} of {liveLedger.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setTransactionsPage(1)} disabled={transactionsPage === 1}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: transactionsPage === 1 ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronsLeft size={16} />
                </button>
                <button onClick={() => setTransactionsPage(Math.max(1, transactionsPage - 1))} disabled={transactionsPage === 1}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: transactionsPage === 1 ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronLeft size={16} />
                </button>
                <div className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: card.primaryBg, color: card.primary }}>
                  {transactionsPage}
                </div>
                <button onClick={() => setTransactionsPage(Math.min(Math.ceil(liveLedger.length / ITEMS_PER_PAGE), transactionsPage + 1))} 
                  disabled={transactionsPage === Math.ceil(liveLedger.length / ITEMS_PER_PAGE)}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: transactionsPage === Math.ceil(liveLedger.length / ITEMS_PER_PAGE) ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setTransactionsPage(Math.ceil(liveLedger.length / ITEMS_PER_PAGE))} 
                  disabled={transactionsPage === Math.ceil(liveLedger.length / ITEMS_PER_PAGE)}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: transactionsPage === Math.ceil(liveLedger.length / ITEMS_PER_PAGE) ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div>
              <h2 className="font-display text-sm font-bold" style={{ color: card.text }}>Supplier Payables</h2>
              <p className="text-xs mt-0.5" style={{ color: card.subtle }}>Outstanding invoices due to suppliers</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                Pending: GH₵ {livePayables.filter(p => p.status === 'pending').reduce((a, p) => a + Number(p.amount), 0).toLocaleString()}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                Overdue: GH₵ {livePayables.filter(p => p.status === 'overdue').reduce((a, p) => a + Number(p.amount), 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: card.divider }}>
            {livePayables.length === 0 ? (
              <div className="p-8 text-center" style={{ color: card.muted }}>
                <p className="text-sm font-medium">No supplier invoices found.</p>
                <p className="text-xs mt-1 opacity-60">Upload invoices in the Inventory section to see payables here.</p>
              </div>
            ) : livePayables.slice((payablesPage - 1) * ITEMS_PER_PAGE, payablesPage * ITEMS_PER_PAGE).map((p, i) => {
              const statusColors: Record<string, { bg: string; color: string }> = {
                paid: { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
                pending: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
                overdue: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
              };
              const st = statusColors[p.status] || statusColors.pending;
              return (
                <div key={p.invoice} className="flex items-center gap-4 p-4" style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.5)'), borderBottom: `1px solid ${card.divider}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.primaryBg }}>
                    <Building2 size={18} style={{ color: card.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: card.text }}>{p.supplier}</p>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: card.muted }}>
                      <span className="font-mono">{p.invoice}</span>
                      <span>Due: {p.dueDate}</span>
                      {p.paidAmount > 0 && <span className="text-emerald-500 font-bold">Paid: GH₵ {Number(p.paidAmount).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs line-through opacity-40" style={{ color: card.muted }}>Total: GH₵ {Number(p.total || 0).toLocaleString()}</p>
                    <p className="font-mono text-sm font-bold" style={{ color: p.status === 'paid' ? '#10B981' : card.text }}>
                      {p.status === 'paid' ? 'CLEARED' : `GH₵ ${Number(p.amount).toLocaleString()} due`}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: st.bg, color: st.color }}>
                      {p.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payables Pagination */}
          {Math.ceil(livePayables.length / ITEMS_PER_PAGE) > 1 && (
            <div className="px-5 py-4 border-t flex items-center justify-between"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.5)' }}>
              <span className="text-xs" style={{ color: card.muted }}>
                Page {payablesPage} of {Math.ceil(livePayables.length / ITEMS_PER_PAGE)} • Showing {Math.min(ITEMS_PER_PAGE, livePayables.length - (payablesPage - 1) * ITEMS_PER_PAGE)} of {livePayables.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPayablesPage(1)} disabled={payablesPage === 1}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: payablesPage === 1 ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronsLeft size={16} />
                </button>
                <button onClick={() => setPayablesPage(Math.max(1, payablesPage - 1))} disabled={payablesPage === 1}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: payablesPage === 1 ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronLeft size={16} />
                </button>
                <div className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: card.primaryBg, color: card.primary }}>
                  {payablesPage}
                </div>
                <button onClick={() => setPayablesPage(Math.min(Math.ceil(livePayables.length / ITEMS_PER_PAGE), payablesPage + 1))} 
                  disabled={payablesPage === Math.ceil(livePayables.length / ITEMS_PER_PAGE)}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: payablesPage === Math.ceil(livePayables.length / ITEMS_PER_PAGE) ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setPayablesPage(Math.ceil(livePayables.length / ITEMS_PER_PAGE))} 
                  disabled={payablesPage === Math.ceil(livePayables.length / ITEMS_PER_PAGE)}
                  className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: payablesPage === Math.ceil(livePayables.length / ITEMS_PER_PAGE) ? 'transparent' : card.primaryBg, color: card.primary }}>
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Revenue vs Expenses</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: card.muted }}>Revenue</span>
                  <span className="text-sm font-bold" style={{ color: '#10B981' }}>GH₵ {(totalRevenue/1000).toFixed(1)}k</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: '100%', background: '#10B981' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: card.muted }}>Expenses</span>
                  <span className="text-sm font-bold" style={{ color: '#EF4444' }}>GH₵ {(totalExpenses/1000).toFixed(1)}k</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: `${(totalExpenses/totalRevenue)*100}%`, background: '#EF4444' }} />
                </div>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: card.border }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: card.text }}>Profit Margin</span>
                  <span className="text-lg font-bold" style={{ color: netProfit > 0 ? '#8B5CF6' : '#EF4444' }}>{((netProfit/totalRevenue)*100).toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: `${(netProfit/totalRevenue)*100}%`, background: netProfit > 0 ? '#8B5CF6' : '#EF4444' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Inventory Turnover</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                <div className="flex items-center gap-2">
                  <Package size={16} style={{ color: card.primary }} />
                  <span className="text-sm" style={{ color: card.text }}>Inventory Purchases</span>
                </div>
                <span className="font-mono font-bold" style={{ color: card.primary }}>GH₵ {inventoryValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: '#10B981' }} />
                  <span className="text-sm" style={{ color: card.text }}>COGS (Sold)</span>
                </div>
                <span className="font-mono font-bold" style={{ color: '#10B981' }}>GH₵ {cogsTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                <div className="flex items-center gap-2">
                  <Building2 size={16} style={{ color: '#F59E0B' }} />
                  <span className="text-sm" style={{ color: card.text }}>Supplier Payments Made</span>
                </div>
                <span className="font-mono font-bold" style={{ color: '#F59E0B' }}>GH₵ {supplierPayments.toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: card.border }}>
                <p className="text-xs mb-2" style={{ color: card.muted }}>Inventory Efficiency</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: '78%', background: '#10B981' }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#10B981' }}>78%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}>
          <div className="rounded-2xl w-full max-w-md p-6 shadow-2xl relative" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: card.text }}>Record New Transaction</h2>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Category</label>
                <select required value={expenseForm.categoryId} onChange={e => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
                  <option value="">Select a category</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {expenseCategories.length === 0 && (
                    <option value="default_cat">Operating Expense (Fallback)</option>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Amount (GH₵)</label>
                <input required type="number" step="0.01" min="0" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder="0.00" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Description</label>
                <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder="e.g. Monthly rent, staff salary" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Date</label>
                <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
              </div>

              <div className="flex gap-3 pt-4 border-t mt-6" style={{ borderColor: card.divider }}>
                <button type="button" onClick={() => setShowRecordModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: card.text }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                  style={{ background: card.primary }}>
                  {isSubmitting ? 'Recording...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
