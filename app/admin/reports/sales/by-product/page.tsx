'use client';

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useBranch } from '@/lib/branch-context';
import { exportToExcel } from '@/lib/export-excel';
import { usePagination } from '@/hooks/use-pagination';
import { getEffectiveDateRange } from '@/lib/effective-date';
import { 
  ArrowLeft, Download, Package, Search, TrendingUp, ShoppingCart,
  ChevronLeft, ChevronRight, Star, Award, Calendar
} from 'lucide-react';

export default function SalesByProductReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales: allSales, products: allProducts, refetchSales, refetchProducts, loadingSales, loadingProducts } = useStore();
  const { activeBranchId, activeBranchName } = useBranch();
  const sales = useMemo(() => activeBranchId ? allSales.filter(s => s.branchId === activeBranchId) : allSales, [allSales, activeBranchId]);
  const products = useMemo(() => activeBranchId
    ? allProducts.filter(p => p.branchId === activeBranchId || p.stockItems?.some(si => si.branchId === activeBranchId))
    : allProducts, [allProducts, activeBranchId]);
  const searchParams = useSearchParams();

  const [inputFromDate, setInputFromDate] = useState(searchParams?.get('from') || '');
  const [inputToDate, setInputToDate] = useState(searchParams?.get('to') || '');
  const effectiveRange = useMemo(() => getEffectiveDateRange(sales), [sales]);
  const fromDate = inputFromDate || effectiveRange.from;
  const toDate = inputToDate || effectiveRange.to;

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (fromDate !== params.get('from') || toDate !== params.get('to')) {
      params.set('from', fromDate);
      params.set('to', toDate);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [fromDate, toDate, router, searchParams]);

  useEffect(() => {
    refetchProducts(activeBranchId ?? undefined);
  }, [activeBranchId, refetchProducts]);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    refetchSales(activeBranchId ?? undefined, `${fromDate}T00:00:00.000Z`, `${toDate}T23:59:59.999Z`);
  }, [activeBranchId, fromDate, toDate, refetchSales]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  // Analyze product sales
  const productAnalysis = useMemo(() => {
    const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
    const end = new Date(toDate); end.setHours(23, 59, 59, 999);
    const data: Record<string, {
      id: string;
      name: string;
      category: string;
      supplier: string;
      dosageForm: string;
      quantitySold: number;
      revenue: number;
      cogs: number;
      profit: number;
      profitMargin: number;
      saleIds: Set<string>;
    }> = {};

    sales.forEach(s => {
      if (s.status === 'REFUNDED' || s.status === 'VOIDED' || s.isRefunded) return;
      const saleDate = new Date(s.createdAt);
      if (saleDate < start || saleDate > end) return;
      s.items.forEach(item => {
        if (!item.product?.id) return;
        const product = products.find(p => p.id === item.product.id);
        if (!data[item.product.id]) {
          data[item.product.id] = {
            id: item.product.id,
            name: item.product.name,
            category: item.product.category,
            supplier: product?.supplier?.name || 'N/A',
            dosageForm: product?.dosageForm || 'N/A',
            quantitySold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
            profitMargin: 0,
            saleIds: new Set<string>(),
          };
        }
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const unitCost = Number(product?.costPrice ?? unitPrice * 0.5);
        data[item.product.id].quantitySold += quantity;
        data[item.product.id].revenue += Number(item.total ?? unitPrice * quantity);
        data[item.product.id].cogs += unitCost * quantity;
        data[item.product.id].saleIds.add(s.id);
      });
    });

    // Calculate profit and margin
    Object.values(data).forEach(p => {
      p.profit = p.revenue - p.cogs;
      p.profitMargin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
    });

    return Object.values(data).sort((a, b) => b.revenue - a.revenue);
  }, [sales, products, fromDate, toDate]);

  // Filter
  const filteredProducts = useMemo(() => {
    let filtered = productAnalysis;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.supplier.toLowerCase().includes(term)
      );
    }
    
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered;
  }, [productAnalysis, searchTerm, categoryFilter]);

  const { currentPage, totalPages, paginatedData: paginatedProducts, nextPage, prevPage, goToPage, startIndex, endIndex } = usePagination({ data: filteredProducts });

  // Metrics
  const metrics = useMemo(() => {
    const totalProducts = productAnalysis.length;
    const totalRevenue = productAnalysis.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = productAnalysis.reduce((sum, p) => sum + p.profit, 0);
    const totalQuantity = productAnalysis.reduce((sum, p) => sum + p.quantitySold, 0);
    const topProduct = productAnalysis[0];
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalProducts, totalRevenue, totalProfit, totalQuantity, topProduct, avgMargin };
  }, [productAnalysis]);

  const handleExport = () => {
    const exportRevenue = filteredProducts.reduce((sum, p) => sum + p.revenue, 0);
    const exportCogs = filteredProducts.reduce((sum, p) => sum + p.cogs, 0);
    const exportProfit = exportRevenue - exportCogs;
    const exportQuantity = filteredProducts.reduce((sum, p) => sum + p.quantitySold, 0);
    const exportMargin = exportRevenue > 0 ? (exportProfit / exportRevenue) * 100 : 0;
    const exportTransactions = new Set(filteredProducts.flatMap(p => [...p.saleIds])).size;
    const detailRows = filteredProducts.map((p, index) => [
      index + 1,
      p.name,
      p.category,
      p.supplier,
      p.dosageForm,
      p.saleIds.size,
      p.quantitySold,
      p.quantitySold > 0 ? p.revenue / p.quantitySold : 0,
      p.revenue,
      p.cogs,
      p.profit,
      p.profitMargin,
      exportRevenue > 0 ? (p.revenue / exportRevenue) * 100 : 0,
    ]);
    const rows = [
      ...detailRows,
      [
        '', 'TOTAL', '', '', '',
        exportTransactions,
        exportQuantity,
        exportQuantity > 0 ? exportRevenue / exportQuantity : 0,
        exportRevenue,
        exportCogs,
        exportProfit,
        exportMargin,
        exportRevenue > 0 ? 100 : 0,
      ],
    ];
    exportToExcel({
      filename: `sales-by-product-${activeBranchName.replace(/\s+/g, '-').toLowerCase()}-${fromDate}-to-${toDate}`,
      title: 'Sales by Product Performance Report',
      subtitle: 'Azzay Pharmacy Pro — Revenue, Volume and Estimated Gross Profit Analysis',
      meta: [
        { label: 'Branch', value: activeBranchName },
        { label: 'Reporting Period', value: `${fromDate} to ${toDate}` },
        { label: 'Cost Basis', value: 'Estimated using the current product cost price' },
        { label: 'Scope', value: `${filteredProducts.length} product lines after active filters` },
      ],
      summary: [
        { label: 'Distinct Products Sold', value: filteredProducts.length },
        { label: 'Total Units Sold', value: exportQuantity },
        { label: 'Transactions Represented', value: exportTransactions },
        { label: 'Total Revenue', value: `GH₵ ${exportRevenue.toFixed(2)}` },
        { label: 'Estimated COGS', value: `GH₵ ${exportCogs.toFixed(2)}` },
        { label: 'Estimated Gross Profit', value: `GH₵ ${exportProfit.toFixed(2)}` },
        { label: 'Weighted Gross Margin', value: `${exportMargin.toFixed(1)}%` },
        { label: 'Top Product', value: filteredProducts[0]?.name ?? 'N/A' },
      ],
      headers: ['Rank', 'Product', 'Category', 'Supplier', 'Dosage Form', 'Transactions', 'Units Sold', 'Avg Unit Price', 'Revenue', 'Est. COGS', 'Est. Gross Profit', 'Margin %', 'Revenue Share %'],
      rows,
      currencyColumns: [7, 8, 9, 10],
      numberColumns: [0, 5, 6],
      percentColumns: [11, 12],
      totalRowIndices: [rows.length - 1],
      sheetName: 'Product Performance',
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
    gold: '#F59E0B',
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Sales by Product</h1>
            <p className="text-sm" style={{ color: card.muted }}>Product performance with revenue and profit analysis · <span className="font-bold" style={{ color: card.primary }}>{activeBranchName}</span>{(loadingSales || loadingProducts) && <span> · Syncing real data…</span>}</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primary}30` }}>
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Units Sold', value: String(metrics.totalQuantity), icon: Package, color: card.primary },
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: '#10B981' },
          { label: 'Est. Gross Profit', value: `GH₵ ${metrics.totalProfit.toFixed(2)}`, icon: ShoppingCart, color: '#8B5CF6' },
          { label: 'Weighted Margin', value: `${metrics.avgMargin.toFixed(1)}%`, icon: Star, color: card.gold },
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

      {/* Top Product */}
      {metrics.topProduct && (
        <div className="rounded-xl border p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.1) 100%)', borderColor: '#6366F1', boxShadow: card.shadow }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <Award size={24} style={{ color: '#6366F1' }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366F1' }}>Top Selling Product</p>
              <p className="font-display text-lg font-bold" style={{ color: card.text }}>{metrics.topProduct.name}</p>
              <p className="text-sm" style={{ color: card.muted }}>{metrics.topProduct.category} • {metrics.topProduct.dosageForm}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold" style={{ color: '#6366F1' }}>GH₵ {metrics.topProduct.revenue.toFixed(2)}</p>
              <p className="text-xs" style={{ color: card.muted }}>{metrics.topProduct.quantitySold} units sold</p>
              <p className="text-xs font-bold" style={{ color: '#10B981' }}>+GH₵ {metrics.topProduct.profit.toFixed(2)} profit</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); goToPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
          <Calendar size={16} style={{ color: card.subtle }} />
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => { setInputFromDate(e.target.value); goToPage(1); }}
            className="text-sm bg-transparent focus:outline-none"
            style={{ color: card.text }}
          />
          <span style={{ color: card.muted }}>to</span>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => { setInputToDate(e.target.value); goToPage(1); }}
            className="text-sm bg-transparent focus:outline-none"
            style={{ color: card.text }}
          />
        </div>
        <select 
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); goToPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Product</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Category</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Supplier</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Est. COGS</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Est. Profit</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="border-t" style={{ borderColor: card.border }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: card.text }}>{product.name}</p>
                    <p className="text-xs" style={{ color: card.subtle }}>{product.dosageForm}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: card.text }}>{product.category}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: card.text }}>{product.supplier}</td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: card.text }}>{product.quantitySold}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {product.revenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: card.muted }}>
                    GH₵ {product.cogs.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-bold" style={{ color: product.profit > 0 ? '#10B981' : '#EF4444' }}>
                      GH₵ {product.profit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold px-2 py-1 rounded" 
                      style={{ 
                        background: product.profitMargin > 30 ? 'rgba(16,185,129,0.1)' : 
                                 product.profitMargin > 0 ? 'rgba(14,165,233,0.1)' : 'rgba(239,68,68,0.1)',
                        color: product.profitMargin > 30 ? '#10B981' : 
                               product.profitMargin > 0 ? '#0EA5E9' : '#EF4444'
                      }}>
                      {product.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: card.border }}>
            <span className="text-xs" style={{ color: card.muted }}>
              Showing {startIndex} - {endIndex} of {filteredProducts.length}
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
