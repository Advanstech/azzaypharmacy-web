'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Store, TrendingUp, DollarSign, Users, Package, Calendar,
  ShoppingCart, Activity, AlertTriangle, CheckCircle, Clock, MapPin,
  Phone, Shield, User, MoreHorizontal, ChevronRight, BarChart3,
  LineChart, PieChart, Download, RefreshCw, Filter
} from 'lucide-react';
import Link from 'next/link';

// Mock data - would come from API
const BRANCHES = [
  { 
    id: '1', 
    name: 'Azzay Pharmacy', 
    type: 'LICENSED_PHARMACY', 
    address: 'Main Street, Dormaa Central', 
    town: 'Dormaa', 
    region: 'Bono Region', 
    phone: '+233 24 123 4567', 
    email: 'dormaa@azzay.com',
    licenseNo: 'FDA-GH-2024-001', 
    licenseExp: '2026-12-31', 
    isActive: true, 
    staff: 5,
    manager: 'Dr. Ama Mensah',
    openingHours: 'Mon-Sat: 7:00 AM - 9:00 PM',
  },
  { 
    id: '2', 
    name: 'Azzay Chemical Shop', 
    type: 'CHEMICAL_SHOP', 
    address: 'Market Road, Dormaa', 
    town: 'Dormaa', 
    region: 'Bono Region', 
    phone: '+233 24 987 6543', 
    email: 'market@azzay.com',
    licenseNo: 'FDA-GH-2024-002', 
    licenseExp: '2026-06-30', 
    isActive: true, 
    staff: 2,
    manager: 'Kwame Asante',
    openingHours: 'Mon-Sat: 8:00 AM - 6:00 PM',
  },
];

// Mock analytics data
const generateMockData = (branchId: string) => ({
  today: {
    sales: 23 + Math.floor(Math.random() * 10),
    revenue: 1450 + Math.floor(Math.random() * 500),
    customers: 18 + Math.floor(Math.random() * 8),
    items: 45 + Math.floor(Math.random() * 20)
  },
  thisWeek: {
    sales: 156 + Math.floor(Math.random() * 30),
    revenue: 9850 + Math.floor(Math.random() * 2000),
    trend: '+12%',
    avgOrderValue: 63
  },
  thisMonth: {
    sales: 642,
    revenue: 42800,
    profit: 12840,
    customers: 482,
    newCustomers: 34
  },
  inventory: {
    totalProducts: 342,
    inStock: 318,
    lowStock: 12,
    outOfStock: 12,
    expiringSoon: 8
  },
  staff: [
    { name: 'Dr. Ama Mensah', role: 'Manager', status: 'active', avatar: 'AM' },
    { name: 'Kwasi Boakye', role: 'Pharmacist', status: 'active', avatar: 'KB' },
    { name: 'Abena Darko', role: 'Sales', status: 'active', avatar: 'AD' },
    { name: 'Yaw Osei', role: 'Sales', status: 'off', avatar: 'YO' },
    { name: 'Akua Frimpong', role: 'Inventory', status: 'active', avatar: 'AF' },
  ],
  topProducts: [
    { name: 'Paracetamol 500mg', sales: 234, revenue: 2340, trend: '+15%' },
    { name: 'Amoxicillin 250mg', sales: 189, revenue: 3780, trend: '+8%' },
    { name: 'ORS Sachets', sales: 156, revenue: 780, trend: '+23%' },
    { name: 'Vitamin C 1000mg', sales: 142, revenue: 2840, trend: '-5%' },
    { name: 'Ibuprofen 400mg', sales: 128, revenue: 1280, trend: '+12%' },
  ],
  recentSales: [
    { id: 'S-2024-001', customer: 'John Doe', items: 3, total: 145, time: '5 mins ago', status: 'completed' },
    { id: 'S-2024-002', customer: 'Mary Smith', items: 1, total: 35, time: '12 mins ago', status: 'completed' },
    { id: 'S-2024-003', customer: 'Kwame Nkrumah', items: 5, total: 230, time: '28 mins ago', status: 'completed' },
    { id: 'S-2024-004', customer: 'Abena Korkor', items: 2, total: 78, time: '45 mins ago', status: 'completed' },
    { id: 'S-2024-005', customer: 'Yaw Mensah', items: 4, total: 195, time: '1 hour ago', status: 'completed' },
  ],
  dailyRevenue: [
    { day: 'Mon', revenue: 3800 },
    { day: 'Tue', revenue: 4200 },
    { day: 'Wed', revenue: 3600 },
    { day: 'Thu', revenue: 5100 },
    { day: 'Fri', revenue: 6200 },
    { day: 'Sat', revenue: 7100 },
    { day: 'Sun', revenue: 4500 },
  ],
  hourlyActivity: [
    { hour: '8AM', sales: 5 },
    { hour: '10AM', sales: 12 },
    { hour: '12PM', sales: 18 },
    { hour: '2PM', sales: 15 },
    { hour: '4PM', sales: 22 },
    { hour: '6PM', sales: 28 },
    { hour: '8PM', sales: 20 },
  ]
});

export default function BranchDashboardPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const branch = useMemo(() => {
    return BRANCHES.find(b => b.id === params.id) || BRANCHES[0];
  }, [params.id]);

  const data = useMemo(() => generateMockData(branch.id), [branch.id, refreshing]);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, color = '#0EA5E9' }: { data: { day: string; revenue: number }[], color?: string }) => {
    const max = Math.max(...data.map(d => d.revenue));
    return (
      <div className="flex items-end justify-between h-32 gap-2">
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.revenue / max) * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="w-full rounded-t-lg"
              style={{ background: color, minHeight: 4 }}
            />
            <span className="text-[9px] font-bold" style={{ color: card.muted }}>{d.day}</span>
          </div>
        ))}
      </div>
    );
  };

  // Activity chart
  const ActivityChart = ({ data }: { data: { hour: string; sales: number }[] }) => {
    const max = Math.max(...data.map(d => d.sales));
    return (
      <div className="flex items-end justify-between h-24 gap-1">
        {data.map((d, i) => (
          <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.sales / max) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="w-full rounded-t"
              style={{ background: isDark ? 'rgba(0,217,255,0.6)' : 'rgba(14,165,233,0.6)', minHeight: 2 }}
            />
            <span className="text-[8px]" style={{ color: card.muted }}>{d.hour}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/admin/settings/branches')}
            className="p-2 rounded-xl hover:bg-white/5 transition-all"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <ArrowLeft size={20} style={{ color: card.muted }} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>{branch.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: branch.type === 'LICENSED_PHARMACY' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)',
                  color: branch.type === 'LICENSED_PHARMACY' ? '#0EA5E9' : '#10B981',
                }}>
                {branch.type.replace('_', ' ')}
              </span>
              {branch.isActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: card.muted }}>
              <span className="flex items-center gap-1"><MapPin size={12} /> {branch.town}, {branch.region}</span>
              <span className="flex items-center gap-1"><User size={12} /> {branch.manager}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
                style={{
                  background: timeRange === range ? (isDark ? 'rgba(0,217,255,0.2)' : 'rgba(14,165,233,0.1)') : 'transparent',
                  color: timeRange === range ? card.primary : card.muted
                }}>
                {range}
              </button>
            ))}
          </div>
          <button 
            onClick={refresh}
            className="p-2 rounded-xl transition-all hover:bg-white/5"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <RefreshCw size={16} style={{ color: card.muted }} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            className="p-2 rounded-xl transition-all hover:bg-white/5"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <Download size={16} style={{ color: card.muted }} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Sales Today', 
            value: data.today.sales, 
            change: '+12% vs yesterday',
            icon: ShoppingCart, 
            color: '#0EA5E9',
            bg: isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.08)'
          },
          { 
            label: 'Revenue Today', 
            value: `GH¢${data.today.revenue.toLocaleString()}`, 
            change: '+8% vs yesterday',
            icon: DollarSign, 
            color: '#10B981',
            bg: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)'
          },
          { 
            label: 'Customers', 
            value: data.today.customers, 
            change: '+5 new today',
            icon: Users, 
            color: '#8B5CF6',
            bg: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)'
          },
          { 
            label: 'Items Sold', 
            value: data.today.items, 
            change: 'Avg 2.3 per sale',
            icon: Package, 
            color: '#F59E0B',
            bg: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)'
          },
        ].map((stat) => (
          <motion.div 
            key={stat.label}
            whileHover={{ y: -2 }}
            className="rounded-2xl border p-5 backdrop-blur-xl"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg" style={{ background: stat.bg }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>{stat.label}</span>
            </div>
            <p className="font-display text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px]" style={{ color: card.muted }}>{stat.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <motion.div 
          className="lg:col-span-2 rounded-2xl border p-5 backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} style={{ color: card.primary }} />
              <h3 className="font-bold text-sm" style={{ color: card.text }}>Weekly Revenue</h3>
            </div>
            <span className="text-xs font-bold" style={{ color: '#10B981' }}>+18% this week</span>
          </div>
          <SimpleBarChart data={data.dailyRevenue} color={isDark ? '#00D9FF' : '#0EA5E9'} />
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center" style={{ borderColor: card.border }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: card.muted }}>Total Revenue</p>
              <p className="font-bold" style={{ color: card.text }}>GH¢{data.dailyRevenue.reduce((a, b) => a + b.revenue, 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: card.muted }}>Best Day</p>
              <p className="font-bold" style={{ color: card.text }}>Saturday</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: card.muted }}>Avg/Day</p>
              <p className="font-bold" style={{ color: card.text }}>GH¢{Math.round(data.dailyRevenue.reduce((a, b) => a + b.revenue, 0) / 7).toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        {/* Inventory Status */}
        <motion.div 
          className="rounded-2xl border p-5 backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} style={{ color: card.primary }} />
            <h3 className="font-bold text-sm" style={{ color: card.text }}>Inventory Status</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'In Stock', value: data.inventory.inStock, total: data.inventory.totalProducts, color: '#10B981' },
              { label: 'Low Stock', value: data.inventory.lowStock, total: data.inventory.totalProducts, color: '#F59E0B' },
              { label: 'Out of Stock', value: data.inventory.outOfStock, total: data.inventory.totalProducts, color: '#EF4444' },
              { label: 'Expiring Soon', value: data.inventory.expiringSoon, total: data.inventory.totalProducts, color: '#8B5CF6' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: card.text }}>{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / item.total) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            Manage Inventory
          </button>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Products */}
        <motion.div 
          className="rounded-2xl border p-5 backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: card.primary }} />
            <h3 className="font-bold text-sm" style={{ color: card.text }}>Top Products</h3>
          </div>
          <div className="space-y-3">
            {data.topProducts.slice(0, 5).map((product, idx) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: card.muted }}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: card.text }}>{product.name}</p>
                  <p className="text-[10px]" style={{ color: card.muted }}>{product.sales} sold · GH¢{product.revenue}</p>
                </div>
                <span className="text-[10px] font-bold" style={{ color: product.trend.startsWith('+') ? '#10B981' : '#EF4444' }}>
                  {product.trend}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          className="lg:col-span-2 rounded-2xl border p-5 backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} style={{ color: card.primary }} />
              <h3 className="font-bold text-sm" style={{ color: card.text }}>Recent Sales Activity</h3>
            </div>
            <Link href="/dashboard/sales" className="text-[10px] font-bold flex items-center gap-1" style={{ color: card.primary }}>
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: card.primaryBg }}>
                    <ShoppingCart size={14} style={{ color: card.primary }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: card.text }}>{sale.customer}</p>
                    <p className="text-[10px]" style={{ color: card.muted }}>{sale.id} · {sale.items} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: card.text }}>GH¢{sale.total}</p>
                  <p className="text-[10px]" style={{ color: card.muted }}>{sale.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Staff Section */}
      <motion.div 
        className="rounded-2xl border p-5 backdrop-blur-xl"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: card.primary }} />
            <h3 className="font-bold text-sm" style={{ color: card.text }}>Staff on Duty ({data.staff.filter(s => s.status === 'active').length}/{data.staff.length})</h3>
          </div>
          <button className="text-[10px] font-bold flex items-center gap-1" style={{ color: card.primary }}>
            Manage Staff <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {data.staff.map((member) => (
            <div 
              key={member.name}
              className="flex items-center gap-2 p-2 rounded-xl pr-4"
              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: member.status === 'active' ? card.primaryBg : 'rgba(100,116,139,0.2)', color: member.status === 'active' ? card.primary : card.muted }}>
                {member.avatar}
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: card.text }}>{member.name}</p>
                <p className="text-[9px]" style={{ color: card.muted }}>{member.role}</p>
              </div>
              <span className={`ml-2 w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
