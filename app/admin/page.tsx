'use client';

import { motion } from 'framer-motion';
import { PharmaChart, MolecularBg, AnimatedCounter } from '@/components/pharma-chart';
import {
  TrendingUp, Users, Package, AlertTriangle, Activity, RefreshCw, Loader2,
  PackageX, UserCheck, ShoppingBag, CreditCard, ArrowRight, Flame,
  CalendarClock, BarChart3, ChevronRight, Clock, DollarSign, TrendingDown,
  Calendar
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCustomAuth } from '@/lib/custom-auth';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/pharma-toast';
import { gql, M_ASK_NEXUS_AI } from '@/lib/gql';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useBranch, useBranchFilter } from '@/lib/branch-context';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function AdminDashboardPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { sales: allSales, invoices, staff: allStaff, products, customers, expenses: allExpenses, refetchSales, refetchInvoices, refetchStaff, refetchProducts, refetchCustomers, refetchExpenses, loadingSales, loadingInvoices } = useStore();
  const { session } = useCustomAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const { activeBranchId } = useBranch();
  const branchFilter = useBranchFilter();

  const sales = useMemo(() => branchFilter(allSales), [branchFilter, allSales]);
  const staff = useMemo(() => branchFilter(allStaff), [branchFilter, allStaff]);
  const expenses = useMemo(() => branchFilter(allExpenses), [branchFilter, allExpenses]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState("Loading AI analytical forecast based on live database data...");

  // Chart Metric Toggle
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'sales'>('revenue');

  // Date Range State
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | '1y' | 'custom'>('7d');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().split('T')[0]);

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

  const sanitizeAiInsight = (raw: string): string => {
    let text = raw
      .replace(/✦ Azzay NEXUS AI \(Simulation\) ✦\n\n?/g, '')
      .replace(/✦ NEXUS AI ✦\n\n?/g, '')
      .trim();
    if (text.startsWith('{') || text.includes('"code":429') || text.includes('RESOURCE_EXHAUSTED') || text.includes('"status":"RESOURCE_EXHAUSTED"')) {
      return 'All AI models are currently at capacity (free-tier quota reached). The insight engine will retry automatically. Manual recommendation: review low-stock items and pending invoices.';
    }
    if (text.includes('API_KEY') || text.includes('INVALID_ARGUMENT')) {
      return 'API key is invalid or not configured. Please check your GEMINI_API_KEY in api/.env.';
    }
    return text || 'NEXUS AI is analyzing live data. Check back shortly.';
  };

  const fetchAiInsight = async () => {
    if (insightLoading) return;
    setInsightLoading(true);
    try {
      const res = await gql<{ askNexusAi: string }>(M_ASK_NEXUS_AI, {
        prompt: "Generate a short, 2-sentence actionable insight regarding our current stock levels, expiry warnings, and forecasting for the next 30 days based on the live data provided."
      });
      if (res && res.askNexusAi) {
        setInsightText(sanitizeAiInsight(res.askNexusAi));
      } else {
        setInsightText("NEXUS AI is currently analyzing data. Check back shortly.");
      }
    } catch (e) {
      console.error('AI fetch failed:', e);
      setInsightText("AI insight generation temporarily offline. Please try again shortly.");
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await refetchSales(activeBranchId ?? undefined, rangeBounds.start.toISOString(), rangeBounds.end.toISOString());
      if (invoices.length === 0) await refetchInvoices();
      if (allStaff.length === 0) await refetchStaff();
      if (products.length === 0) await refetchProducts();
      if (customers.length === 0) await refetchCustomers();
      if (allExpenses.length === 0) await refetchExpenses();
      
      setTimeout(() => {
        fetchAiInsight();
      }, 1500);
    };
    if (mounted && session?.access_token) loadData();
  }, [mounted, rangeBounds.start, rangeBounds.end, session?.access_token]);

  const timeSeriesData = useMemo(() => {
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
    const salesVolumeMap = new Map<string, number>();

    sales.filter(s => inRange(s.createdAt)).forEach(s => {
      const key = bucketKey(new Date(s.createdAt));
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(s.totalAmount || 0));
      salesVolumeMap.set(key, (salesVolumeMap.get(key) || 0) + 1);
    });

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
      sales: salesVolumeMap.get(label) || 0,
    }));
  }, [sales, rangeBounds, inRange]);

  const chartSeries = useMemo(() => [
    { key: 'sales', name: 'Sales Volume', color: '#00D9FF', data: timeSeriesData.map(d => ({ label: d.label, value: d.sales })) },
    { key: 'revenue', name: 'Financial Revenue', color: '#A855F7', data: timeSeriesData.map(d => ({ label: d.label, value: d.revenue })) },
  ], [timeSeriesData]);

  // Real KPIs calculation
  const pendingInvoices = useMemo(() => invoices.filter(i => i.paymentStatus !== 'PAID').length, [invoices]);
  const activeStaffCount = useMemo(() => staff.filter(s => s.isActive).length, [staff]);
  const staffOnDuty = useMemo(() => staff.filter(s => s.isOnDuty).length, [staff]);
  const stockValue = useMemo(() => products.reduce((acc, p) => acc + (p.stockQuantity * (p.costPrice || p.sellingPrice || 0)), 0), [products]);

  const criticalStock = useMemo(() => products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5), [products]);
  const outOfStock = useMemo(() => products.filter(p => p.stockQuantity === 0), [products]);
  const expiringIn30 = useMemo(() => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return products.filter(p => p.stockItems?.some((item: any) => item.expiryDate && new Date(item.expiryDate) <= soon && new Date(item.expiryDate) > new Date()));
  }, [products]);

  // Metrics that respond to Date Range
  const periodSalesData = useMemo(() => sales.filter(s => inRange(s.createdAt)), [sales, inRange]);
  const periodRevenue = useMemo(() => periodSalesData.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0), [periodSalesData]);

  const topProductPeriod = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    periodSalesData.forEach(s => {
      s.items?.forEach((item: any) => {
        const name = item.product?.name || item.name || 'Unknown';
        if (!counts[name]) counts[name] = { name, qty: 0, revenue: 0 };
        counts[name].qty += item.quantity || 1;
        counts[name].revenue += item.total || 0;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty)[0] || null;
  }, [periodSalesData]);

  const totalSupplierDebt = useMemo(() => invoices.filter(i => i.paymentStatus !== 'PAID').reduce((acc, i) => acc + (i.balance || 0), 0), [invoices]);

  const periodExpenses = useMemo(() => expenses.filter(e => inRange(e.date || e.createdAt)).reduce((acc, e) => acc + (e.amount || 0), 0), [expenses, inRange]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `GH₵ ${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `GH₵ ${(val / 1000).toFixed(1)}k`;
    return `GH₵ ${val.toLocaleString()}`;
  };

  const recentActivities = useMemo(() => {
    const activities: { time: string; desc: string; type: string; date: number; link: string }[] = [];
    const recentSales = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
    for (const sale of recentSales) {
      activities.push({
        time: new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        desc: `Sale GH₵ ${sale.totalAmount.toLocaleString()} by ${sale.user?.name || 'Cashier'} (${sale.items.length} items)`,
        type: 'finance',
        date: new Date(sale.createdAt).getTime(),
        link: '/admin/reports',
      });
    }
    if (activities.length < 5) {
      const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5 - activities.length);
      for (const inv of recentInvoices) {
        activities.push({
          time: new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          desc: `Invoice #${inv.invoiceNo} from ${inv.supplier?.name || 'Supplier'}`,
          type: 'stock',
          date: new Date(inv.createdAt).getTime(),
          link: '/admin/invoices',
        });
      }
    }
    const outOfStockItems = products.filter(p => p.stockQuantity === 0).slice(0, 2);
    for (const p of outOfStockItems) {
      activities.push({
        time: 'Alert',
        desc: `${p.name} is out of stock`,
        type: 'alert',
        date: Date.now() - 1000,
        link: '/dashboard/inventory',
      });
    }
    if (activities.length === 0) {
      activities.push({ time: 'Just now', desc: 'System online and synced with NEXUS core', type: 'system', date: Date.now(), link: '/admin' });
    }
    return activities.sort((a, b) => b.date - a.date).slice(0, 5);
  }, [sales, invoices, products]);

  const cardStyle = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 pb-8">
      {/* Header & Date Filters */}
      <motion.div variants={itemVariants} className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 dark:from-teal-400 dark:to-emerald-400">
            Command Center
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
            Real-time operational intelligence — sales, stock, staff, and finances.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
            {(['today', '7d', '30d', '90d', '1y'] as const).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: dateRange === r ? (isDark ? 'rgba(0,217,255,0.15)' : '#fff') : 'transparent',
                  color: dateRange === r ? cardStyle.primary : cardStyle.muted,
                  boxShadow: dateRange === r ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)') : 'none',
                }}>
                {r === 'today' ? 'Today' : r === '7d' ? '7D' : r === '30d' ? '30D' : r === '90d' ? '90D' : '1Y'}
              </button>
            ))}
            <button onClick={() => setDateRange(dateRange === 'custom' ? '7d' : 'custom')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              style={{
                background: dateRange === 'custom' ? (isDark ? 'rgba(0,217,255,0.15)' : '#fff') : 'transparent',
                color: dateRange === 'custom' ? cardStyle.primary : cardStyle.muted,
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
                style={{ background: cardStyle.bg, border: `1px solid ${cardStyle.border}`, color: cardStyle.text }} />
              <span style={{ color: cardStyle.muted }}>—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium outline-none"
                style={{ background: cardStyle.bg, border: `1px solid ${cardStyle.border}`, color: cardStyle.text }} />
            </div>
          )}
          <button
            onClick={async () => {
              setIsSyncing(true);
              addToast?.({ type: 'info', title: 'Syncing...', message: 'Refreshing all data' });
              await Promise.all([refetchSales(), refetchInvoices(), refetchStaff(), refetchProducts(), refetchCustomers(), refetchExpenses()]);
              setIsSyncing(false);
              addToast?.({ type: 'success', title: 'Sync Complete', message: 'All data is up to date' });
            }}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{ background: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)', color: cardStyle.primary, border: `1px solid ${isDark ? 'rgba(0,217,255,0.3)' : 'rgba(14,165,233,0.3)'}` }}
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </motion.div>

      {/* Main Chart Area & KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Glowing Interactive Curve Chart */}
        <div className="lg:col-span-3 rounded-[24px] border p-6 backdrop-blur-xl relative overflow-hidden"
             style={{ background: cardStyle.bg, borderColor: cardStyle.border, boxShadow: cardStyle.shadow }}>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-bold flex items-center gap-2" style={{ color: cardStyle.text }}>
                <Activity size={20} className={activeMetric === 'revenue' ? "text-emerald-400" : "text-sky-400"} /> 
                Pharmacokinetic Momentum
              </h2>
              <p className="text-xs" style={{ color: cardStyle.muted }}>Activity over {dateRange === 'custom' ? 'selected period' : 'the ' + dateRange}</p>
            </div>
            
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
              <button 
                onClick={() => setActiveMetric('revenue')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeMetric === 'revenue' ? (isDark ? 'rgba(16,185,129,0.15)' : '#fff') : 'transparent',
                  color: activeMetric === 'revenue' ? '#10B981' : cardStyle.muted,
                  boxShadow: activeMetric === 'revenue' ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)') : 'none',
                }}>
                Revenue
              </button>
              <button 
                onClick={() => setActiveMetric('sales')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeMetric === 'sales' ? (isDark ? 'rgba(14,165,233,0.15)' : '#fff') : 'transparent',
                  color: activeMetric === 'sales' ? '#0EA5E9' : cardStyle.muted,
                  boxShadow: activeMetric === 'sales' ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)') : 'none',
                }}>
                Sales Volume
              </button>
            </div>
          </div>
          <div className="relative z-10">
            <PharmaChart 
              data={activeMetric === 'revenue' 
                ? timeSeriesData.map(d => ({ day: d.label, amount: d.revenue }))
                : timeSeriesData.map(d => ({ day: d.label, amount: d.sales }))
              } 
              isDark={isDark} 
              accent={activeMetric === 'revenue' ? '#10B981' : '#0EA5E9'} 
              height={260}
              valuePrefix={activeMetric === 'revenue' ? 'GH₵' : ''}
              valueSuffix={activeMetric === 'sales' ? ' txns' : ''}
            />
          </div>
          <MolecularBg isDark={isDark} />
        </div>

        {/* 4 Primary KPIs in a Column/Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {[
            { label: 'Revenue', value: formatCurrency(periodRevenue), sub: `${periodSalesData.length} transactions in ${dateRange === 'custom' ? 'period' : dateRange === 'today' ? 'today' : dateRange.toUpperCase()}`, icon: DollarSign, color: '#10B981', gradient: 'from-emerald-500/20 to-teal-500/5', route: '/admin/reports/sales' },
            { label: 'Expenses', value: formatCurrency(periodExpenses), sub: `${expenses.filter(e => inRange(e.date || e.createdAt)).length} records in ${dateRange === 'custom' ? 'period' : dateRange === 'today' ? 'today' : dateRange.toUpperCase()}`, icon: TrendingDown, color: '#0EA5E9', gradient: 'from-sky-500/20 to-cyan-500/5', route: '/admin/reports/financial/expenses' },
            { label: 'Staff On Duty', value: `${staffOnDuty} / ${activeStaffCount}`, sub: 'active staff members', icon: UserCheck, color: '#8B5CF6', gradient: 'from-violet-500/20 to-purple-500/5', route: '/admin/staff' },
            { label: 'Stock Value', value: formatCurrency(stockValue), sub: `${products.length} products`, icon: Package, color: '#F59E0B', gradient: 'from-amber-500/20 to-orange-500/5', route: '/dashboard/inventory' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Link href={s.route} key={s.label}>
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-2xl border p-5 backdrop-blur-xl relative overflow-hidden group h-full cursor-pointer transition-all"
                  style={{ background: cardStyle.bg, borderColor: cardStyle.border, boxShadow: cardStyle.shadow }}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl" style={{ background: `${s.color}18`, color: s.color, boxShadow: `0 0 20px ${s.color}20` }}>
                        <Icon size={18} />
                      </div>
                      {s.label === 'Staff On Duty' && staffOnDuty > 0 && (
                         <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${s.color}18`, color: s.color }}>
                           <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Live
                         </span>
                      )}
                    </div>
                    <div>
                      <p className="font-display text-2xl font-black" style={{ color: cardStyle.text }}>{s.value}</p>
                      <p className="text-xs font-bold mt-1 uppercase tracking-wider" style={{ color: cardStyle.muted }}>{s.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: cardStyle.muted, opacity: 0.8 }}>{s.sub}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Row 2 — AI Insight & Alerts */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* NEXUS AI Insight Panel */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0F2044] dark:to-[#1A3060] text-white shadow-xl border dark:border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 dark:bg-teal-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
          
          <h3 className="text-xl font-display font-black mb-3 relative z-10 flex items-center justify-between gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 dark:from-teal-300 dark:to-emerald-300">
              NEXUS AI Insight
            </span>
            <button onClick={fetchAiInsight} disabled={insightLoading} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <RefreshCw size={16} className={insightLoading ? 'animate-spin text-teal-300' : 'text-slate-300'} />
            </button>
          </h3>
          
          {insightLoading ? (
            <div className="flex items-center gap-3 mb-6 relative z-10 h-20">
              <Loader2 size={20} className="animate-spin text-teal-300 flex-shrink-0" />
              <p className="text-slate-300 font-medium">Analyzing live database signals...</p>
            </div>
          ) : (
            <p className="text-slate-200 text-base mb-8 relative z-10 leading-relaxed font-medium min-h-[80px] whitespace-pre-line border-l-2 border-teal-500 pl-4">
              {insightText}
            </p>
          )}
          
          <div className="relative z-10 flex gap-3 flex-wrap">
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="px-5 py-2.5 bg-white dark:bg-teal-500 text-slate-900 dark:text-white font-bold rounded-xl text-sm hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-teal-500/20"
            >
              Review Inventory
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-colors border border-white/10"
            >
              Full Reports
            </button>
          </div>
        </div>

        {/* Stock Alerts Minimal */}
        <div className="rounded-[24px] border p-6 backdrop-blur-xl relative overflow-hidden"
             style={{ background: cardStyle.bg, borderColor: cardStyle.border, boxShadow: cardStyle.shadow }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: cardStyle.text }}>
              <PackageX size={20} className="text-red-500" /> Action Items
            </h3>
            <Link href="/dashboard/inventory" className="text-xs font-bold hover:underline" style={{ color: cardStyle.primary }}>View all</Link>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FECACA' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Out of Stock</p>
                <p className="text-2xl font-black text-red-700 dark:text-red-300">{outOfStock.length}</p>
              </div>
              <PackageX size={28} className="text-red-400/50" />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED', borderColor: isDark ? 'rgba(249,115,22,0.2)' : '#FFEDD5' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">Low Stock (≤5)</p>
                <p className="text-2xl font-black text-orange-700 dark:text-orange-300">{criticalStock.length}</p>
              </div>
              <AlertTriangle size={28} className="text-orange-400/50" />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: isDark ? 'rgba(234,179,8,0.1)' : '#FEFCE8', borderColor: isDark ? 'rgba(234,179,8,0.2)' : '#FEF08A' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">Expiring 30d</p>
                <p className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{expiringIn30.length}</p>
              </div>
              <CalendarClock size={28} className="text-yellow-400/50" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Row 3 — Financial Snapshot, Top Seller, Feed */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Snapshot */}
        <div className="rounded-[24px] border p-6 backdrop-blur-xl" style={{ background: cardStyle.bg, borderColor: cardStyle.border, boxShadow: cardStyle.shadow }}>
          <h3 className="font-display font-bold text-lg mb-5 flex items-center gap-2" style={{ color: cardStyle.text }}>
            <BarChart3 size={20} className="text-emerald-500" /> Financial Snapshot
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cardStyle.muted }}>{dateRange === 'today' ? 'Revenue (Today)' : dateRange === 'custom' ? 'Revenue (Period)' : `Revenue (${dateRange.toUpperCase()})`}</p>
              <p className="text-xl font-black text-emerald-500">{formatCurrency(periodRevenue)}</p>
            </div>
            <div className="w-full h-px" style={{ background: cardStyle.border }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cardStyle.muted }}>{dateRange === 'today' ? 'Expenses (Today)' : dateRange === 'custom' ? 'Expenses (Period)' : `Expenses (${dateRange.toUpperCase()})`}</p>
              <p className="text-xl font-black text-red-500">{formatCurrency(periodExpenses)}</p>
            </div>
            <div className="w-full h-px" style={{ background: cardStyle.border }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cardStyle.muted }}>Supplier Debt</p>
              <p className="text-xl font-black text-orange-500">{formatCurrency(totalSupplierDebt)}</p>
            </div>
          </div>
        </div>

        {/* Top Seller Today */}
        <div className="rounded-[24px] border p-6 backdrop-blur-xl flex flex-col" style={{ background: cardStyle.bg, borderColor: cardStyle.border, boxShadow: cardStyle.shadow }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: cardStyle.text }}>
              <Flame size={20} className="text-orange-500" /> Top Seller
            </h3>
            <Link href="/admin/reports/sales" className="text-xs font-bold hover:underline" style={{ color: cardStyle.primary }}>Sales</Link>
          </div>
          {topProductPeriod ? (
            <div className="flex-1 flex flex-col justify-center">
              <div className="p-5 rounded-2xl border" style={{ background: isDark ? 'rgba(249,115,22,0.05)' : '#FFF7ED', borderColor: isDark ? 'rgba(249,115,22,0.2)' : '#FFEDD5' }}>
                <p className="font-black text-xl leading-tight mb-4" style={{ color: cardStyle.text }}>{topProductPeriod.name}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">Units Sold</p>
                    <p className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">{topProductPeriod.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-teal-400">Revenue</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-teal-400">{formatCurrency(topProductPeriod.revenue)}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-4 text-center font-medium" style={{ color: cardStyle.muted }}>Based on {periodSalesData.length} transactions in {dateRange === 'custom' ? 'period' : dateRange === 'today' ? 'today' : dateRange.toUpperCase()}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: cardStyle.muted }}>
              <ShoppingBag size={40} className="opacity-30 mb-2" />
              <p className="text-sm font-medium">No sales recorded in this period yet</p>
            </div>
          )}
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-[24px] border p-6 backdrop-blur-xl" style={{ background: cardStyle.bg, borderColor: cardStyle.border, boxShadow: cardStyle.shadow }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: cardStyle.text }}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-teal-400 animate-pulse" /> Live Feed
            </h3>
            <Link href="/admin/reports" className="text-xs font-bold hover:underline" style={{ color: cardStyle.primary }}>View all</Link>
          </div>
          <div className="space-y-1">
            {recentActivities.map((activity, i) => (
              <Link key={i} href={activity.link} className="flex gap-3 items-start p-2.5 rounded-xl transition-colors group hover:bg-black/5 dark:hover:bg-white/5">
                <div className={`w-2.5 h-2.5 mt-1.5 flex-shrink-0 rounded-full ${
                  activity.type === 'finance' ? 'bg-emerald-500 dark:bg-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                  activity.type === 'stock' ? 'bg-orange-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                  activity.type === 'alert' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-500 dark:bg-sky-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate transition-colors group-hover:text-sky-500" style={{ color: cardStyle.text }}>{activity.desc}</p>
                  <p className="text-[10px] mt-0.5 flex items-center gap-1 font-medium" style={{ color: cardStyle.muted }}>
                    <Clock size={10} /> {activity.time}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </motion.div>

      {/* Pending Invoices Action Banner */}
      {pendingInvoices > 0 && (
        <motion.div variants={itemVariants}>
          <Link href="/admin/invoices">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.01]" 
              style={{ background: isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED', borderColor: isDark ? 'rgba(249,115,22,0.3)' : '#FFEDD5' }}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/20 text-orange-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="font-display font-black text-lg text-orange-700 dark:text-orange-400">{pendingInvoices} supplier invoice{pendingInvoices > 1 ? 's' : ''} pending payment</p>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-500 mt-0.5">Outstanding balance: <span className="font-bold">{formatCurrency(totalSupplierDebt)}</span></p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center gap-1 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors">
                Pay Now <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
