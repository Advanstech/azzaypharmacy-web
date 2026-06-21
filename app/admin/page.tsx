'use client';

import { motion } from 'framer-motion';
import { Finance3DChart } from '@/components/3d-finance-chart';
import {
  TrendingUp, Users, Package, AlertTriangle, Activity, RefreshCw, Loader2,
  PackageX, UserCheck, ShoppingBag, CreditCard, ArrowRight, Flame,
  CalendarClock, BarChart3, ChevronRight, Clock, DollarSign, TrendingDown
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getEffectiveToday } from '@/lib/effective-date';
import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/pharma-toast';
import { gql, M_ASK_NEXUS_AI } from '@/lib/gql';
import Link from 'next/link';

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
  const { sales, invoices, staff, products, customers, expenses, refetchSales, refetchInvoices, refetchStaff, refetchProducts, refetchCustomers, refetchExpenses, loadingSales, loadingInvoices } = useStore();
  const { addToast } = useToast();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState("Loading AI analytical forecast based on live database data...");

  const sanitizeAiInsight = (raw: string): string => {
    // Strip boilerplate prefixes
    let text = raw
      .replace(/✦ Azzay NEXUS AI \(Simulation\) ✦\n\n?/g, '')
      .replace(/✦ NEXUS AI ✦\n\n?/g, '')
      .trim();
    // Detect raw JSON error bleed-through
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

  // Ensure data is loaded on mount
  useEffect(() => {
    const loadData = async () => {
      if (sales.length === 0) await refetchSales();
      if (invoices.length === 0) await refetchInvoices();
      if (staff.length === 0) await refetchStaff();
      if (products.length === 0) await refetchProducts();
      if (customers.length === 0) await refetchCustomers();
      if (expenses.length === 0) await refetchExpenses();
      
      setTimeout(() => {
        fetchAiInsight();
      }, 1500);
    };
    loadData();
  }, []);

  const chartData = useMemo(() => {
    // Generate data for the last 7 days
    const dataMap: Record<string, { sales: number; revenue: number }> = {};
    const now = new Date();
    // Initialize last 7 days to preserve order
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dayStr = d.toLocaleDateString('en-GB', { weekday: 'short' });
      dataMap[dayStr] = { sales: 0, revenue: 0 };
    }

    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    sales.filter(s => new Date(s.createdAt) >= weekAgo).forEach(s => {
      const d = new Date(s.createdAt).toLocaleDateString('en-GB', { weekday: 'short' });
      if (dataMap[d]) {
        dataMap[d].sales += 1; // Count of transactions
        dataMap[d].revenue += s.totalAmount; // Sum of revenue
      }
    });

    return Object.entries(dataMap).map(([day, val]) => ({
      day,
      sales: val.sales,
      revenue: val.revenue
    }));
  }, [sales]);

  // Real KPIs calculation
  const totalRevenue = useMemo(() => sales.reduce((acc, s) => acc + s.totalAmount, 0), [sales]);
  const pendingInvoices = useMemo(() => invoices.filter(i => i.paymentStatus !== 'PAID').length, [invoices]);
  const activeStaffCount = useMemo(() => staff.filter(s => s.isActive).length, [staff]);
  const staffOnDuty = useMemo(() => staff.filter(s => s.isOnDuty).length, [staff]);
  const stockValue = useMemo(() => products.reduce((acc, p) => acc + (p.stockQuantity * (p.costPrice || p.sellingPrice || 0)), 0), [products]);

  // Today's metrics — use effective date (most recent day with data)
  const todayStr = useMemo(() => getEffectiveToday(sales), [sales]);
  const todaySalesData = useMemo(() => sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === todayStr), [sales, todayStr]);
  const todayRevenue = useMemo(() => todaySalesData.reduce((acc, s) => acc + s.totalAmount, 0), [todaySalesData]);

  // Low stock & expiry alerts
  const criticalStock = useMemo(() => products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5), [products]);
  const outOfStock = useMemo(() => products.filter(p => p.stockQuantity === 0), [products]);
  const expiringIn30 = useMemo(() => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return products.filter(p => p.stockItems?.some((item: any) => item.expiryDate && new Date(item.expiryDate) <= soon && new Date(item.expiryDate) > new Date()));
  }, [products]);

  // Top selling product today
  const topProductToday = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    todaySalesData.forEach(s => {
      s.items?.forEach((item: any) => {
        const name = item.product?.name || item.name || 'Unknown';
        if (!counts[name]) counts[name] = { name, qty: 0, revenue: 0 };
        counts[name].qty += item.quantity || 1;
        counts[name].revenue += item.total || 0;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty)[0] || null;
  }, [todaySalesData]);

  // Supplier debt (unpaid invoices total)
  const totalSupplierDebt = useMemo(() => invoices.filter(i => i.paymentStatus !== 'PAID').reduce((acc, i) => acc + (i.balance || 0), 0), [invoices]);

  // Total expenses this month
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date || e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [expenses]);

  // Format currency
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `GH₵ ${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `GH₵ ${(val / 1000).toFixed(1)}k`;
    return `GH₵ ${val.toLocaleString()}`;
  };

  // Activity feed
  const recentActivities = useMemo(() => {
    const activities: { time: string; desc: string; type: string; date: number; link: string }[] = [];
    // Recent sales
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
    // Recent invoices if < 5
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
    // Low stock alerts
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
    // Fallback
    if (activities.length === 0) {
      activities.push({ time: 'Just now', desc: 'System online and synced with NEXUS core', type: 'system', date: Date.now(), link: '/admin' });
    }
    return activities.sort((a, b) => b.date - a.date).slice(0, 5);
  }, [sales, invoices, products]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 dark:from-teal-400 dark:to-emerald-400">
            Command Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            Real-time operational intelligence — sales, stock, staff, and finances.
          </p>
        </div>
        <button
          onClick={async () => {
            setIsSyncing(true);
            addToast?.({ type: 'info', title: 'Syncing...', message: 'Refreshing all data' });
            await Promise.all([refetchSales(), refetchInvoices(), refetchStaff(), refetchProducts(), refetchCustomers(), refetchExpenses()]);
            setIsSyncing(false);
            addToast?.({ type: 'success', title: 'Sync Complete', message: 'All data is up to date' });
          }}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 self-start"
          style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.3)' }}
        >
          {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {isSyncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </motion.div>

      {/* 3D Chart */}
      <motion.div variants={itemVariants} className="w-full relative">
        <Finance3DChart data={chartData} />
      </motion.div>

      {/* Row 1 KPIs — Revenue & Staff */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <motion.div whileHover={{ y: -4, scale: 1.02 }} className="relative overflow-hidden rounded-2xl p-5 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl" />
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
              <DollarSign size={20} />
            </div>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-teal-300 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-bold">
              <Activity size={12} /> Today
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Today's Revenue</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{loadingSales ? <Loader2 size={18} className="animate-spin" /> : formatCurrency(todayRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">{todaySalesData.length} transactions</p>
        </motion.div>

        {/* Total Revenue */}
        <motion.div whileHover={{ y: -4, scale: 1.02 }} className="relative overflow-hidden rounded-2xl p-5 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-teal-500/20 rounded-full blur-xl" />
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white">
              <TrendingUp size={20} />
            </div>
            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full text-xs font-bold">
              All-time
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{loadingSales ? <Loader2 size={18} className="animate-spin" /> : formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">{sales.length} total sales</p>
        </motion.div>

        {/* Staff On Duty */}
        <Link href="/admin/staff">
          <motion.div whileHover={{ y: -4, scale: 1.02 }} className="relative overflow-hidden rounded-2xl p-5 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm cursor-pointer">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl" />
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white">
                <UserCheck size={20} />
              </div>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full text-xs font-bold">
                <span className={`w-2 h-2 rounded-full ${staffOnDuty > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {staffOnDuty > 0 ? 'On Duty' : 'Off'}
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Staff On Duty</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{staffOnDuty} <span className="text-sm font-normal text-slate-400">/ {activeStaffCount}</span></p>
            <p className="text-xs text-slate-400 mt-1">active staff members</p>
          </motion.div>
        </Link>

        {/* Stock Value */}
        <Link href="/dashboard/inventory">
          <motion.div whileHover={{ y: -4, scale: 1.02 }} className="relative overflow-hidden rounded-2xl p-5 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm cursor-pointer">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-sky-500/20 rounded-full blur-xl" />
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white">
                <Package size={20} />
              </div>
              <span className="text-sky-600 dark:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full text-xs font-bold">Current</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Stock Value</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(stockValue)}</p>
            <p className="text-xs text-slate-400 mt-1">{products.length} products</p>
          </motion.div>
        </Link>
      </motion.div>

      {/* Row 2 — Alerts & Financial Snapshot */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stock Alerts Panel */}
        <div className="rounded-2xl p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PackageX size={18} className="text-red-500" /> Stock Alerts
            </h3>
            <Link href="/dashboard/inventory" className="text-xs text-sky-500 hover:underline flex items-center gap-0.5">View all <ChevronRight size={13} /></Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
              <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Out of Stock</p>
                <p className="text-xl font-black text-red-700 dark:text-red-300">{outOfStock.length}</p>
              </div>
              <PackageX size={28} className="text-red-400" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10">
              <div>
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Critical (≤5 units)</p>
                <p className="text-xl font-black text-orange-700 dark:text-orange-300">{criticalStock.length}</p>
              </div>
              <AlertTriangle size={28} className="text-orange-400" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10">
              <div>
                <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Expiring in 30 days</p>
                <p className="text-xl font-black text-yellow-700 dark:text-yellow-300">{expiringIn30.length}</p>
              </div>
              <CalendarClock size={28} className="text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="rounded-2xl p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-purple-500" /> This Month
            </h3>
            <Link href="/admin/financials" className="text-xs text-sky-500 hover:underline flex items-center gap-0.5">Financials <ChevronRight size={13} /></Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Revenue</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(todayRevenue)}</p>
              </div>
              <TrendingUp size={24} className="text-emerald-400" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
              <div>
                <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wide">Expenses</p>
                <p className="text-lg font-black text-red-600 dark:text-red-300">{formatCurrency(thisMonthExpenses)}</p>
              </div>
              <TrendingDown size={24} className="text-red-400" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10">
              <div>
                <p className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wide">Supplier Debt</p>
                <p className="text-lg font-black text-orange-600 dark:text-orange-300">{formatCurrency(totalSupplierDebt)}</p>
              </div>
              <CreditCard size={24} className="text-orange-400" />
            </div>
          </div>
        </div>

        {/* Top Product Today */}
        <div className="rounded-2xl p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Flame size={18} className="text-orange-500" /> Top Seller Today
            </h3>
            <Link href="/admin/reports/sales" className="text-xs text-sky-500 hover:underline flex items-center gap-0.5">Sales <ChevronRight size={13} /></Link>
          </div>
          {topProductToday ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-100 dark:border-orange-500/20">
                <p className="font-black text-slate-800 dark:text-white text-base leading-tight">{topProductToday.name}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-xs text-slate-400">Units Sold</p>
                    <p className="text-xl font-black text-orange-600 dark:text-orange-300">{topProductToday.qty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Revenue</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(topProductToday.revenue)}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">Based on {todaySalesData.length} transactions today</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
              <ShoppingBag size={32} className="opacity-30" />
              <p className="text-sm">No sales recorded today yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Row 3 — Activity Feed + AI Insight */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-teal-400 animate-pulse" />
              Live Activity Feed
            </h3>
            <Link href="/admin/reports" className="text-xs text-sky-500 hover:underline flex items-center gap-0.5 font-semibold">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentActivities.map((activity, i) => (
              <Link key={i} href={activity.link} className="flex gap-3 items-start py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <div className={`w-2 h-2 mt-2 flex-shrink-0 rounded-full ${
                  activity.type === 'finance' ? 'bg-emerald-500 dark:bg-teal-400' :
                  activity.type === 'stock' ? 'bg-orange-500 dark:bg-amber-400' :
                  activity.type === 'alert' ? 'bg-red-500 animate-pulse' : 'bg-blue-500 dark:bg-sky-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{activity.desc}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock size={11} /> {activity.time}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-500 transition-colors flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0F2044] dark:to-[#1A3060] text-white shadow-xl border dark:border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 dark:bg-teal-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
          <h3 className="text-lg font-bold mb-2 relative z-10 flex items-center justify-between gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 dark:from-teal-300 dark:to-emerald-300">
              NEXUS AI Insight
            </span>
            <button onClick={fetchAiInsight} disabled={insightLoading} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <RefreshCw size={14} className={insightLoading ? 'animate-spin' : ''} />
            </button>
          </h3>
          {insightLoading ? (
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <Loader2 size={16} className="animate-spin text-teal-300 flex-shrink-0" />
              <p className="text-slate-400 text-sm italic">Analyzing live data...</p>
            </div>
          ) : (
            <p className="text-slate-300 dark:text-slate-200 text-sm mb-6 relative z-10 leading-relaxed font-medium min-h-[60px] whitespace-pre-line">
              {insightText}
            </p>
          )}
          <div className="relative z-10 flex gap-3 flex-wrap">
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="px-4 py-2 bg-white dark:bg-teal-500 text-slate-900 dark:text-white font-bold rounded-xl text-sm hover:scale-105 transition-transform active:scale-95"
            >
              Review Inventory
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Full Reports
            </button>
            <button
              onClick={fetchAiInsight}
              disabled={insightLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={insightLoading ? 'animate-spin' : ''} />
              Retry AI
            </button>
          </div>
        </div>
      </motion.div>

      {/* Pending Invoices quick-action row */}
      {pendingInvoices > 0 && (
        <motion.div variants={itemVariants}>
          <Link href="/admin/invoices">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-orange-500" />
                <div>
                  <p className="font-bold text-orange-700 dark:text-orange-300">{pendingInvoices} supplier invoice{pendingInvoices > 1 ? 's' : ''} pending payment</p>
                  <p className="text-sm text-orange-500 dark:text-orange-400">Outstanding balance: {formatCurrency(totalSupplierDebt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-300 font-bold text-sm">
                Pay Now <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
