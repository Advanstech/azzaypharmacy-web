'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, 
  Plus, Receipt, ShoppingCart, Package, FileText, Wallet, Building2, Target,
  BarChart3, PieChart, Download, Calendar, ChevronDown, ChevronRight, ShieldAlert,
  ChevronLeft, ChevronsLeft, ChevronsRight, Printer, X, Trash2
} from 'lucide-react';
import { useCustomAuth } from '@/lib/custom-auth';
import { useBranch } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';
import { AreaChart, BarChart, DonutChart, SparkLine, GroupedBarChart } from '@/components/financial-charts';
import { useToast } from '@/components/pharma-toast';

// No hardcoded data — all figures come from the live store

export default function FinancialsPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { user } = useCustomAuth();
  const { activeBranchId } = useBranch();
  const { addToast } = useToast();
  const { sales, products, ledger, purchases, invoices, expenses, expenseCategories, createExpense, recordSupplierPayment, refetchLedger, refetchInvoices, refetchSales, refetchProducts, refetchExpenses, refetchFinancialSummary, financialSummary, loadingFinancialSummary, refetchBudgets, refetchBudgetVsActual, budgets, budgetVsActual, loadingBudgetVsActual, createBudget, deleteBudget, me } = useStore();

  const role = user?.role || user?.user_metadata?.role || me?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'ACCOUNTANT'].includes(role || '');
  const isGlobal = ['ROOT', 'SE_ADMIN', 'OWNER', 'DEVELOPER'].includes(role || '');

  // Date range filter
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payables' | 'budgets' | 'analytics'>('overview');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'OPERATING', amount: '', period: 'MONTHLY' as const, startDate: '', endDate: '', notes: '' });
  
  // Supplier payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  
  // Pagination states
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [payablesPage, setPayablesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const rangeBounds = useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case '30d': start.setDate(start.getDate() - 30); break;
      case '90d': start.setDate(start.getDate() - 90); break;
      case '1y': start.setFullYear(start.getFullYear() - 1); break;
      case 'custom': return { start: new Date(customFrom + 'T00:00:00'), end: new Date(customTo + 'T23:59:59') };
    }
    return { start, end };
  }, [dateRange, customFrom, customTo]);

  const inRange = useCallback((dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d >= rangeBounds.start && d <= rangeBounds.end;
  }, [rangeBounds]);

  useEffect(() => {
    if (ledger.length === 0) refetchLedger();
    if (invoices.length === 0) refetchInvoices();
    if (sales.length === 0) refetchSales(activeBranchId || undefined, rangeBounds.start.toISOString(), rangeBounds.end.toISOString());
    if (products.length === 0) refetchProducts();
    if (expenses.length === 0) refetchExpenses();
    refetchFinancialSummary(activeBranchId || undefined, rangeBounds.start.toISOString(), rangeBounds.end.toISOString());
    refetchBudgets(activeBranchId || undefined);
    refetchBudgetVsActual(activeBranchId || undefined, rangeBounds.start.toISOString(), rangeBounds.end.toISOString());
  }, [refetchLedger, refetchInvoices, refetchSales, refetchProducts, refetchExpenses, refetchFinancialSummary, refetchBudgets, refetchBudgetVsActual, ledger.length, invoices.length, sales.length, products.length, expenses.length, activeBranchId, rangeBounds.start, rangeBounds.end]);

  const deriveCategory = (entry: any): string => {
    if (entry.category) return entry.category;
    if (entry.account === 'SALES_REVENUE' || entry.account === 'REVENUE') return 'Sales Revenue';
    if (entry.account === 'EXPENSE') return 'Operating Expense';
    if (entry.account === 'COGS') return 'Cost of Goods Sold';
    if (entry.account === 'LIABILITY') return entry.type === 'DEBIT' ? 'Supplier Payment' : 'Accounts Payable';
    if (entry.account === 'ASSET') return 'Asset';
    if (entry.description?.includes('Supplier')) return 'Supplier Payment';
    if (entry.description?.includes('Sale')) return 'Pharmacy Sales';
    return 'General Ledger';
  };

  const liveLedger = useMemo(() => {
    const entries: any[] = [...ledger];

    // Inject sales as CREDIT entries if ledger is sparse
    if (sales && sales.length > 0 && ledger.length === 0) {
      sales.filter(s => inRange(s.createdAt)).forEach(sale => {
        entries.push({
          id: `SALE-${sale.id}`,
          date: new Date(sale.createdAt).toISOString().split('T')[0],
          type: 'CREDIT',
          account: 'SALES_REVENUE',
          category: 'Pharmacy Sales',
          amount: sale.totalAmount,
          description: sale.paymentMethod === 'SPLIT'
            ? `POS Sale — CASH: GH₵ ${(sale.cashAmount || 0).toFixed(2)}, MOMO: GH₵ ${(sale.momoAmount || 0).toFixed(2)}`
            : `POS Sale — ${sale.paymentMethod}`,
          ref: sale.id.slice(-8).toUpperCase(),
        });
      });
    }

    // Inject real expenses
    if (expenses && expenses.length > 0) {
      expenses.filter(e => e.status === 'APPROVED' && inRange(e.date || e.createdAt)).forEach(exp => {
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
          inv.payments.filter(p => p.paidAt && inRange(p.paidAt)).forEach(pmt => {
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
        // Inject the original purchase liability (CREDIT = we owe) within range
        const liabilityId = `LIA-${inv.id}`;
        if (!entries.some(l => l.id === liabilityId) && inRange(inv.issueDate)) {
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

    return entries
      .filter(e => inRange(e.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, expenses, sales, invoices, inRange]);

  // Live payables from real invoices (all time, not range-bound)
  const livePayables = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    return invoices.map(inv => ({
      id: inv.id,
      supplier: inv.supplier?.name || 'Unknown Supplier',
      invoice: inv.invoiceNo,
      amount: inv.balance,
      total: inv.total,
      paidAmount: inv.paidAmount,
      payments: inv.payments || [],
      status: inv.paymentStatus === 'PAID' ? 'paid' : (inv.dueDate && new Date(inv.dueDate) < new Date() ? 'overdue' : 'pending'),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'No due date',
      issueDate: new Date(inv.issueDate).toLocaleDateString(),
    }));
  }, [invoices]);

  const totalRevenue = useMemo(() => financialSummary?.totalRevenue ?? liveLedger.filter(l => l.type === 'CREDIT' && l.account === 'SALES_REVENUE').reduce((a, l) => a + Number(l.amount), 0), [financialSummary, liveLedger]);
  const totalExpenses = useMemo(() => financialSummary?.totalExpenses ?? liveLedger.filter(l => l.type === 'DEBIT' && l.account !== 'LIABILITY').reduce((a, l) => a + Number(l.amount), 0), [financialSummary, liveLedger]);
  const netProfit = financialSummary?.netProfit ?? (totalRevenue - totalExpenses);
  const cogsTotal = useMemo(() => financialSummary?.cogs ?? liveLedger.filter(l => l.account === 'COGS').reduce((a, l) => a + Number(l.amount), 0), [financialSummary, liveLedger]);
  const supplierPayments = useMemo(() => financialSummary?.supplierPayments ?? liveLedger.filter(l => l.type === 'DEBIT' && l.account === 'LIABILITY').reduce((a, l) => a + Number(l.amount), 0), [financialSummary, liveLedger]);
  const inventoryValue = useMemo(() => financialSummary?.inventoryValue ?? products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stockQuantity || 0), 0), [financialSummary, products]);
  const outstandingPayables = useMemo(() => financialSummary?.outstandingPayables ?? invoices.reduce((a, inv) => a + Number(inv.balance || 0), 0), [financialSummary, invoices]);

  const expenseCategoryData = useMemo(() => {
    if (financialSummary?.expenseCategories?.length) return financialSummary.expenseCategories;
    const map = new Map<string, number>();
    expenses.filter(e => e.status === 'APPROVED' && inRange(e.date || e.createdAt)).forEach(e => {
      const key = e.category?.name || 'Uncategorized';
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [financialSummary, expenses, inRange]);

  const timeSeriesData = useMemo(() => {
    if (financialSummary?.timeSeries?.length) return financialSummary.timeSeries;
    const days = Math.max(1, Math.round((rangeBounds.end.getTime() - rangeBounds.start.getTime()) / (1000 * 60 * 60 * 24)));
    const useWeekly = days > 35 && days <= 180;
    const useMonthly = days > 180;

    const bucketKey = (d: Date) => {
      if (useMonthly) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (useWeekly) {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        return `Week ${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
      }
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const revenueMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    sales.filter(s => inRange(s.createdAt)).forEach(s => {
      const key = bucketKey(new Date(s.createdAt));
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(s.totalAmount || 0));
    });
    expenses.filter(e => e.status === 'APPROVED' && inRange(e.date || e.createdAt)).forEach(e => {
      const key = bucketKey(new Date(e.date || e.createdAt));
      expenseMap.set(key, (expenseMap.get(key) || 0) + Number(e.amount || 0));
    });

    // Ensure buckets exist for every interval in range
    const labels: string[] = [];
    const cur = new Date(rangeBounds.start);
    while (cur <= rangeBounds.end) {
      labels.push(bucketKey(cur));
      if (useMonthly) cur.setMonth(cur.getMonth() + 1);
      else cur.setDate(cur.getDate() + (useWeekly ? 7 : 1));
    }

    return labels.map(label => ({
      label,
      revenue: revenueMap.get(label) || 0,
      expenses: expenseMap.get(label) || 0,
      profit: (revenueMap.get(label) || 0) - (expenseMap.get(label) || 0),
    }));
  }, [sales, expenses, rangeBounds, inRange]);

  const revenueSeries = useMemo(() => [
    { key: 'revenue', name: 'Revenue', color: '#10B981', data: timeSeriesData.map(d => ({ label: d.label, value: d.revenue })) },
    { key: 'expenses', name: 'Expenses', color: '#EF4444', data: timeSeriesData.map(d => ({ label: d.label, value: d.expenses })) },
  ], [timeSeriesData]);

  const profitSeries = useMemo(() => [
    { key: 'profit', name: 'Net Profit', color: '#8B5CF6', data: timeSeriesData.map(d => ({ label: d.label, value: d.profit })) },
  ], [timeSeriesData]);

  const payablesAging = useMemo(() => {
    if (financialSummary?.payablesAging?.length) return financialSummary.payablesAging.map(b => ({ ...b, maxDays: 0 }));
    const now = new Date();
    const buckets = [
      { label: 'Current', value: 0, maxDays: 0 },
      { label: '1-30 days', value: 0, maxDays: 30 },
      { label: '31-60 days', value: 0, maxDays: 60 },
      { label: '61-90 days', value: 0, maxDays: 90 },
      { label: '90+ days', value: 0, maxDays: Infinity },
    ];
    invoices.filter(inv => inv.paymentStatus !== 'PAID' && Number(inv.balance || 0) > 0).forEach(inv => {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate);
      const days = Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      if (days <= 0) buckets[0].value += Number(inv.balance || 0);
      else if (days <= 30) buckets[1].value += Number(inv.balance || 0);
      else if (days <= 60) buckets[2].value += Number(inv.balance || 0);
      else if (days <= 90) buckets[3].value += Number(inv.balance || 0);
      else buckets[4].value += Number(inv.balance || 0);
    });
    return buckets;
  }, [invoices]);

  const categoryBreakdown = useMemo(() => {
    const totalInvoiceValue = invoices.filter(inv => inRange(inv.issueDate)).reduce((a, inv) => a + Number(inv.total || 0), 0);
    const approvedExpenses = expenses.filter(e => e.status === 'APPROVED' && inRange(e.date || e.createdAt));
    const totalExpenseAmt = approvedExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    const maxAmt = Math.max(totalRevenue, totalInvoiceValue, cogsTotal, totalExpenseAmt, 1);
    return [
      { category: 'Pharmacy Sales', amount: totalRevenue, type: 'income' as const, percentage: Math.round((totalRevenue / maxAmt) * 100) },
      { category: 'Cost of Goods', amount: cogsTotal, type: 'expense' as const, percentage: Math.round((cogsTotal / maxAmt) * 100) },
      { category: 'Supplier Invoices', amount: totalInvoiceValue, type: 'expense' as const, percentage: Math.round((totalInvoiceValue / maxAmt) * 100) },
      { category: 'Supplier Payments', amount: supplierPayments, type: 'expense' as const, percentage: Math.round((supplierPayments / maxAmt) * 100) },
      { category: 'Operating Expenses', amount: totalExpenseAmt, type: 'expense' as const, percentage: Math.round((totalExpenseAmt / maxAmt) * 100) },
    ];
  }, [totalRevenue, cogsTotal, invoices, supplierPayments, expenses, inRange]);

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

  const escapeCsv = (value: any) => {
    const str = String(value ?? '').replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const handleExport = () => {
    const rangeLabel = dateRange === 'custom' ? `${customFrom}_to_${customTo}` : dateRange;
    const timestamp = new Date().toISOString().split('T')[0];
    
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
      } catch (e) {
        return dateStr;
      }
    };

    let csvContent = '\uFEFF'; // BOM for Excel
    csvContent += `AZZAY PHARMACY - EXECUTIVE FINANCIAL REPORT\n`;
    csvContent += `Generated:,${formatDate(new Date().toISOString())}\n`;
    csvContent += `Period:,${rangeLabel.toUpperCase()}\n`;
    csvContent += `Branch:,${activeBranchId ? activeBranchId : 'All Branches'}\n\n`;

    // 1. FINANCIAL SUMMARY (At the top for executives)
    csvContent += `--- FINANCIAL SUMMARY ---\n`;
    csvContent += `Metric,Amount (GH₵)\n`;
    csvContent += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
    csvContent += `Total Expenses,${totalExpenses.toFixed(2)}\n`;
    csvContent += `Net Profit,${netProfit.toFixed(2)}\n`;
    csvContent += `Outstanding Payables,${outstandingPayables.toFixed(2)}\n`;
    csvContent += `Inventory Value,${inventoryValue.toFixed(2)}\n\n`;

    // 2. SUPPLIER PAYABLES (Important liabilities)
    csvContent += `--- OUTSTANDING SUPPLIER PAYABLES ---\n`;
    csvContent += `Supplier,Invoice No.,Total Amount,Amount Paid,Balance Due,Status,Due Date\n`;
    if (livePayables.length === 0) {
      csvContent += `No outstanding payables for this period.\n`;
    } else {
      livePayables.forEach(p => {
        csvContent += `${escapeCsv(p.supplier)},${escapeCsv(p.invoice)},${Number(p.total).toFixed(2)},${Number(p.paidAmount).toFixed(2)},${Number(p.amount).toFixed(2)},${escapeCsv(p.status)},${escapeCsv(p.dueDate ? formatDate(p.dueDate).split(' ')[0] : 'N/A')}\n`;
      });
    }
    csvContent += `\n`;

    // 3. LEDGER TRANSACTIONS (Detailed trail)
    csvContent += `--- DETAILED GENERAL LEDGER ---\n`;
    csvContent += `Date,Reference,Category,Type,Amount (GH₵),Description\n`;
    if (liveLedger.length === 0) {
      csvContent += `No transactions found for this period.\n`;
    } else {
      liveLedger.forEach(l => {
        const cat = l.category || (l.account === 'REVENUE' || l.account === 'SALES_REVENUE' ? 'Sales Revenue' : l.account);
        csvContent += `${escapeCsv(formatDate(l.date))},${escapeCsv(l.ref || l.id)},${escapeCsv(cat)},${escapeCsv(l.type)},${Number(l.amount).toFixed(2)},${escapeCsv(l.description)}\n`;
      });
    }
    csvContent += `\n*** END OF REPORT ***\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Azzay_Financial_Report_${rangeLabel}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.amount) return;
    setIsSubmitting(true);
    try {
      const amount = parseFloat(expenseForm.amount);
      await createExpense({
        categoryId: expenseForm.categoryId,
        amount,
        description: expenseForm.description,
        date: expenseForm.date,
      });
      addToast({ type: 'success', title: 'Expense Recorded', message: `GH₵ ${amount.toFixed(2)} expense recorded successfully.`, duration: 4000 });
      setShowRecordModal(false);
      setExpenseForm({ categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Expense Failed', message: err?.message || 'Could not record expense.', duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = (payable: any) => {
    setSelectedPayable(payable);
    setPaymentAmount(String(payable.amount || 0));
    setPaymentMethod('CASH');
    setPaymentReference(`PAY-${Date.now()}`);
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > Number(selectedPayable.amount || 0)) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Payment amount must be greater than zero and not exceed the outstanding balance.', duration: 5000 });
      return;
    }
    setIsPaying(true);
    try {
      await recordSupplierPayment(selectedPayable.id, amount, paymentMethod, paymentReference || undefined, paymentNote || undefined);
      addToast({ type: 'success', title: 'Payment Recorded', message: `GH₵ ${amount.toFixed(2)} paid to ${selectedPayable.supplier}.`, duration: 4000 });
      setShowPaymentModal(false);
      setSelectedPayable(null);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNote('');
      await refetchInvoices();
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Payment Failed', message: err?.message || 'Could not record supplier payment.', duration: 5000 });
    } finally {
      setIsPaying(false);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.amount || !budgetForm.startDate || !budgetForm.endDate) return;
    setIsSubmitting(true);
    try {
      const amount = parseFloat(budgetForm.amount);
      await createBudget({
        category: budgetForm.category,
        amount,
        period: budgetForm.period,
        startDate: budgetForm.startDate,
        endDate: budgetForm.endDate,
        notes: budgetForm.notes,
      });
      addToast({ type: 'success', title: 'Budget Created', message: `GH₵ ${amount.toFixed(2)} ${budgetForm.category} budget created.`, duration: 4000 });
      setShowBudgetModal(false);
      setBudgetForm({ category: 'OPERATING', amount: '', period: 'MONTHLY', startDate: '', endDate: '', notes: '' });
      await refetchBudgets(activeBranchId || undefined);
      await refetchBudgetVsActual(activeBranchId || undefined, rangeBounds.start.toISOString(), rangeBounds.end.toISOString());
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Budget Failed', message: err?.message || 'Could not create budget.', duration: 5000 });
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
      <div className="print:hidden"><BranchBanner /></div>
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-black">Azzay Pharmacy — Financial Report</h1>
        <p className="text-sm">Period: {dateRange === 'custom' ? `${customFrom} to ${customTo}` : dateRange}</p>
        <p className="text-sm">Branch: {activeBranchId ? activeBranchId : 'All Branches'}</p>
        <p className="text-sm">Generated: {new Date().toLocaleString()}</p>
      </div>
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: card.text }}>Financial Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>Accounting, supplier payables, and profit analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
            {(['today', '7d', '30d', '90d', '1y'] as const).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: dateRange === r ? (isDark ? 'rgba(0,217,255,0.15)' : '#fff') : 'transparent',
                  color: dateRange === r ? card.primary : card.muted,
                  boxShadow: dateRange === r ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)') : 'none',
                }}>
                {r === 'today' ? 'Today' : r === '7d' ? '7D' : r === '30d' ? '30D' : r === '90d' ? '90D' : '1Y'}
              </button>
            ))}
            <button onClick={() => setDateRange(dateRange === 'custom' ? '30d' : 'custom')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              style={{
                background: dateRange === 'custom' ? (isDark ? 'rgba(0,217,255,0.15)' : '#fff') : 'transparent',
                color: dateRange === 'custom' ? card.primary : card.muted,
                boxShadow: dateRange === 'custom' ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)') : 'none',
              }}>
              <Calendar size={12} />
              Custom
            </button>
          </div>
          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium outline-none"
                style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }} />
              <span style={{ color: card.muted }}>—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium outline-none"
                style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: isDark ? 'rgba(15,23,42,0.6)' : '#fff', color: card.text, border: `1px solid ${card.border}` }}>
              <Printer size={16} />
              Print
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Download size={16} />
              Export CSV
            </button>
            <button onClick={() => setShowRecordModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{
                background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                color: isDark ? '#0A0E1A' : '#fff',
                boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
              }}>
              <Plus size={18} />
              Record Expense
            </button>
          </div>
        </div>
      </div>

      {/* 3D KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `GH₵ ${(totalRevenue/1000).toFixed(1)}k`, sub: `${dateRange === 'today' ? 'Today' : dateRange === 'custom' ? 'Selected' : dateRange.toUpperCase()} sales`, icon: TrendingUp, color: '#10B981', gradient: 'from-emerald-500/20 to-teal-500/5' },
          { label: 'Net Profit', value: `GH₵ ${(netProfit/1000).toFixed(1)}k`, sub: `${totalRevenue ? ((netProfit/totalRevenue)*100).toFixed(1) : 0}% margin`, icon: DollarSign, color: '#8B5CF6', gradient: 'from-violet-500/20 to-purple-500/5' },
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
          {(() => {
            const total = totalRevenue + totalExpenses + Math.abs(netProfit) || 1;
            return (
              <div className="h-14 w-full rounded-2xl flex overflow-hidden relative shadow-inner" style={{ background: isDark ? '#000' : '#e2e8f0', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.2)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(totalRevenue / total) * 100}%` }}
                  className="h-full bg-emerald-500 relative"
                  style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.4), 0 0 20px rgba(16,185,129,0.5)' }}
                />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(totalExpenses / total) * 100}%` }}
                  className="h-full bg-red-500 relative"
                  style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.2), 0 0 20px rgba(239,68,68,0.5)' }}
                />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(Math.max(0, netProfit) / total) * 100}%` }}
                  className="h-full bg-violet-500 relative"
                  style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.3), 0 0 20px rgba(139,92,246,0.5)' }}
                />
              </div>
            );
          })()}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t" style={{ borderColor: card.border }}>
             {[
               { label: 'Revenue Inflow', value: totalRevenue, icon: ArrowUpRight, color: '#10B981' },
               { label: 'Expense Outflow', value: totalExpenses, icon: ArrowDownRight, color: '#EF4444' },
               { label: 'Retained Capital', value: Math.max(0, netProfit), icon: Wallet, color: '#8B5CF6' },
             ].map(k => (
               <div key={k.label} className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15`, color: k.color }}>
                   <k.icon size={18} />
                 </div>
                 <div>
                   <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block" style={{ color: card.text }}>{k.label}</span>
                   <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {k.value.toLocaleString()}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl print:hidden" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Wallet },
          { id: 'transactions', label: 'Transactions', icon: FileText, count: liveLedger.length },
          { id: 'payables', label: 'Supplier Payables', icon: Building2, count: livePayables.filter(p => p.status !== 'paid').length },
          { id: 'budgets', label: 'Budgets', icon: Target, count: budgets.length },
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* P&L Summary */}
            <div className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Profit & Loss Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)' }}>
                  <span className="text-sm font-medium" style={{ color: card.muted }}>Revenue</span>
                  <span className="font-mono text-base font-bold" style={{ color: '#10B981' }}>GH₵ {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                  <span className="text-sm" style={{ color: card.muted }}>Cost of Goods Sold</span>
                  <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {cogsTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                  <span className="text-sm" style={{ color: card.muted }}>Operating Expenses</span>
                  <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {Math.max(0, totalExpenses - cogsTotal).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                  <span className="text-sm" style={{ color: card.muted }}>Supplier Payments</span>
                  <span className="font-mono text-sm" style={{ color: card.muted }}>-GH₵ {supplierPayments.toLocaleString()}</span>
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
              {expenseCategoryData.length > 0 ? (
                <DonutChart data={expenseCategoryData} size={160} title="Expense Categories" subtitle="Approved operating expenses by category" />
              ) : (
                <div>
                  <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Expense Categories</h3>
                  <div className="h-40 flex items-center justify-center text-xs" style={{ color: card.muted }}>No expenses in selected period</div>
                </div>
              )}
            </div>
          </div>

          {/* Revenue vs Expenses Trend */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <AreaChart series={revenueSeries} height={300} title="Revenue vs Expenses" subtitle="Actual sales and approved operating expenses by period" />
          </div>

          {/* Profit Trend & Payables Aging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <AreaChart series={profitSeries} height={220} title="Net Profit Trend" subtitle="Profit trajectory over the selected period" />
            </div>
            <div className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <BarChart data={payablesAging.map(b => ({ label: b.label, value: b.value }))} height={220} title="Payables Aging" subtitle="Outstanding supplier invoices by due date" color="#F59E0B" />
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
              <div>
                <h2 className="font-display text-sm font-bold" style={{ color: card.text }}>General Ledger</h2>
                <p className="text-xs mt-0.5" style={{ color: card.subtle }}>{liveLedger.length} transactions in selected period</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                  +GH₵ {liveLedger.filter(l => l.type === 'CREDIT').reduce((a, l) => a + Number(l.amount), 0).toLocaleString()} in
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                  -GH₵ {liveLedger.filter(l => l.type === 'DEBIT').reduce((a, l) => a + Number(l.amount), 0).toLocaleString()} out
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${card.divider}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                    {['Date', 'Reference', 'Description', 'Type', 'Category', 'Amount'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveLedger.slice((transactionsPage - 1) * ITEMS_PER_PAGE, transactionsPage * ITEMS_PER_PAGE).map((l, i) => {
                    const category = deriveCategory(l);
                    const typeColor = l.type === 'CREDIT' ? '#10B981' : '#EF4444';
                    return (
                      <tr key={l.id} className="transition-colors cursor-pointer"
                        style={{ borderBottom: i < ITEMS_PER_PAGE - 1 ? `1px solid ${card.divider}` : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs" style={{ color: card.text }}>
                            {new Date(l.date).toLocaleDateString()}
                          </p>
                          <p className="text-[10px]" style={{ color: card.muted }}>
                            {new Date(l.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium px-2 py-1 rounded-md" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: card.primary }}>{l.ref || l.id.slice(-8).toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3 min-w-[200px]">
                          <p className="text-sm font-medium" style={{ color: card.text }}>{l.description}</p>
                          {l.supplier && <p className="text-[10px] mt-0.5" style={{ color: card.subtle }}>Supplier: {l.supplier}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
                            style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                            {l.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                            {category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm font-bold" style={{ color: typeColor }}>
                            {l.type === 'CREDIT' ? '+' : '-'}GH₵ {Number(l.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
        </div>
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Outstanding', value: livePayables.filter(p => p.status !== 'paid').reduce((a, p) => a + Number(p.amount), 0), color: card.text },
              { label: 'Pending', value: livePayables.filter(p => p.status === 'pending').reduce((a, p) => a + Number(p.amount), 0), color: '#F59E0B' },
              { label: 'Overdue', value: livePayables.filter(p => p.status === 'overdue').reduce((a, p) => a + Number(p.amount), 0), color: '#EF4444' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>{k.label}</p>
                <p className="font-mono text-lg font-black mt-1" style={{ color: k.color }}>GH₵ {k.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
              <div>
                <h2 className="font-display text-sm font-bold" style={{ color: card.text }}>Supplier Payables</h2>
                <p className="text-xs mt-0.5" style={{ color: card.subtle }}>Outstanding invoices due to suppliers</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  Pending: GH₵ {livePayables.filter(p => p.status === 'pending').reduce((a, p) => a + Number(p.amount), 0).toLocaleString()}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
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
                <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 p-4 items-center" style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.5)'), borderBottom: `1px solid ${card.divider}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.primaryBg }}>
                    <Building2 size={18} style={{ color: card.primary }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: card.text }}>{p.supplier}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: card.muted }}>
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>{p.invoice}</span>
                      <span>Due: {p.dueDate}</span>
                    </div>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-[10px]" style={{ color: card.muted }}>Total</p>
                    <p className="font-mono text-sm font-bold" style={{ color: card.text }}>GH₵ {Number(p.total || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="text-[10px]" style={{ color: card.muted }}>Balance</p>
                    <p className="font-mono text-sm font-bold" style={{ color: p.status === 'paid' ? '#10B981' : card.text }}>
                      {p.status === 'paid' ? 'CLEARED' : `GH₵ ${Number(p.amount).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-full font-bold capitalize" style={{ background: st.bg, color: st.color }}>
                      {p.status}
                    </span>
                    {p.status !== 'paid' && (
                      <button onClick={() => openPaymentModal(p)}
                        className="text-[10px] px-3 py-1 rounded-full font-bold transition-colors"
                        style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                        Pay
                      </button>
                    )}
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
      </div>
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-5 backdrop-blur-xl"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm font-bold" style={{ color: card.text }}>Budget vs Actual</h3>
                <p className="text-xs mt-0.5" style={{ color: card.subtle }}>Compare planned budgets against actual performance</p>
              </div>
              <button onClick={() => setShowBudgetModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Plus size={14} />
                Add Budget
              </button>
            </div>

            {loadingBudgetVsActual ? (
              <div className="h-40 flex items-center justify-center text-xs" style={{ color: card.muted }}>Loading budget data...</div>
            ) : budgetVsActual?.items?.length ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {(() => {
                    const totalBudget = Number(budgetVsActual.totalBudget) || 0;
                    const totalActual = Number(budgetVsActual.totalActual) || 0;
                    const variance = totalBudget - totalActual;
                    const cards = [
                      { label: 'Total Budget', value: totalBudget, color: card.primary },
                      { label: 'Total Actual', value: totalActual, color: '#EF4444' },
                      { label: 'Variance', value: variance, color: variance >= 0 ? '#10B981' : '#F59E0B' },
                    ];
                    return cards.map(k => (
                      <div key={k.label} className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>{k.label}</p>
                        <p className="font-mono text-lg font-bold" style={{ color: k.color }}>GH₵ {k.value.toLocaleString()}</p>
                      </div>
                    ));
                  })()}
                </div>
                <div className="space-y-3">
                  {budgetVsActual.items.map(item => {
                    const safeBudget = Number(item.budget) || 0;
                    const safeActual = Number(item.actual) || 0;
                    const percent = safeBudget > 0 ? Math.min(100, Math.round((safeActual / safeBudget) * 100)) : (safeActual > 0 ? 100 : 0);
                    const isOver = safeActual > safeBudget;
                    return (
                      <div key={item.category} className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.6)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: card.text }}>{item.category}</span>
                          <span className="text-xs font-mono" style={{ color: isOver ? '#EF4444' : card.muted }}>
                            GH₵ {safeActual.toLocaleString()} / GH₵ {safeBudget.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#E2E8F0' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: isOver ? '#EF4444' : card.primary }} />
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: card.subtle }}>
                          {percent}% used · Variance: GH₵ {(Number(item.variance) || 0).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-xs" style={{ color: card.muted }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: card.primaryBg }}>
                  <Target size={22} style={{ color: card.primary }} />
                </div>
                <p className="font-medium">No active budgets for the selected period.</p>
                <button onClick={() => setShowBudgetModal(true)} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold transition-colors" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                  Create your first budget
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-4 border-b" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
              <h2 className="font-display text-sm font-bold" style={{ color: card.text }}>Active Budgets</h2>
            </div>
            <div className="divide-y" style={{ borderColor: card.divider }}>
              {budgets.length === 0 ? (
                <div className="p-6 text-center text-xs" style={{ color: card.muted }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: card.primaryBg }}>
                    <Target size={18} style={{ color: card.primary }} />
                  </div>
                  No budgets found.
                </div>
              ) : budgets.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between p-4" style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.5)'), borderBottom: `1px solid ${card.divider}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: card.primaryBg }}>
                      <Target size={16} style={{ color: card.primary }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: card.text }}>{b.category}</p>
                      <p className="text-[11px]" style={{ color: card.muted }}>{b.period} · {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</p>
                      {b.notes && <p className="text-[10px] mt-0.5" style={{ color: card.subtle }}>{b.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm font-bold" style={{ color: card.text }}>GH₵ {Number(b.amount).toLocaleString()}</p>
                    <button onClick={() => deleteBudget(b.id).then(() => addToast({ message: 'Budget deleted', type: 'success' })).catch((e: any) => addToast({ message: e.message || 'Failed to delete budget', type: 'error' }))}
                      className="p-1.5 rounded-lg transition-colors" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Revenue', value: `GH₵ ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#10B981' },
              { label: 'Expenses', value: `GH₵ ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: '#EF4444' },
              { label: 'Net Profit', value: `GH₵ ${netProfit.toLocaleString()}`, icon: DollarSign, color: netProfit >= 0 ? '#8B5CF6' : '#EF4444' },
              { label: 'Profit Margin', value: `${totalRevenue ? ((netProfit/totalRevenue)*100).toFixed(1) : '0.0'}%`, icon: PieChart, color: netProfit >= 0 ? '#0EA5E9' : '#EF4444' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ background: `${s.color}15`, color: s.color }}><s.icon size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: card.muted }}>{s.label}</p>
                    <p className="text-lg font-black" style={{ color: card.text }}>{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <AreaChart series={revenueSeries} height={300} title="Revenue vs Expenses Over Time" subtitle="Comparative trend across the selected period" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              {expenseCategoryData.length > 0 ? (
                <DonutChart data={expenseCategoryData} size={180} title="Expense Mix" subtitle="Where money is going" />
              ) : (
                <div>
                  <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Expense Mix</h3>
                  <div className="h-48 flex items-center justify-center text-xs" style={{ color: card.muted }}>No expense data available</div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <BarChart data={payablesAging.map(b => ({ label: b.label, value: b.value }))} height={260} title="Supplier Payables Aging" subtitle="Outstanding balances grouped by days overdue" color="#F59E0B" />
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

      {/* Supplier Payment Modal */}
      {showPaymentModal && selectedPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}>
          <div className="rounded-2xl w-full max-w-lg p-6 shadow-2xl relative" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primaryBg }}>
                  <CreditCard size={20} style={{ color: card.primary }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: card.text }}>Record Supplier Payment</h2>
                  <p className="text-xs" style={{ color: card.muted }}>{selectedPayable.supplier} · {selectedPayable.invoice}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg transition-colors" style={{ color: card.muted }}><X size={18} /></button>
            </div>

            <div className="mb-4 p-4 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: card.muted }}>Invoice Total</span>
                <span className="font-mono text-sm font-bold" style={{ color: card.text }}>GH₵ {Number(selectedPayable.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: card.muted }}>Already Paid</span>
                <span className="font-mono text-sm font-medium" style={{ color: '#10B981' }}>GH₵ {Number(selectedPayable.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: card.border }}>
                <span className="text-sm font-medium" style={{ color: card.text }}>Balance Due</span>
                <span className="font-mono text-lg font-bold" style={{ color: card.primary }}>GH₵ {Number(selectedPayable.amount || 0).toLocaleString()}</span>
              </div>
            </div>

            {selectedPayable.payments && selectedPayable.payments.length > 0 && (
              <div className="mb-4 p-4 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: card.muted }}>Payment History</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedPayable.payments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span style={{ color: card.muted }}>{new Date(p.paidAt || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: card.primaryBg, color: card.primary }}>{p.method || 'CASH'}</span>
                        <span className="font-mono font-bold" style={{ color: '#10B981' }}>GH₵ {Number(p.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Quick Payment</label>
                <div className="flex gap-2">
                  {[
                    { label: 'Pay Full', value: Number(selectedPayable.amount || 0) },
                    { label: '50%', value: Number(selectedPayable.amount || 0) * 0.5 },
                    { label: '25%', value: Number(selectedPayable.amount || 0) * 0.25 },
                  ].map(btn => {
                    const isActive = Math.abs(Number(paymentAmount || 0) - btn.value) < 0.01;
                    return (
                      <button key={btn.label} type="button" onClick={() => setPaymentAmount(btn.value.toFixed(2))}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ background: isActive ? card.primary : (isDark ? 'rgba(0,0,0,0.2)' : '#F1F5F9'), color: isActive ? '#fff' : card.text, border: `1px solid ${card.border}` }}>
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Amount (GH₵)</label>
                <input required type="number" step="0.01" min="0.01" max={selectedPayable.amount || 0} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Payment Method</label>
                <select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile Money</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Reference / Transaction No (optional)</label>
                <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder={`PAY-${Date.now()}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Notes (optional)</label>
                <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3 pt-4 border-t mt-6" style={{ borderColor: card.divider }}>
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: card.text }}>
                  Cancel
                </button>
                <button type="submit" disabled={isPaying}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                  style={{ background: card.primary }}>
                  {isPaying ? 'Recording...' : `Pay GH₵ ${Number(paymentAmount || 0).toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}>
          <div className="rounded-2xl w-full max-w-md p-6 shadow-2xl relative" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: card.text }}>Create Budget</h2>
              <button onClick={() => setShowBudgetModal(false)} className="p-1 rounded-lg transition-colors" style={{ color: card.muted }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Category</label>
                <select required value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
                  <option value="REVENUE">Revenue</option>
                  <option value="COGS">Cost of Goods Sold</option>
                  <option value="OPERATING">Operating</option>
                  <option value="FINANCIAL">Financial</option>
                  <option value="TAXES">Taxes</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="SALARIES">Salaries</option>
                  <option value="RENT">Rent</option>
                  <option value="UTILITIES">Utilities</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Amount (GH₵)</label>
                <input required type="number" step="0.01" min="0" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Period</label>
                <select required value={budgetForm.period} onChange={e => setBudgetForm({ ...budgetForm, period: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Start Date</label>
                  <input required type="date" value={budgetForm.startDate} onChange={e => setBudgetForm({ ...budgetForm, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>End Date</label>
                  <input required type="date" value={budgetForm.endDate} onChange={e => setBudgetForm({ ...budgetForm, endDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: card.muted }}>Notes (optional)</label>
                <input type="text" value={budgetForm.notes} onChange={e => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
                  placeholder="e.g. Q3 operational budget" />
              </div>
              <div className="flex gap-3 pt-4 border-t mt-6" style={{ borderColor: card.divider }}>
                <button type="button" onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: card.text }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                  style={{ background: card.primary }}>
                  {isSubmitting ? 'Creating...' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
