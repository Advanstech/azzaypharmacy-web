'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, 
  Plus, Filter, Receipt, ShoppingCart, Package, FileText, Wallet, Building2,
  BarChart3, PieChart, Download, Calendar, ChevronDown, ChevronRight, ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// Comprehensive Ledger with inventory and supplier integration
const LEDGER = [
  // May 2026
  { id: 'TXN-2026-0052', date: '2026-05-03', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 2845.00, description: 'Daily POS Sales — Branch A', ref: 'POS-284758', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0051', date: '2026-05-03', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 1422.50, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284758' },
  { id: 'TXN-2026-0050', date: '2026-05-03', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 1890.00, description: 'Daily POS Sales — Branch A', ref: 'POS-284757', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0049', date: '2026-05-03', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 945.00, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284757' },
  { id: 'TXN-2026-0048', date: '2026-05-03', type: 'DEBIT', account: 'SALARIES', category: 'Staff Costs', amount: 1200.00, description: 'Staff Salaries — 1st Week May', ref: 'PAY-2026-W1' },
  { id: 'TXN-2026-0047', date: '2026-05-02', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 2156.00, description: 'Daily POS Sales — Branch A', ref: 'POS-284756', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0046', date: '2026-05-02', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 1078.00, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284756' },
  { id: 'TXN-2026-0045', date: '2026-05-02', type: 'DEBIT', account: 'ACCOUNTS_PAYABLE', category: 'Supplier Payment', amount: 1160.00, description: 'Invoice Payment — Danadams Pharmaceuticals (INV-DAN-2026-089)', ref: 'PAY-DAN-089', supplier: 'Danadams Pharmaceuticals' },
  { id: 'TXN-2026-0044', date: '2026-05-02', type: 'DEBIT', account: 'INVENTORY', category: 'Inventory Purchase', amount: 1160.00, description: 'Stock Receipt — Ceftriaxone & Cefuroxime', ref: 'PO-2026-045', supplier: 'Danadams Pharmaceuticals' },
  { id: 'TXN-2026-0043', date: '2026-05-01', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 1987.50, description: 'Daily POS Sales — Branch A', ref: 'POS-284755', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0042', date: '2026-05-01', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 993.75, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284755' },
  { id: 'TXN-2026-0041', date: '2026-05-01', type: 'DEBIT', account: 'ACCOUNTS_PAYABLE', category: 'Supplier Payment', amount: 4500.00, description: 'Invoice Payment — Ernest Chemists (INV-ERN-2026-056)', ref: 'PAY-ERN-056', supplier: 'Ernest Chemists Ltd' },
  { id: 'TXN-2026-0040', date: '2026-05-01', type: 'DEBIT', account: 'UTILITIES', category: 'Operating Expenses', amount: 450.00, description: 'Electricity & Water — May Bill', ref: 'UTIL-2026-05' },
  // April 2026
  { id: 'TXN-2026-0039', date: '2026-04-30', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 3245.00, description: 'Daily POS Sales — Branch A', ref: 'POS-284754', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0038', date: '2026-04-30', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 1622.50, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284754' },
  { id: 'TXN-2026-0037', date: '2026-04-30', type: 'DEBIT', account: 'ACCOUNTS_PAYABLE', category: 'Supplier Payment', amount: 2100.00, description: 'Invoice Payment — MedSupply Ghana (INV-MS-2026-023)', ref: 'PAY-MS-023', supplier: 'MedSupply Ghana Ltd' },
  { id: 'TXN-2026-0036', date: '2026-04-29', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 2780.00, description: 'Daily POS Sales — Branch A', ref: 'POS-284753', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0035', date: '2026-04-29', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 1390.00, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284753' },
  { id: 'TXN-2026-0034', date: '2026-04-28', type: 'DEBIT', account: 'INVENTORY', category: 'Inventory Purchase', amount: 1110.00, description: 'Stock Receipt — Amovulin & Benzyl Penicillin', ref: 'PO-2026-043', supplier: 'Bedither Pharmaceuticals' },
  { id: 'TXN-2026-0033', date: '2026-04-28', type: 'DEBIT', account: 'ACCOUNTS_PAYABLE', category: 'Supplier Payment', amount: 800.00, description: 'Invoice Payment — OA&J Pharmaceuticals (INV-OAJ-2026-045)', ref: 'PAY-OAJ-045', supplier: 'OA&J Pharmaceuticals' },
  { id: 'TXN-2026-0032', date: '2026-04-28', type: 'DEBIT', account: 'INVENTORY', category: 'Inventory Purchase', amount: 800.00, description: 'Stock Receipt — Flucoron & Novacip', ref: 'PO-2026-044', supplier: 'OA&J Pharmaceuticals' },
  { id: 'TXN-2026-0031', date: '2026-04-28', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 2456.50, description: 'Daily POS Sales — Branch A', ref: 'POS-284752', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0030', date: '2026-04-28', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 1228.25, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284752' },
  { id: 'TXN-2026-0029', date: '2026-04-27', type: 'DEBIT', account: 'SALARIES', category: 'Staff Costs', amount: 4800.00, description: 'Monthly Staff Salaries — April', ref: 'PAY-2026-04' },
  { id: 'TXN-2026-0028', date: '2026-04-27', type: 'CREDIT', account: 'SALES_REVENUE', category: 'Pharmacy Sales', amount: 3120.00, description: 'Daily POS Sales — Branch A', ref: 'POS-284751', paymentMethod: 'Cash/Momo' },
  { id: 'TXN-2026-0027', date: '2026-04-27', type: 'DEBIT', account: 'COGS', category: 'Cost of Goods', amount: 1560.00, description: 'Inventory Cost — Sales Deduction', ref: 'COGS-284751' },
  { id: 'TXN-2026-0026', date: '2026-04-25', type: 'DEBIT', account: 'RENT', category: 'Operating Expenses', amount: 3500.00, description: 'Monthly Rent — Dormaa Central', ref: 'RENT-2026-04' },
  { id: 'TXN-2026-0025', date: '2026-04-15', type: 'DEBIT', account: 'INVENTORY', category: 'Inventory Purchase', amount: 3100.00, description: 'Stock Receipt — Atorvastatin & Methyldopa', ref: 'PO-2026-039', supplier: 'Ernest Chemists Ltd' },
];

const SUPPLIER_PAYABLES = [
  { supplier: 'Danadams Pharmaceuticals', invoice: 'INV-DAN-2026-089', amount: 0, status: 'paid', dueDate: '2026-05-09', paidDate: '2026-05-02' },
  { supplier: 'Bedither Pharmaceuticals', invoice: 'INV-BED-2026-112', amount: 1110.00, status: 'pending', dueDate: '2026-05-28' },
  { supplier: 'OA&J Pharmaceuticals', invoice: 'INV-OAJ-2026-045', amount: 0, status: 'paid', dueDate: '2026-05-31', paidDate: '2026-04-28' },
  { supplier: 'ADD Pharma Limited', invoice: 'INV-ADD-2026-089', amount: 1830.00, status: 'overdue', dueDate: '2026-05-09' },
  { supplier: 'Ernest Chemists Ltd', invoice: 'INV-ERN-2026-056', amount: 0, status: 'paid', dueDate: '2026-05-15', paidDate: '2026-05-01' },
];

const CATEGORY_BREAKDOWN = [
  { category: 'Pharmacy Sales', amount: 19575.00, type: 'income', percentage: 100 },
  { category: 'Cost of Goods', amount: 9787.50, type: 'expense', percentage: 50 },
  { category: 'Staff Salaries', amount: 6000.00, type: 'expense', percentage: 30.6 },
  { category: 'Supplier Payments', amount: 10360.00, type: 'expense', percentage: 52.9 },
  { category: 'Rent & Utilities', amount: 3950.00, type: 'expense', percentage: 20.2 },
  { category: 'Inventory Purchases', amount: 6170.00, type: 'expense', percentage: 31.5 },
];

export default function FinancialsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const { user } = useAuth();
  const { sales, products, ledger, purchases, expenses, expenseCategories, createExpense, refetchLedger, me } = useStore();

  useEffect(() => {
    refetchLedger();
  }, [refetchLedger]);

  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'ACCOUNTANT'].includes(role || '');

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payables' | 'analytics'>('overview');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const liveLedger = useMemo(() => {
    const baseLedger = ledger.length > 0 ? ledger : LEDGER;
    const combined = [...baseLedger];
    
    // Inject real expenses from the API if they exist
    if (expenses && expenses.length > 0) {
      expenses.forEach(exp => {
        // Only add if not already present by reference
        if (!combined.some(l => l.ref === exp.id || l.id === exp.id)) {
          combined.push({
            id: exp.id,
            date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date(exp.createdAt || Date.now()).toISOString().split('T')[0],
            type: 'DEBIT',
            account: 'EXPENSE', // Or appropriate mapping
            category: exp.category?.name || 'Operating Expense',
            amount: exp.amount,
            description: exp.description,
            ref: exp.id,
          });
        }
      });
    }

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, expenses]);

  const livePayables = useMemo(() => {
    return purchases.length > 0 ? purchases.map(p => ({
      supplier: p.supplier?.name || 'Unknown',
      invoice: p.invoiceNo || p.id.slice(-8),
      amount: p.total,
      status: p.status === 'RECEIVED' ? 'paid' : (new Date(p.createdAt || Date.now()).getTime() + 14 * 86400000 < Date.now() ? 'overdue' : 'pending'),
      dueDate: new Date(new Date(p.createdAt || Date.now()).getTime() + 14 * 86400000).toLocaleDateString(),
    })) : SUPPLIER_PAYABLES;
  }, [purchases]);

  const totalRevenue = useMemo(() => liveLedger.filter(l => l.type === 'CREDIT').reduce((a, l) => a + l.amount, 0), [liveLedger]);
  const totalExpenses = useMemo(() => liveLedger.filter(l => l.type === 'DEBIT').reduce((a, l) => a + l.amount, 0), [liveLedger]);
  const netProfit = totalRevenue - totalExpenses;
  const cogsTotal = useMemo(() => liveLedger.filter(l => l.account === 'COGS').reduce((a, l) => a + l.amount, 0), [liveLedger]);
  const supplierPayments = LEDGER.filter(l => l.account === 'ACCOUNTS_PAYABLE').reduce((a, l) => a + l.amount, 0);
  const inventoryValue = useMemo(() => products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stockQuantity || 0), 0), [products]);
  const outstandingPayables = useMemo(() => livePayables.filter(p => p.status !== 'paid').reduce((a, p) => a + p.amount, 0), [livePayables]);

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
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t" style={{ borderColor: card.border }}>
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
              {CATEGORY_BREAKDOWN.filter(c => c.type === 'expense').map((cat, i) => (
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
                {liveLedger.slice(0, 20).map((l, i) => (
                  <tr key={l.id} className="transition-colors cursor-pointer"
                    style={{ borderBottom: i < 14 ? `1px solid ${card.divider}` : 'none' }}
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
                Pending: GH₵ {livePayables.filter(p => p.status === 'pending').reduce((a, p) => a + p.amount, 0).toLocaleString()}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                Overdue: GH₵ {livePayables.filter(p => p.status === 'overdue').reduce((a, p) => a + p.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: card.divider }}>
            {livePayables.map((p, i) => {
              const statusColors: Record<string, { bg: string; color: string }> = {
                paid: { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
                pending: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
                overdue: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
              };
              const st = statusColors[p.status];
              return (
                <div key={p.invoice} className="flex items-center gap-4 p-4" style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.5)') }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.primaryBg }}>
                    <Building2 size={18} style={{ color: card.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: card.text }}>{p.supplier}</p>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: card.muted }}>
                      <span className="font-mono">{p.invoice}</span>
                      <span>Due: {p.dueDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold" style={{ color: card.text }}>GH₵ {p.amount.toLocaleString()}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: st.bg, color: st.color }}>
                      {p.status}
                    </span>
                  </div>
                  {p.status !== 'paid' && (
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
                      Pay
                    </button>
                  )}
                </div>
              );
            })}
          </div>
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
                  <span className="text-sm" style={{ color: card.text }}>Supplier Payments</span>
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
