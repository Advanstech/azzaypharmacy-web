'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { PharmaChart, MolecularBg, AnimatedCounter } from '@/components/pharma-chart';
import { useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';
import {
  TrendingUp, TrendingDown, BarChart3, Calendar, Download, DollarSign,
  ShoppingBag, Users, Percent, Package, Pill, Clock, CreditCard,
  Smartphone, Banknote, ShieldAlert, ChevronRight, Target, Activity,
  FileText, Printer, ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';

const PERIODS = ['Today', '7 Days', '30 Days', '90 Days', 'Year'];

function useCardStyles(isDark: boolean) {
  return useMemo(() => ({
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    success: isDark ? '#34D399' : '#059669',
    danger: '#EF4444',
    warning: '#F59E0B',
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
  }), [isDark]);
}

export default function AnalyticsPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const [period, setPeriod] = useState('7 Days');

  const { sales, products, staff, customers, loadingSales } = useStore();
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as string) || '';
  const isManagement = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role);

  const branchFilter = useBranchFilter();
  const branchSales = useMemo(() => branchFilter(sales), [branchFilter, sales]);
  const branchProducts = useMemo(() => branchFilter(products), [branchFilter, products]);

  const s = useCardStyles(isDark);
  const now = new Date();
  const periodDays = period === 'Today' ? 1 : period === '7 Days' ? 7 : period === '30 Days' ? 30 : period === '90 Days' ? 90 : 365;
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const periodSales = useMemo(() => branchSales.filter(s => new Date(s.createdAt) >= cutoff), [branchSales, cutoff]);
  const prevCutoff = new Date(cutoff.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevSales = useMemo(() => branchSales.filter(s => new Date(s.createdAt) >= prevCutoff && new Date(s.createdAt) < cutoff), [branchSales, prevCutoff, cutoff]);

  const totalRevenue = periodSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const prevRevenue = prevSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const totalTransactions = periodSales.length;
  const prevTxns = prevSales.length;
  const txnChange = prevTxns > 0 ? ((totalTransactions - prevTxns) / prevTxns) * 100 : 0;

  const avgSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const prevAvg = prevTxns > 0 ? prevRevenue / prevTxns : 0;
  const avgChange = prevAvg > 0 ? ((avgSaleValue - prevAvg) / prevAvg) * 100 : 0;

  // Revenue trajectory data (period-aware)
  const revenueByDay = useMemo(() => {
    if (periodDays <= 30) {
      const labels: string[] = [];
      const values: number[] = [];

      for (let i = periodDays - 1; i >= 0; i--) {
        const dayDate = new Date(now.getTime() - i * 86400000);
        labels.push(
          periodDays <= 7
            ? dayDate.toLocaleDateString('en-GB', { weekday: 'short' })
            : dayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        );
        values.push(0);
      }

      periodSales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        const dayStart = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.floor((todayStart.getTime() - dayStart.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < periodDays) {
          const idx = periodDays - 1 - diffDays;
          values[idx] += sale.totalAmount;
        }
      });

      return labels.map((label, idx) => ({ day: label, amount: values[idx] }));
    }

    // Weekly buckets for longer periods (90 days / year)
    const weekCount = periodDays === 90 ? 13 : periodDays >= 365 ? 52 : 12;
    const labels: string[] = [];
    const values = Array.from({ length: weekCount }, () => 0);

    // Generate readable labels based on period
    if (periodDays === 30) {
      // 30 days: show date every 5 days
      for (let i = 0; i < weekCount; i++) {
        const dayDate = new Date(now.getTime() - (weekCount - 1 - i) * 7 * 86400000);
        labels.push(dayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      }
    } else if (periodDays >= 365) {
      // Year: show month names (sample every 4 weeks)
      for (let i = 0; i < weekCount; i += 4) {
        const weekDate = new Date(now.getTime() - (weekCount - 1 - i) * 7 * 86400000);
        labels.push(weekDate.toLocaleDateString('en-GB', { month: 'short' }));
        // Fill gaps with empty strings to maintain alignment
        for (let j = 1; j < 4 && i + j < weekCount; j++) {
          labels.push('');
        }
      }
      // Trim to exact weekCount
      labels.splice(weekCount);
    } else {
      // 90 days: use week numbers
      for (let i = 0; i < weekCount; i++) {
        labels.push(`W${i + 1}`);
      }
    }

    periodSales.forEach((sale) => {
      const saleTime = new Date(sale.createdAt).getTime();
      const diffDays = Math.floor((now.getTime() - saleTime) / 86400000);
      if (diffDays >= 0 && diffDays <= periodDays) {
        const idx = weekCount - 1 - Math.min(weekCount - 1, Math.floor(diffDays / 7));
        values[idx] += sale.totalAmount;
      }
    });

    return labels.map((label, idx) => ({ day: label, amount: values[idx] }));
  }, [periodDays, periodSales, now]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; name: string; qty: number; revenue: number; category: string }> = {};
    periodSales.forEach(s => s.items.forEach(item => {
      const id = item.product?.id || item.id;
      const n = item.product?.name || 'Unknown';
      const cat = item.product?.category || 'MISCELLANEOUS';
      if (!map[id]) map[id] = { id, name: n, qty: 0, revenue: 0, category: cat };
      map[id].qty += item.quantity;
      map[id].revenue += item.total;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [periodSales]);

  const productInsights = useMemo(() => {
    const totalUnits = topProducts.reduce((sum, product) => sum + product.qty, 0);
    const topRevenue = topProducts.reduce((sum, product) => sum + product.revenue, 0);
    const leadingProduct = topProducts[0];
    const leadingShare = totalRevenue > 0 && leadingProduct ? (leadingProduct.revenue / totalRevenue) * 100 : 0;
    const avgUnits = topProducts.length > 0 ? totalUnits / topProducts.length : 0;

    return { totalUnits, topRevenue, leadingProduct, leadingShare, avgUnits };
  }, [topProducts, totalRevenue]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; qty: number }> = {};
    periodSales.forEach(s => s.items.forEach(item => {
      const cat = item.product?.category || 'MISCELLANEOUS';
      if (!map[cat]) map[cat] = { revenue: 0, qty: 0 };
      map[cat].revenue += item.total;
      map[cat].qty += item.quantity;
    }));
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [periodSales]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    periodSales.forEach(s => { counts[s.paymentMethod] = (counts[s.paymentMethod] || 0) + s.totalAmount; });
    const total = totalRevenue || 1;
    return [
      { method: 'Cash', amount: counts['CASH'] || 0, pct: Math.round(((counts['CASH'] || 0) / total) * 100), color: '#0EA5E9', icon: Banknote },
      { method: 'MoMo', amount: counts['MOMO'] || 0, pct: Math.round(((counts['MOMO'] || 0) / total) * 100), color: '#10B981', icon: Smartphone },
      { method: 'Card', amount: counts['CARD'] || 0, pct: Math.round(((counts['CARD'] || 0) / total) * 100), color: '#8B5CF6', icon: CreditCard },
      { method: 'NHIS', amount: counts['NHIS'] || 0, pct: Math.round(((counts['NHIS'] || 0) / total) * 100), color: '#F59E0B', icon: ShieldAlert },
    ].filter(p => p.amount > 0);
  }, [periodSales, totalRevenue]);

  // Staff performance
  const staffPerformance = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; txns: number }> = {};
    periodSales.forEach(s => {
      const name = s.user?.name || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, txns: 0 };
      map[name].revenue += s.totalAmount;
      map[name].txns += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [periodSales]);

  // Hourly distribution
  const hourlyDist = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8AM to 7PM
    const map: Record<number, number> = {};
    periodSales.forEach(s => {
      const h = new Date(s.createdAt).getHours();
      if (h >= 8 && h <= 19) map[h] = (map[h] || 0) + s.totalAmount;
    });
    const maxH = Math.max(...Object.values(map), 1);
    return hours.map(h => ({ hour: `${h}:00`, amount: map[h] || 0, pct: ((map[h] || 0) / maxH) * 100 }));
  }, [periodSales]);

  const kpis = [
    { label: 'Total Revenue', value: totalRevenue, prefix: 'GH₵ ', icon: DollarSign, color: s.primary, change: revenueChange },
    { label: 'Transactions', value: totalTransactions, prefix: '', icon: ShoppingBag, color: s.success, change: txnChange },
    { label: 'Avg Sale', value: avgSaleValue, prefix: 'GH₵ ', icon: Target, color: '#8B5CF6', change: avgChange },
    { label: 'Products', value: branchProducts.length, prefix: '', icon: Package, color: '#EC4899', change: 0 },
  ];

  if (!mounted) return (
    <div className="w-full h-96 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderTopColor: 'transparent', borderColor: isDark ? '#00D9FF' : '#0EA5E9' }} />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BranchBanner />
      {/* ── HEADER ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: s.text }}>Executive Analytics</h1>
          <p className="text-xs mt-1" style={{ color: s.muted }}>Full operational intelligence · {period}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl p-1 gap-1 border" style={{ background: s.bg, borderColor: s.border }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{ background: period === p ? `${s.primary}18` : 'transparent', color: period === p ? s.primary : s.subtle, border: period === p ? `1px solid ${s.primary}40` : '1px solid transparent' }}>
                {p}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all"
            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.muted }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── KPI ROW ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.01]"
            style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg" style={{ background: `${kpi.color}18`, color: kpi.color }}>
                <kpi.icon size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.subtle }}>{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold mb-1" style={{ color: s.text }}>
              {kpi.prefix}{kpi.value.toLocaleString('en-GH', { minimumFractionDigits: kpi.label === 'Products' ? 0 : 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1">
              {kpi.change !== 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: kpi.change > 0 ? s.success : s.danger }}>
                  {kpi.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(kpi.change).toFixed(1)}%
                </span>
              )}
              <span className="text-[10px]" style={{ color: s.subtle }}>vs previous</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── REVENUE TRAJECTORY ─────────────────────────────── */}
      <div className="rounded-2xl border p-6 backdrop-blur-xl relative overflow-hidden"
        style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
        <div className="relative z-10 flex items-center justify-between mb-2">
          <div>
            <h3 className="font-display text-sm font-bold" style={{ color: s.text }}>Revenue Trajectory</h3>
            <p className="text-[11px]" style={{ color: s.subtle }}>
              {periodDays <= 7 ? 'Daily pharmacokinetic curve' : 
               periodDays <= 30 ? `${periodDays}-day pharmacokinetic curve` : 
               periodDays <= 90 ? 'Weekly pharmacokinetic curve' : 'Yearly pharmacokinetic curve'}
            </p>
          </div>
          <div className="text-right">
            <span className="font-display text-2xl font-bold" style={{ color: s.primary }}>
              <AnimatedCounter value={totalRevenue} prefix="GH₵" isDark={isDark} duration={2000} />
            </span>
            <p className="text-[10px]" style={{ color: s.muted }}>{period} total</p>
          </div>
        </div>
        <PharmaChart data={revenueByDay} isDark={isDark} accent={s.primary} height={240} />
        <MolecularBg isDark={isDark} />
      </div>

      {/* ── CATEGORY + PAYMENT + HOURLY ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Category Breakdown */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <h3 className="font-display text-sm font-bold mb-1" style={{ color: s.text }}>Category Performance</h3>
          <p className="text-[11px] mb-4" style={{ color: s.subtle }}>Revenue by drug category</p>
          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: s.muted }}>No category data</p>
            ) : categoryBreakdown.map(cat => {
              const totalCatRev = categoryBreakdown.reduce((sum, c) => sum + c.revenue, 0) || 1;
              const pct = (cat.revenue / totalCatRev) * 100;
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: s.text }}>{cat.name}</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: s.primary }}>GH₵{cat.revenue.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.2)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${s.primary}, ${s.success})` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Mix */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <h3 className="font-display text-sm font-bold mb-1" style={{ color: s.text }}>Payment Mix</h3>
          <p className="text-[11px] mb-4" style={{ color: s.subtle }}>{period} method distribution</p>
          <div className="space-y-4">
            {paymentBreakdown.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: s.muted }}>No payment data</p>
            ) : paymentBreakdown.map(pm => (
              <div key={pm.method} className="flex items-center gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${pm.color}18`, color: pm.color }}>
                  <pm.icon size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: s.muted }}>{pm.method}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: pm.color }}>GH₵{pm.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pm.pct}%`, background: pm.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Heatmap */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <h3 className="font-display text-sm font-bold mb-1" style={{ color: s.text }}>Hourly Distribution</h3>
          <p className="text-[11px] mb-4" style={{ color: s.subtle }}>Peak trading hours</p>
          <div className="space-y-2">
            {hourlyDist.map(h => (
              <div key={h.hour} className="flex items-center gap-3">
                <span className="text-[10px] font-mono w-10 text-right" style={{ color: s.subtle }}>{h.hour}</span>
                <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(203,213,225,0.15)' }}>
                  <div className="h-full rounded-md transition-all duration-500" style={{ width: `${Math.max(h.pct, 4)}%`, background: h.pct > 50 ? `linear-gradient(90deg, ${s.primary}, ${s.success})` : `${s.primary}40` }} />
                </div>
                <span className="text-[10px] font-mono w-12 text-right" style={{ color: h.amount > 0 ? s.primary : s.subtle }}>
                  {h.amount > 0 ? `GH₵${(h.amount / 1000).toFixed(1)}k` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP PRODUCTS + STAFF PERFORMANCE ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Products */}
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: s.border }}>
            <div>
              <h3 className="font-display text-sm font-bold" style={{ color: s.text }}>Top Products</h3>
              <p className="text-[11px]" style={{ color: s.subtle }}>By revenue · {period}</p>
            </div>
            <Pill size={16} style={{ color: s.primary }} />
          </div>
          <div className="p-4 space-y-2">
            {topProducts.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: s.muted }}>No sales data for this period</p>
            ) : topProducts.map((p, i) => (
              <Link key={p.id} href={`/dashboard/inventory/${p.id}`} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:scale-[1.01]"
                style={{ background: i < 3 ? `${s.primary}08` : 'transparent' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: i === 0 ? `${s.primary}25` : `${s.subtle}15`, color: i === 0 ? s.primary : s.subtle }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: s.text }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: s.subtle }}>{p.qty} units · {p.category}</p>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: s.primary }}>GH₵{p.revenue.toFixed(2)}</span>
                <ChevronRight size={14} style={{ color: s.subtle }} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: s.border }}>
            <div>
              <h3 className="font-display text-sm font-bold" style={{ color: s.text }}>Product Insights</h3>
              <p className="text-[11px]" style={{ color: s.subtle }}>Top 5 concentration analysis</p>
            </div>
            <Activity size={16} style={{ color: s.primary }} />
          </div>
          <div className="p-4 space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: s.muted }}>No product insight available</p>
            ) : (
              <>
                <div className="p-3 rounded-xl" style={{ background: `${s.primary}08` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: s.subtle }}>Leading SKU</p>
                  <p className="text-sm font-bold truncate" style={{ color: s.text }}>{productInsights.leadingProduct?.name}</p>
                  <p className="text-[11px] mt-1" style={{ color: s.muted }}>{productInsights.leadingShare.toFixed(1)}% of period revenue</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(203,213,225,0.18)' }}>
                    <p className="font-display text-lg font-bold" style={{ color: s.success }}>{productInsights.totalUnits.toLocaleString()}</p>
                    <p className="text-[10px]" style={{ color: s.muted }}>Top 5 Units</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(203,213,225,0.18)' }}>
                    <p className="font-display text-lg font-bold" style={{ color: s.primary }}>GH₵{productInsights.topRevenue.toFixed(0)}</p>
                    <p className="text-[10px]" style={{ color: s.muted }}>Top 5 Revenue</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: s.subtle }}>Avg units per top SKU</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: s.primary }}>{productInsights.avgUnits.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.25)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, productInsights.leadingShare)}%`, background: `linear-gradient(90deg, ${s.primary}, ${s.success})` }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Staff Performance */}
        {isManagement && (
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: s.border }}>
              <div>
                <h3 className="font-display text-sm font-bold" style={{ color: s.text }}>Staff Performance</h3>
                <p className="text-[11px]" style={{ color: s.subtle }}>Revenue per team member</p>
              </div>
              <Users size={16} style={{ color: s.primary }} />
            </div>
            <div className="p-4 space-y-2">
              {staffPerformance.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: s.muted }}>No staff sales data</p>
              ) : staffPerformance.map((sp) => (
                <div key={sp.name} className="flex items-center gap-3 p-2.5 rounded-xl">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: `${s.primary}18`, color: s.primary }}>
                    {sp.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: s.text }}>{sp.name}</p>
                    <p className="text-[10px]" style={{ color: s.subtle }}>{sp.txns} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold" style={{ color: s.primary }}>GH₵{sp.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CUSTOMER METRICS ───────────────────────────────── */}
      <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
        <h3 className="font-display text-sm font-bold mb-4" style={{ color: s.text }}>Customer Intelligence</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: customers.length, color: s.primary },
            { label: 'Loyalty Members', value: customers.filter(c => (c.loyaltyPoints ?? 0) > 0).length, color: s.success },
            { label: 'Walk-ins', value: periodSales.filter(s => !s.customerName || s.customerName === 'Walk-in').length, color: s.warning },
            { label: 'Avg Spend', value: customers.length > 0 ? `GH₵${(customers.reduce((s, c) => s + Number(c.totalSpent), 0) / customers.length).toFixed(2)}` : 'GH₵0.00', color: '#8B5CF6' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl text-center" style={{ background: isDark ? 'rgba(0,217,255,0.04)' : 'rgba(14,165,233,0.04)' }}>
              <p className="font-display text-lg font-bold" style={{ color: stat.color }}>{typeof stat.value === 'number' ? stat.value : stat.value}</p>
              <p className="text-[10px]" style={{ color: s.muted }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
