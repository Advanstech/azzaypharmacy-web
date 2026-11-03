'use client';

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useBranch, useBranchFilter } from '@/lib/branch-context';
import { exportToExcel } from '@/lib/export-excel';
import { getEffectiveToday } from '@/lib/effective-date';
import { usePagination } from '@/hooks/use-pagination';
import { useAutoExport } from '@/hooks/use-auto-export';
import { 
  ArrowLeft, Download, Calendar, 
  TrendingUp, Users, ShoppingBag, Search,
  ChevronLeft, ChevronRight, Receipt
} from 'lucide-react';

function getPaymentGroup(paymentMethod: string): string {
  const method = paymentMethod.toUpperCase().replace(/[\s_-]/g, '');
  if (method.includes('CASH')) return 'Cash';
  if (method.includes('MOMO') || method.includes('MOBILE')) return 'MoMo';
  if (method.includes('CARD')) return 'Card';
  if (method.includes('NHIS')) return 'NHIS';
  if (method === 'SPLIT') return 'SPLIT';
  if (method.includes('CREDIT')) return 'Credit';
  return paymentMethod;
}

export default function DailySalesReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const searchParams = useSearchParams();
  const { sales: allSales, products, refetchSales, loadingSales, loadingProducts } = useStore();
  const { activeBranchId, activeBranchName } = useBranch();
  const filterByBranch = useBranchFilter();
  const sales = useMemo(() => filterByBranch(allSales), [allSales, filterByBranch]);
  const getUnitCost = useCallback((productId?: string) => {
    const costPrice = products.find(product => product.id === productId)?.costPrice;
    return typeof costPrice === 'number' && Number.isFinite(costPrice) && costPrice >= 0
      ? costPrice
      : null;
  }, [products]);
  const today = getEffectiveToday();
  const initialFromDate = searchParams?.get('from') || searchParams?.get('to') || today;
  const initialToDate = searchParams?.get('to') || searchParams?.get('from') || today;
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (fromDate !== params.get('from') || toDate !== params.get('to')) {
      params.set('from', fromDate);
      params.set('to', toDate);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [fromDate, toDate, router, searchParams]);
  const validDateRange = Boolean(fromDate && toDate && fromDate <= toDate);
  useEffect(() => {
    if (!validDateRange) return;
    void refetchSales(
      activeBranchId ?? undefined,
      `${fromDate}T00:00:00.000Z`,
      `${toDate}T23:59:59.999Z`,
    );
  }, [activeBranchId, fromDate, toDate, refetchSales, validDateRange]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Filter sales by the selected inclusive date range.
  const dailySales = useMemo(() => {
    if (!validDateRange) return [];
    return sales.filter(s => {
      const saleDate = new Date(s.createdAt).toISOString().split('T')[0];
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [sales, fromDate, toDate, validDateRange]);

  // Apply additional filters
  const filteredSales = useMemo(() => {
    let filtered = dailySales;
    if (paymentFilter !== 'All') {
      filtered = filtered.filter(s => getPaymentGroup(s.paymentMethod) === paymentFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.customerName?.toLowerCase().includes(term) ||
        s.user?.name?.toLowerCase().includes(term) ||
        s.cashierId?.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.receiptNo?.toLowerCase().includes(term) ||
        s.items.some(i => i.product?.name?.toLowerCase().includes(term))
      );
    }
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dailySales, paymentFilter, searchTerm]);

  const { currentPage, totalPages, paginatedData: paginatedSales, nextPage, prevPage, goToPage, startIndex, endIndex } = usePagination({ data: filteredSales, itemsPerPage: 10 });

  // Computed metrics
  const metrics = useMemo(() => {
    const totalRevenue = dailySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = dailySales.length;
    const uniqueCustomers = new Set(dailySales.map(s => s.customerPhone || s.customerName).filter(Boolean)).size;
    const totalItems = dailySales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    const totalSubtotal = dailySales.reduce((sum, s) => sum + (s.subtotal ?? s.totalAmount), 0);
    const totalDiscount = dailySales.reduce((sum, s) => sum + (s.discountAmt ?? 0), 0);
    const totalTax = dailySales.reduce((sum, s) => sum + (s.nhil ?? 0) + (s.getfund ?? 0) + (s.covid19Levy ?? 0) + (s.vat ?? 0), 0);
    
    const byPayment: Record<string, number> = {};
    dailySales.forEach(s => {
      if (s.paymentMethod === 'SPLIT') {
        byPayment['CASH'] = (byPayment['CASH'] || 0) + (s.cashAmount || 0);
        byPayment['MOMO'] = (byPayment['MOMO'] || 0) + (s.momoAmount || 0);
      } else {
        const method = getPaymentGroup(s.paymentMethod).toUpperCase();
        byPayment[method] = (byPayment[method] || 0) + s.totalAmount;
      }
    });

    const missingCostItems = dailySales.reduce((sum, sale) => (
      sum + sale.items.filter(item => getUnitCost(item.product?.id) === null).length
    ), 0);
    const totalCost = dailySales.reduce((sum, sale) => (
      sum + sale.items.reduce((itemSum, item) => {
        const unitCost = getUnitCost(item.product?.id);
        return itemSum + (unitCost === null ? 0 : unitCost * item.quantity);
      }, 0)
    ), 0);
    const totalProfit = missingCostItems === 0 ? totalRevenue - totalCost : null;

    return {
      totalRevenue, totalTransactions, uniqueCustomers, totalItems, byPayment,
      totalProfit, totalCost, totalSubtotal, totalDiscount, totalTax,
      averageTransaction: totalTransactions ? totalRevenue / totalTransactions : 0,
      grossMargin: totalRevenue && totalProfit !== null ? (totalProfit / totalRevenue) * 100 : null,
      missingCostItems,
    };
  }, [dailySales, getUnitCost]);

  const handleExport = () => {
    const transactionRows = filteredSales.map(s => {
      const costUnavailable = s.items.some(item => getUnitCost(item.product?.id) === null);
      const saleCogs = costUnavailable ? null : s.items.reduce((sum, item) => {
        return sum + (getUnitCost(item.product?.id) ?? 0) * item.quantity;
      }, 0);
      const itemCount = s.items.reduce((sum, item) => sum + item.quantity, 0);
      const date = new Date(s.createdAt);
      return [
        date.toLocaleDateString('en-GB'),
        date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        s.receiptNo || s.id,
        s.id,
        s.customerName || 'Walk-in',
        s.customerPhone || '',
        s.user?.name || 'Unknown',
        itemCount,
        s.paymentMethod,
        s.paymentMethod === 'SPLIT' ? (s.cashAmount ?? 0) : 0,
        s.paymentMethod === 'SPLIT' ? (s.momoAmount ?? 0) : 0,
        s.notes === 'CONVERTED_FROM_PENDING' ? 'Pending Hold' : 'Direct',
        s.status || 'Completed',
        s.subtotal ?? s.totalAmount,
        s.discountAmt ?? 0,
        s.nhil ?? 0,
        s.getfund ?? 0,
        s.covid19Levy ?? 0,
        s.vat ?? 0,
        s.totalAmount,
        s.amountPaid,
        s.change,
        saleCogs,
        saleCogs === null ? null : s.totalAmount - saleCogs,
        saleCogs === null || !s.totalAmount ? null : ((s.totalAmount - saleCogs) / s.totalAmount) * 100,
        costUnavailable ? 'Cost unavailable for one or more items' : 'Cost available',
      ];
    });
    const itemRows = filteredSales.flatMap(s => s.items.map(item => {
      const unitCost = getUnitCost(item.product?.id);
      const lineRevenue = item.total ?? item.unitPrice * item.quantity;
      const lineCost = unitCost === null ? null : unitCost * item.quantity;
      const lineProfit = lineCost === null ? null : lineRevenue - lineCost;
      const date = new Date(s.createdAt);
      return [
        date.toLocaleDateString('en-GB'),
        date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        s.receiptNo || s.id,
        s.id,
        s.customerName || 'Walk-in',
        s.user?.name || 'Unknown',
        item.product?.name || 'Unknown product',
        item.product?.category || 'Uncategorized',
        item.batchNo || '',
        item.quantity,
        item.unitPrice,
        `${item.quantity} × GH₵ ${item.unitPrice.toFixed(2)}`,
        lineRevenue,
        unitCost,
        unitCost === null ? 'Cost unavailable' : `${item.quantity} × GH₵ ${unitCost.toFixed(2)}`,
        lineCost,
        lineProfit,
        lineProfit === null || !lineRevenue ? null : (lineProfit / lineRevenue) * 100,
        unitCost === null ? 'Unavailable — add product cost price' : 'Current product cost price',
      ];
    }));
    const productTotals = new Map<string, {
      name: string;
      category: string;
      units: number;
      revenue: number;
      cost: number;
      missingCost: boolean;
      transactions: Set<string>;
    }>();
    filteredSales.forEach(s => s.items.forEach(item => {
      const productId = item.product?.id || item.product?.name || 'unknown';
      const name = item.product?.name || 'Unknown product';
      const totals = productTotals.get(productId) || {
        name,
        category: item.product?.category || 'Uncategorized',
        units: 0,
        revenue: 0,
        cost: 0,
        missingCost: false,
        transactions: new Set<string>(),
      };
      const unitCost = getUnitCost(item.product?.id);
      totals.units += item.quantity;
      totals.revenue += item.total ?? item.unitPrice * item.quantity;
      if (unitCost === null) totals.missingCost = true;
      else totals.cost += unitCost * item.quantity;
      totals.transactions.add(s.id);
      productTotals.set(productId, totals);
    }));
    const productRows = Array.from(productTotals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(product => {
        const profit = product.missingCost ? null : product.revenue - product.cost;
        return [
          product.name, product.category, product.units, product.transactions.size,
          product.units ? product.revenue / product.units : 0,
          product.revenue, product.missingCost ? null : product.cost, profit,
          profit === null || !product.revenue ? null : (profit / product.revenue) * 100,
          product.missingCost ? 'Cost unavailable for one or more sales' : 'Current product cost price',
        ];
      });
    const paymentTotals = new Map<string, { transactions: number; amount: number }>();
    filteredSales.forEach(s => {
      const paymentParts = s.paymentMethod === 'SPLIT'
        ? [['CASH', s.cashAmount ?? 0], ['MOMO', s.momoAmount ?? 0]] as const
        : [[getPaymentGroup(s.paymentMethod).toUpperCase(), s.totalAmount]] as const;
      paymentParts.forEach(([method, amount]) => {
        const total = paymentTotals.get(method) || { transactions: 0, amount: 0 };
        total.transactions += amount > 0 ? 1 : 0;
        total.amount += amount;
        paymentTotals.set(method, total);
      });
    });
    const paymentRows = Array.from(paymentTotals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([method, total]) => {
        const exportRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        return [method, total.transactions, total.amount, exportRevenue ? (total.amount / exportRevenue) * 100 : 0];
      });

    exportToExcel({
      filename: `daily-sales-report-${activeBranchName.replace(/\s+/g, '-').toLowerCase()}-${fromDate}-to-${toDate}`,
      title: 'Daily Sales Report',
      subtitle: 'Azzay Pharmacy — Sales, purchased items and gross profit analysis',
      meta: [
        { label: 'Branch', value: activeBranchName },
        { label: 'Reporting Period', value: `${fromDate} to ${toDate}` },
        { label: 'Summary Scope', value: 'All transactions in the selected period; detail sheets follow search and payment filters' },
        { label: 'Transaction Detail Filter', value: paymentFilter === 'All' ? 'All payments' : paymentFilter },
        { label: 'Search Filter', value: searchTerm || 'None' },
        { label: 'Cost Basis', value: 'Current product cost price; missing costs are left blank and are not estimated' },
      ],
      summary: [
        { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}` },
        { label: 'Transactions', value: metrics.totalTransactions },
        { label: 'Average Transaction Value', value: `GH₵ ${metrics.averageTransaction.toFixed(2)}` },
        { label: 'Unique Named Customers', value: metrics.uniqueCustomers },
        { label: 'Units Sold', value: metrics.totalItems },
        { label: 'Subtotal Before Discount', value: `GH₵ ${metrics.totalSubtotal.toFixed(2)}` },
        { label: 'Discounts', value: `GH₵ ${metrics.totalDiscount.toFixed(2)}` },
        { label: 'Taxes and Levies', value: `GH₵ ${metrics.totalTax.toFixed(2)}` },
        { label: 'Cost of Goods Sold (known costs)', value: `GH₵ ${metrics.totalCost.toFixed(2)}` },
        { label: 'Gross Profit', value: metrics.totalProfit === null ? 'Unavailable — add missing product cost prices' : `GH₵ ${metrics.totalProfit.toFixed(2)}` },
        { label: 'Gross Margin', value: metrics.grossMargin === null ? 'Unavailable — add missing product cost prices' : `${metrics.grossMargin.toFixed(1)}%` },
        { label: 'Items Missing Cost Price', value: metrics.missingCostItems },
        { label: 'Transactions Included in Detail Sheets', value: filteredSales.length },
      ],
      headers: [
        'Date', 'Time', 'Receipt', 'Sale ID', 'Customer', 'Cashier', 'Product',
        'Category', 'Batch', 'Quantity', 'Selling Price / Unit', 'Selling Price Calculation',
        'Line Subtotal', 'Unit Cost Price', 'Cost Calculation', 'Line Cost (COGS)',
        'Gross Profit', 'Gross Margin %', 'Cost Price Basis',
      ],
      rows: itemRows,
      currencyColumns: [10, 12, 13, 15, 16],
      numberColumns: [9],
      percentColumns: [17],
      sheetName: 'Items Sold',
      additionalSheets: [
        {
          sheetName: 'Transaction Summary',
          headers: [
            'Date', 'Time', 'Receipt', 'Sale ID', 'Customer', 'Phone', 'Cashier', 'Units',
            'Payment Method', 'Cash Portion', 'MoMo Portion', 'Origin', 'Status',
            'Subtotal', 'Discount', 'NHIL', 'GETFund', 'COVID Levy', 'VAT',
            'Total', 'Amount Paid', 'Change', 'Cost of Goods Sold', 'Gross Profit', 'Gross Margin %', 'Cost Status',
          ],
          rows: transactionRows,
          currencyColumns: [9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          numberColumns: [7],
          percentColumns: [24],
        },
        {
          sheetName: 'Product Summary',
          headers: ['Product', 'Category', 'Units Sold', 'Transactions', 'Avg. Unit Price', 'Revenue', 'Cost of Goods Sold', 'Gross Profit', 'Gross Margin %', 'Cost Status'],
          rows: productRows,
          currencyColumns: [4, 5, 6, 7],
          numberColumns: [2, 3],
          percentColumns: [8],
        },
        {
          sheetName: 'Payments',
          headers: ['Payment Method', 'Transactions', 'Amount Collected', 'Share of Exported Revenue %'],
          rows: paymentRows,
          currencyColumns: [2],
          numberColumns: [1],
          percentColumns: [3],
        },
      ],
    });
  };

  useAutoExport(!loadingSales && !loadingProducts, handleExport);

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
            <p className="text-sm font-medium" style={{ color: card.muted }}>Detailed transaction history with profit analysis · <span className="font-bold" style={{ color: card.primary }}>{activeBranchName}</span>{loadingSales && <span> · Loading sales…</span>}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center p-1 rounded-2xl backdrop-blur-xl shadow-inner" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', border: `1px solid ${card.border}` }}>
            <Calendar size={16} className="mx-3" style={{ color: card.subtle }} />
            <input 
              type="date" 
              aria-label="Start date"
              value={fromDate}
              max={toDate}
              onChange={(e) => {
                const nextFromDate = e.target.value;
                setFromDate(nextFromDate);
                if (nextFromDate > toDate) setToDate(nextFromDate);
                goToPage(1);
              }}
              className="pr-4 py-2 rounded-xl text-sm font-bold bg-transparent focus:outline-none"
              style={{ color: card.text }}
            />
            <span className="px-2 text-xs font-bold" style={{ color: card.muted }}>to</span>
            <input
              type="date"
              aria-label="End date"
              value={toDate}
              min={fromDate}
              onChange={(e) => {
                const nextToDate = e.target.value;
                setToDate(nextToDate);
                if (nextToDate < fromDate) setFromDate(nextToDate);
                goToPage(1);
              }}
              className="pr-3 py-2 rounded-xl text-sm font-bold bg-transparent focus:outline-none"
              style={{ color: card.text }}
            />
          </div>
          <button 
            onClick={handleExport}
            disabled={loadingSales || !validDateRange}
            title={loadingSales ? 'Wait for sales to finish loading before exporting.' : undefined}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
          <option value="Credit">Credit</option>
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
                const hasMissingCost = sale.items.some(item => getUnitCost(item.product?.id) === null);
                const saleCogs = hasMissingCost ? null : sale.items.reduce((sum, item) => (
                  sum + (getUnitCost(item.product?.id) ?? 0) * item.quantity
                ), 0);
                const profit = saleCogs === null ? null : sale.totalAmount - saleCogs;
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
                    <td className="px-5 py-4 text-right font-mono text-sm font-black" style={{ color: profit === null ? card.muted : profit >= 0 ? '#10B981' : '#EF4444' }}>
                      {profit === null ? 'Cost unavailable' : `GH₵ ${profit.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
              {paginatedSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm font-bold" style={{ color: card.muted }}>
                    No sales found for this date range.
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
