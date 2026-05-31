'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { FileText, Download, BarChart3, Package, DollarSign, Users, Calendar, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['All', 'Sales', 'Inventory', 'Staff', 'Financial'];

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

export default function ReportsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const { sales, products, staff } = useStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [generating, setGenerating] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Computed report summaries
  const todaySales = useMemo(() => sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === today), [sales, today]);
  const monthlySales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [sales]);
  const monthlyRevenue = useMemo(() => monthlySales.reduce((sum, s) => sum + s.totalAmount, 0), [monthlySales]);

  const lowStock = useMemo(() => products.filter(p => p.stockQuantity <= 10), [products]);
  
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const totalCogs = useMemo(() => {
    return sales.reduce((sum, s) => {
      const saleCogs = s.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product.id);
        const cost = product ? product.costPrice : (item.unitPrice * 0.5); // Fallback if product not found
        return itemSum + (cost * item.quantity);
      }, 0);
      return sum + saleCogs;
    }, 0);
  }, [sales, products]);
  
  const netProfit = totalRevenue - totalCogs;

  const REPORTS = [
    {
      id: 'sales-daily',
      title: 'Daily Sales Report',
      desc: `${todaySales.length} transactions today · GH₵ ${todaySales.reduce((s, x) => s + x.totalAmount, 0).toFixed(2)} revenue`,
      icon: BarChart3, color: '#0EA5E9', category: 'Sales',
      lastGenerated: today,
      onExport: () => {
        const rows = [
          ['Sale ID', 'Customer', 'Items', 'Payment', 'Amount', 'Time'],
          ...todaySales.map(s => [
            s.id, s.customerName || 'Walk-in',
            String(s.items.length), s.paymentMethod,
            s.totalAmount.toFixed(2),
            new Date(s.createdAt).toLocaleTimeString('en-GB'),
          ]),
        ];
        downloadCSV(`daily-sales-${today}.csv`, rows);
      },
    },
    {
      id: 'sales-monthly',
      title: 'Monthly Revenue Summary',
      desc: `${monthlySales.length} transactions this month · GH₵ ${monthlyRevenue.toFixed(2)} revenue`,
      icon: DollarSign, color: '#10B981', category: 'Sales',
      lastGenerated: today,
      onExport: () => {
        const byMethod: Record<string, number> = {};
        monthlySales.forEach(s => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.totalAmount; });
        const rows = [
          ['Payment Method', 'Total Amount', 'Transaction Count'],
          ...Object.entries(byMethod).map(([m, a]) => [
            m, a.toFixed(2),
            String(monthlySales.filter(s => s.paymentMethod === m).length),
          ]),
          ['TOTAL', monthlyRevenue.toFixed(2), String(monthlySales.length)],
        ];
        downloadCSV(`monthly-revenue-${today}.csv`, rows);
      },
    },
    {
      id: 'inventory-stock',
      title: 'Stock Level Report',
      desc: `${products.length} products · ${lowStock.length} low/out of stock`,
      icon: Package, color: '#F59E0B', category: 'Inventory',
      lastGenerated: today,
      onExport: () => {
        const rows = [
          ['Product', 'Category', 'Stock Qty', 'Cost Price', 'Sell Price', 'Stock Value', 'Status'],
          ...products.map(p => [
            p.name, p.category, String(p.stockQuantity),
            p.costPrice.toFixed(2), p.sellingPrice.toFixed(2),
            (p.costPrice * p.stockQuantity).toFixed(2),
            p.stockQuantity === 0 ? 'OUT OF STOCK' : p.stockQuantity <= 10 ? 'LOW STOCK' : 'OK',
          ]),
        ];
        downloadCSV(`stock-levels-${today}.csv`, rows);
      },
    },
    {
      id: 'inventory-expiry',
      title: 'Expiry Tracking Report',
      desc: `${lowStock.filter(p => p.stockQuantity === 0).length} out of stock · ${lowStock.filter(p => p.stockQuantity > 0).length} low stock items`,
      icon: Calendar, color: '#EF4444', category: 'Inventory',
      lastGenerated: today,
      onExport: () => {
        const rows = [
          ['Product', 'Category', 'Stock Qty', 'Cost Price', 'Alert'],
          ...lowStock.map(p => [
            p.name, p.category, String(p.stockQuantity),
            p.costPrice.toFixed(2),
            p.stockQuantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
          ]),
        ];
        downloadCSV(`low-stock-${today}.csv`, rows);
      },
    },
    {
      id: 'staff-performance',
      title: 'Staff Performance Report',
      desc: `${staff.length} staff members · ${staff.filter(s => s.isOnDuty).length} currently on duty`,
      icon: Users, color: '#8B5CF6', category: 'Staff',
      lastGenerated: today,
      onExport: () => {
        const rows = [
          ['Name', 'Email', 'Role', 'Branch', 'On Duty', 'Active'],
          ...staff.map(s => [
            s.name, s.email, s.role,
            s.branch?.name || 'N/A',
            s.isOnDuty ? 'Yes' : 'No',
            s.isActive ? 'Yes' : 'No',
          ]),
        ];
        downloadCSV(`staff-performance-${today}.csv`, rows);
      },
    },
    {
      id: 'financial-pl',
      title: 'Profit & Loss Statement',
      desc: `Revenue GH₵ ${totalRevenue.toFixed(2)} · COGS GH₵ ${totalCogs.toFixed(2)} · Net GH₵ ${netProfit.toFixed(2)}`,
      icon: FileText, color: '#EC4899', category: 'Financial',
      lastGenerated: today,
      onExport: () => {
        const rows = [
          ['Account', 'Amount (GH₵)'],
          ['Total Revenue', totalRevenue.toFixed(2)],
          ['Cost of Goods Sold (Actuals)', totalCogs.toFixed(2)],
          ['Gross Profit', (totalRevenue - totalCogs).toFixed(2)],
          ['Gross Margin %', totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%'],
          ['Net Profit', netProfit.toFixed(2)],
        ];
        downloadCSV(`profit-loss-${today}.csv`, rows);
      },
    },
  ];

  const filtered = REPORTS.filter(r => activeCategory === 'All' || r.category === activeCategory);

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Reports</h1>
          <p className="text-sm" style={{ color: card.muted }}>Live data — export any report as CSV instantly.</p>
        </div>
        {/* Live summary strip */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Today Revenue', value: `GH₵ ${todaySales.reduce((s, x) => s + x.totalAmount, 0).toFixed(2)}`, color: '#10B981' },
            { label: 'Low Stock', value: String(lowStock.length), color: '#F59E0B' },
            { label: 'Staff On Duty', value: String(staff.filter(s => s.isOnDuty).length), color: '#0EA5E9' },
          ].map(k => (
            <div key={k.label} className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: `${k.color}15`, color: k.color, border: `1px solid ${k.color}30` }}>
              {k.label}: {k.value}
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeCategory === cat ? card.primaryBg : card.bg,
              color: activeCategory === cat ? card.primary : card.muted,
              border: `1px solid ${activeCategory === cat ? card.primaryBorder : card.border}`,
              boxShadow: activeCategory === cat ? 'none' : card.shadow,
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(report => {
          const Icon = report.icon;
          const isGenerating = generating === report.id;
          return (
            <div key={report.id}
              className="rounded-2xl border backdrop-blur-xl p-5 transition-all hover:scale-[1.01] group"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ background: `${report.color}18`, color: report.color }}>
                  <Icon size={22} />
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: `${report.color}15`, color: report.color }}>
                  {report.category}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold mb-1" style={{ color: card.text }}>{report.title}</h3>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: card.muted }}>{report.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: card.subtle }}>
                  Updated: {report.lastGenerated}
                </span>
                <button
                  onClick={async () => {
                    setGenerating(report.id);
                    await new Promise(r => setTimeout(r, 400));
                    report.onExport();
                    setGenerating(null);
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: isGenerating ? `${report.color}30` : card.primaryBg,
                    color: isGenerating ? report.color : card.primary,
                    border: `1px solid ${card.primaryBorder}`,
                    opacity: isGenerating ? 0.7 : 1,
                  }}>
                  <Download size={13} />
                  {isGenerating ? 'Generating...' : 'Export CSV'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
