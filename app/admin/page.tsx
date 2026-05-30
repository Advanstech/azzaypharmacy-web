'use client';

import { motion } from 'framer-motion';
import { Finance3DChart } from '@/components/3d-finance-chart';
import { TrendingUp, Users, Package, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  const { sales } = useStore();

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <h1 className="text-4xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
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
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <TrendingUp size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-xs font-bold">
              <ArrowUpRight size={14} />
              +12.5%
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Gross Margin</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">GH₵ 42.8k</p>
        </motion.div>

        {/* KPI 2 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <AlertTriangle size={24} />
            </div>
            <div className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Action Req
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Pending Invoices</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">14</p>
        </motion.div>

        {/* KPI 3 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Users size={24} />
            </div>
            <div className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-xs font-bold">
              All Branches
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Active Staff</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">28</p>
        </motion.div>

        {/* KPI 4 */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-3xl p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-500/20 rounded-full blur-2xl" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
              <Package size={24} />
            </div>
            <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded-full text-xs font-bold">
              <ArrowDownRight size={14} />
              -2.4%
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Stock Value</h3>
          <p className="text-3xl font-display font-black text-slate-800 dark:text-white">GH₵ 890k</p>
        </motion.div>
      </motion.div>

      {/* Activity / Insights Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Activity Feed
          </h3>
          <div className="space-y-4">
            {[
              { time: '10 mins ago', desc: 'Tobinco invoice #4422 cleared for payment', type: 'finance' },
              { time: '1 hour ago', desc: 'Critical stock alert: Paracetamol API running low', type: 'stock' },
              { time: '2 hours ago', desc: 'System backup completed successfully', type: 'system' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className={`w-2 h-2 mt-1.5 rounded-full ${
                  activity.type === 'finance' ? 'bg-emerald-500' :
                  activity.type === 'stock' ? 'bg-orange-500' : 'bg-blue-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.desc}</p>
                  <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
          <h3 className="text-lg font-bold mb-2 relative z-10">NEXUS AI Insight</h3>
          <p className="text-slate-300 text-sm mb-6 relative z-10 leading-relaxed">
            Based on the last 30 days of sales volume and current financial trajectories, we project a 15% increase in demand for anti-malarials next month. Consider pre-ordering from ADD Pharma Limited to secure better margins.
          </p>
          <button className="px-6 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-sm hover:scale-105 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Review Forecasting
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
