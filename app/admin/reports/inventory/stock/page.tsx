'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore, Product } from '@/lib/store';
import { useBranch } from '@/lib/branch-context';
import { exportToExcel } from '@/lib/export-excel';
import { usePagination } from '@/hooks/use-pagination';
import { 
  ArrowLeft, Download, Package, AlertTriangle, CheckCircle,
  Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown
} from 'lucide-react';

export default function StockLevelReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { products: allProducts } = useStore();
  const { activeBranchId, activeBranchName } = useBranch();
  const products = useMemo(() => {
    if (!activeBranchId) return allProducts;
    return allProducts.filter(p => p.branchId === activeBranchId || p.stockItems?.some(si => si.branchId === activeBranchId));
  }, [allProducts, activeBranchId]);

  const branchStock = (p: Product) => activeBranchId
    ? (p.stockItems || []).filter(si => si.branchId === activeBranchId).reduce((sum, si) => sum + si.quantity, 0)
    : p.stockQuantity;

  const branchStockValue = (p: Product) => {
    const items = activeBranchId
      ? (p.stockItems || []).filter(si => si.branchId === activeBranchId)
      : (p.stockItems || []);
    return items.reduce((sum, si) => sum + Number(si.costPrice || 0) * si.quantity, 0);
  };

  const branchAvgCost = (p: Product) => {
    const qty = branchStock(p);
    return qty > 0 ? branchStockValue(p) / qty : p.costPrice;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<'name' | 'stock' | 'value'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.dosageForm?.toLowerCase().includes(term)
      );
    }
    
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    if (statusFilter !== 'All') {
      filtered = filtered.filter(p => {
        const qty = branchStock(p);
        if (statusFilter === 'OK') return qty > 10;
        if (statusFilter === 'LOW') return qty > 0 && qty <= 10;
        if (statusFilter === 'OUT') return qty === 0;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'stock') comparison = branchStock(a) - branchStock(b);
      else if (sortField === 'value') comparison = branchStockValue(a) - branchStockValue(b);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, statusFilter, sortField, sortDirection]);

  const { currentPage, totalPages, paginatedData: paginatedProducts, nextPage, prevPage, goToPage, startIndex, endIndex } = usePagination({ data: filteredProducts });

  // Metrics
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + branchStockValue(p), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.sellingPrice * branchStock(p)), 0);
    const lowStock = products.filter(p => { const q = branchStock(p); return q > 0 && q <= 10; }).length;
    const outOfStock = products.filter(p => branchStock(p) === 0).length;
    const potentialProfit = totalRetailValue - totalStockValue;

    return { totalProducts, totalStockValue, totalRetailValue, lowStock, outOfStock, potentialProfit };
  }, [products, activeBranchId]);

  const handleExport = () => {
    const sorted = [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const rows = sorted.map(p => {
      const qty = branchStock(p);
      const totalCost = branchStockValue(p);
      const unitCost = branchAvgCost(p);
      const totalRetail = p.sellingPrice * qty;
      return [
        p.name, p.category, p.supplier?.name || 'N/A', p.dosageForm || 'N/A', qty,
        unitCost, totalCost, p.sellingPrice, totalRetail,
        qty === 0 ? 'OUT OF STOCK' : qty <= 10 ? 'LOW STOCK' : 'OK',
      ];
    });

    const lowStockPct = metrics.totalProducts ? ((metrics.lowStock / metrics.totalProducts) * 100).toFixed(1) : '0.0';
    const outOfStockPct = metrics.totalProducts ? ((metrics.outOfStock / metrics.totalProducts) * 100).toFixed(1) : '0.0';

    exportToExcel({
      filename: `stock-level-report-${activeBranchName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
      title: 'Stock Level Report',
      subtitle: 'Azzay Pharmacy — Complete Inventory Status and Valuation',
      meta: [{ label: 'Branch', value: activeBranchName }],
      summary: [
        { label: 'Total Products', value: metrics.totalProducts },
        { label: 'Total Stock Value', value: `GH₵ ${metrics.totalStockValue.toFixed(2)}` },
        { label: 'Total Retail Value', value: `GH₵ ${metrics.totalRetailValue.toFixed(2)}` },
        { label: 'Low Stock', value: metrics.lowStock },
        { label: 'Low Stock %', value: `${lowStockPct}%` },
        { label: 'Out of Stock', value: metrics.outOfStock },
        { label: 'Out of Stock %', value: `${outOfStockPct}%` },
        { label: 'Potential Profit', value: `GH₵ ${metrics.potentialProfit.toFixed(2)}` },
      ],
      headers: ['Product', 'Category', 'Supplier', 'Dosage Form', 'Stock Qty', 'Unit Cost', 'Total Cost', 'Unit Price', 'Total Retail', 'Status'],
      rows,
      currencyColumns: [5, 6, 7, 8],
      numberColumns: [4],
      statusColumn: 9,
      sheetName: 'Stock Levels',
    });
  };

  const handleSort = (field: 'name' | 'stock' | 'value') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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
  };

  const getStatusBadge = (qty: number) => {
    if (qty === 0) return { text: 'OUT', bg: 'rgba(239,68,68,0.1)', color: '#EF4444' };
    if (qty <= 10) return { text: 'LOW', bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' };
    return { text: 'OK', bg: 'rgba(16,185,129,0.1)', color: '#10B981' };
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
            <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>Stock Level Report</h1>
            <p className="text-sm" style={{ color: card.muted }}>Complete inventory status and valuation · <span className="font-bold" style={{ color: card.primary }}>{activeBranchName}</span></p>
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
          { label: 'Total Products', value: String(metrics.totalProducts), icon: Package, color: '#0EA5E9' },
          { label: 'Stock Value', value: `GH₵ ${metrics.totalStockValue.toFixed(2)}`, icon: CheckCircle, color: '#10B981' },
          { label: 'Low Stock', value: String(metrics.lowStock), icon: AlertTriangle, color: '#F59E0B' },
          { label: 'Out of Stock', value: String(metrics.outOfStock), icon: AlertTriangle, color: '#EF4444' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} style={{ color: kpi.color }} />
              <span className="text-xs font-medium" style={{ color: card.subtle }}>{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold" style={{ color: card.text }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Valuation Summary */}
      <div className="rounded-xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Total Cost Value</p>
            <p className="font-display text-2xl font-bold mt-1" style={{ color: card.text }}>GH₵ {metrics.totalStockValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Total Retail Value</p>
            <p className="font-display text-2xl font-bold mt-1" style={{ color: card.text }}>GH₵ {metrics.totalRetailValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Potential Profit</p>
            <p className="font-display text-2xl font-bold mt-1" style={{ color: '#10B981' }}>GH₵ {metrics.potentialProfit.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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
        <select 
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); goToPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); goToPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}>
          <option value="All">All Status</option>
          <option value="OK">OK Stock</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC' }}>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-bold uppercase" style={{ color: card.subtle }}>
                    Product <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Category</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: card.subtle }}>Supplier</th>
                <th className="px-4 py-3 text-center">
                  <button onClick={() => handleSort('stock')} className="flex items-center gap-1 text-xs font-bold uppercase mx-auto" style={{ color: card.subtle }}>
                    Stock <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Cost Price</th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort('value')} className="flex items-center gap-1 text-xs font-bold uppercase ml-auto" style={{ color: card.subtle }}>
                    Stock Value <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const qty = branchStock(product);
                const status = getStatusBadge(qty);
                return (
                  <tr key={product.id} className="border-t" style={{ borderColor: card.border }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: card.text }}>{product.name}</p>
                      <p className="text-xs" style={{ color: card.subtle }}>{product.dosageForm || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: card.text }}>{product.category}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: card.text }}>{product.supplier?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold" style={{ color: card.text }}>
                      {qty}
                    </td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: card.text }}>
                      GH₵ {branchAvgCost(product).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: card.text }}>
                      GH₵ {branchStockValue(product).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold px-2 py-1 rounded" 
                        style={{ background: status.bg, color: status.color }}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
