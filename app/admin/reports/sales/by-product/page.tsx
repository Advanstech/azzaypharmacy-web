'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  ArrowLeft, Download, Package, Search, TrendingUp, ShoppingCart,
  ChevronLeft, ChevronRight, Star, Award
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

export default function SalesByProductReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales, products } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  // Analyze product sales
  const productAnalysis = useMemo(() => {
    const data: Record<string, {
      id: string;
      name: string;
      category: string;
      dosageForm: string;
      quantitySold: number;
      revenue: number;
      cogs: number;
      profit: number;
      profitMargin: number;
    }> = {};

    sales.forEach(s => {
      s.items.forEach(item => {
        const product = products.find(p => p.id === item.product.id);
        if (!data[item.product.id]) {
          data[item.product.id] = {
            id: item.product.id,
            name: item.product.name,
            category: item.product.category,
            dosageForm: product?.dosageForm || 'N/A',
            quantitySold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
            profitMargin: 0,
          };
        }
        const unitCost = product ? product.costPrice : item.unitPrice * 0.5;
        data[item.product.id].quantitySold += item.quantity;
        data[item.product.id].revenue += item.total;
        data[item.product.id].cogs += unitCost * item.quantity;
      });
    });

    // Calculate profit and margin
    Object.values(data).forEach(p => {
      p.profit = p.revenue - p.cogs;
      p.profitMargin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
    });

    return Object.values(data).sort((a, b) => b.revenue - a.revenue);
  }, [sales, products]);

  // Filter
  const filteredProducts = useMemo(() => {
    let filtered = productAnalysis;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }
    
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered;
  }, [productAnalysis, searchTerm, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    const rows = [
      ['Product', 'Category', 'Dosage Form', 'Qty Sold', 'Revenue', 'COGS', 'Profit', 'Margin %'],
      ...filteredProducts.map(p => [
        p.name, p.category, p.dosageForm,
        String(p.quantitySold),
        p.revenue.toFixed(2),
        p.cogs.toFixed(2),
        p.profit.toFixed(2),
        p.profitMargin.toFixed(1),
      ]),
    ];
    downloadCSV(`sales-by-product-${new Date().toISOString().split('T')[0]}.csv`, rows);
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
            <p className="text-sm" style={{ color: card.muted }}>Product performance with revenue and profit analysis</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Products Sold', value: String(metrics.totalProducts), icon: Package, color: card.primary },
          { label: 'Total Revenue', value: `GH₵ ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: '#10B981' },
          { label: 'Total Profit', value: `GH₵ ${metrics.totalProfit.toFixed(2)}`, icon: ShoppingCart, color: '#8B5CF6' },
          { label: 'Avg Margin', value: `${metrics.avgMargin.toFixed(1)}%`, icon: Star, color: card.gold },
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.text }}
          />
        </div>
        <select 
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
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
                <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: card.subtle }}>Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>COGS</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: card.subtle }}>Profit</th>
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
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-50"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronLeft size={16} style={{ color: card.text }} />
              </button>
              <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
