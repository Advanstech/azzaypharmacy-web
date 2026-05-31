'use client';

import { motion } from 'framer-motion';
import { Finance3DChart } from '@/components/3d-finance-chart';
import { TrendingUp, Users, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMemo } from 'react';

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
  const { sales, invoices, staff, products } = useStore();

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
  const stockValue = useMemo(() => products.reduce((acc, p) => acc + (p.stockQuantity * (p.costPrice || p.sellingPrice || 0)), 0), [products]);

  // Format currency
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `GH₵ ${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `GH₵ ${(val / 1000).toFixed(1)}k`;
    return `GH₵ ${val.toLocaleString()}`;
  };

  // Activity feed
  const recentActivities = useMemo(() => {
    const activities = [];
    // Take up to 3 recent sales
    const recentSales = sales.slice(0, 3);
    for (const sale of recentSales) {
      activities.push({
        time: new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        desc: `Sale completed for GH₵ ${sale.totalAmount.toLocaleString()} (${sale.items.length} items)`,
        type: 'finance',
        date: new Date(sale.createdAt).getTime()
      });
    }
    // If we have fewer than 3, add some system ones or pending invoices
    if (activities.length < 3) {
      const recentInvoices = invoices.slice(0, 3 - activities.length);
      for (const inv of recentInvoices) {
        activities.push({
          time: new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          desc: `Invoice #${inv.invoiceNo} registered from ${inv.supplier?.name || 'Supplier'}`,
          type: 'stock',
          date: new Date(inv.createdAt).getTime()
        });
      }
    }
    
    // Fallbacks if store is completely empty
    if (activities.length === 0) {
      activities.push({ time: 'Just now', desc: 'System online and synced with NEXUS core', type: 'system', date: Date.now() });
    }
    
    return activities.sort((a, b) => b.date - a.date).slice(0, 3);
  }, [sales, invoices]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <h1 className="text-4xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 dark:from-teal-400 dark:to-emerald-400">
          Command Center
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
          High-level operational intelligence. Syncing real-time pharmaceutical sales with core financial revenue for total visibility.
        </p>
      </motion.div>

      {/* 3D Visualization Section */}
      <motion.div variants={itemVariants} className="w-full relative">
        <Finance3DChart data={chartData} />
      </motion.div>

      {/* Pictograph KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/20 dark:bg-teal-500/10 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 dark:shadow-teal-900/50">
              <TrendingUp size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 dark:text-teal-300 dark:bg-teal-500/20 px-2 py-1 rounded-full text-xs font-bold">
              <Activity size={14} />
              Live
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total Revenue</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">{formatCurrency(totalRevenue)}</p>
        </motion.div>

        {/* KPI 2 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-900/50">
              <AlertTriangle size={24} />
            </div>
            <div className="flex items-center gap-1 text-orange-500 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20 px-2 py-1 rounded-full text-xs font-bold">
              {pendingInvoices > 0 ? (
                <><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Action Req</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-emerald-500" /> Clear</>
              )}
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Pending Invoices</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">{pendingInvoices}</p>
        </motion.div>

        {/* KPI 3 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/50">
              <Users size={24} />
            </div>
            <div className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:text-indigo-300 dark:bg-indigo-500/20 px-2 py-1 rounded-full text-xs font-bold">
              All Branches
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Active Staff</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">{activeStaffCount}</p>
        </motion.div>

        {/* KPI 4 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-500/20 dark:bg-sky-500/10 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 dark:shadow-sky-900/50">
              <Package size={24} />
            </div>
            <div className="flex items-center gap-1 text-sky-500 bg-sky-500/10 dark:text-sky-300 dark:bg-sky-500/20 px-2 py-1 rounded-full text-xs font-bold">
              Current
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Stock Value</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">{formatCurrency(stockValue)}</p>
        </motion.div>
      </motion.div>

      {/* Activity / Insights Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
            <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-teal-400 animate-pulse" />
            Live Activity Feed
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-100 dark:border-white/5 last:border-0">
                <div className={`w-2 h-2 mt-1.5 rounded-full ${
                  activity.type === 'finance' ? 'bg-emerald-500 dark:bg-teal-400' :
                  activity.type === 'stock' ? 'bg-orange-500 dark:bg-amber-400' : 'bg-blue-500 dark:bg-sky-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.desc}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0F2044] dark:to-[#1A3060] text-white shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border dark:border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 dark:bg-teal-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
          <h3 className="text-lg font-bold mb-2 relative z-10 flex items-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 dark:from-teal-300 dark:to-emerald-300">
              NEXUS AI Insight
            </span>
          </h3>
          <p className="text-slate-300 dark:text-slate-200 text-sm mb-6 relative z-10 leading-relaxed font-medium">
            Based on the last 30 days of sales volume and current financial trajectories, we project a 15% increase in demand for anti-malarials next month. Consider pre-ordering from ADD Pharma Limited to secure better margins.
          </p>
          <button className="relative z-10 px-6 py-2.5 bg-white dark:bg-teal-500 text-slate-900 dark:text-white font-bold rounded-xl text-sm hover:scale-105 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] dark:shadow-[0_0_20px_rgba(0,191,166,0.3)]">
            Review Forecasting
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
