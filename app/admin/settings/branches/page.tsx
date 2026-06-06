'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { 
  Plus, MapPin, Phone, Shield, Activity, CheckCircle, XCircle, MoreHorizontal,
  Store, TrendingUp, DollarSign, Users, Package, Calendar, ArrowRight, X,
  BarChart3, PieChart, LineChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Branch {
  id: string;
  name: string;
  type: 'LICENSED_PHARMACY' | 'CHEMICAL_SHOP';
  address: string;
  town: string;
  region: string;
  phone: string;
  licenseNo: string;
  licenseExp: string;
  isActive: boolean;
  staff: number;
  manager?: string;
  email?: string;
  // Analytics data
  todaySales?: number;
  todayRevenue?: number;
  monthRevenue?: number;
  totalProducts?: number;
  lowStockCount?: number;
  topSellingProduct?: string;
}

const BRANCHES: Branch[] = [
  { 
    id: '1', 
    name: 'Azzay Pharmacy', 
    type: 'LICENSED_PHARMACY', 
    address: 'Main Street, Dormaa Central', 
    town: 'Dormaa', 
    region: 'Bono Region', 
    phone: '+233 24 123 4567', 
    licenseNo: 'FDA-GH-2024-001', 
    licenseExp: '2026-12-31', 
    isActive: true, 
    staff: 5,
    manager: 'Dr. Ama Mensah',
    todaySales: 23,
    todayRevenue: 1450,
    monthRevenue: 42800,
    totalProducts: 342,
    lowStockCount: 12,
    topSellingProduct: 'Paracetamol 500mg'
  },
  { 
    id: '2', 
    name: 'Azzay Chemical Shop', 
    type: 'CHEMICAL_SHOP', 
    address: 'Market Road, Dormaa', 
    town: 'Dormaa', 
    region: 'Bono Region', 
    phone: '+233 24 987 6543', 
    licenseNo: 'FDA-GH-2024-002', 
    licenseExp: '2026-06-30', 
    isActive: true, 
    staff: 2,
    manager: 'Kwame Asante',
    todaySales: 15,
    todayRevenue: 890,
    monthRevenue: 24500,
    totalProducts: 156,
    lowStockCount: 8,
    topSellingProduct: 'ORS Sachets'
  },
];

export default function BranchesPage() {
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);
  
  const [newBranch, setNewBranch] = useState({
    name: '',
    type: 'LICENSED_PHARMACY' as const,
    address: '',
    town: '',
    region: '',
    phone: '',
    email: '',
    licenseNo: '',
    licenseExp: '',
    manager: ''
  });

  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

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
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Branches</h1>
          <p className="text-sm" style={{ color: card.muted }}>Manage your pharmacy network and branch operations.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
          style={{
            background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
            color: isDark ? '#0A0E1A' : '#fff',
            boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
          }}>
          <Plus size={18} />
          Add Branch
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Branches', value: branches.length, icon: Store, color: '#0EA5E9' },
          { label: 'Active', value: branches.filter(b => b.isActive).length, icon: CheckCircle, color: '#10B981' },
          { label: 'Staff', value: branches.reduce((a, b) => a + b.staff, 0), icon: Users, color: '#8B5CF6' },
          { label: 'Products', value: branches.reduce((a, b) => a + (b.totalProducts || 0), 0), icon: Package, color: '#F59E0B' },
          { label: 'Revenue', value: `GH¢${(branches.reduce((a, b) => a + (b.monthRevenue || 0), 0) / 1000).toFixed(1)}k`, icon: DollarSign, color: '#EF4444' },
        ].map(s => (
          <motion.div 
            key={s.label} 
            whileHover={{ y: -2 }}
            className="rounded-2xl border p-4 backdrop-blur-xl cursor-pointer"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>{s.label}</p>
            </div>
            <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {branches.map(branch => (
          <motion.div 
            key={branch.id} 
            whileHover={{ y: -3, boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.1)' }}
            onClick={() => { setSelectedBranch(branch); setShowDashboard(true); }}
            className="rounded-2xl border backdrop-blur-xl overflow-hidden cursor-pointer group"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            {/* Header */}
            <div className="p-5 border-b flex items-start justify-between"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl"
                  style={{ background: card.primaryBg, color: card.primary }}>
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold" style={{ color: card.text }}>{branch.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: branch.type === 'LICENSED_PHARMACY' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)',
                      color: branch.type === 'LICENSED_PHARMACY' ? '#0EA5E9' : '#10B981',
                    }}>
                    {branch.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {branch.isActive
                  ? <CheckCircle size={18} style={{ color: '#10B981' }} />
                  : <XCircle size={18} style={{ color: '#EF4444' }} />}
                <button className="p-1.5 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={15} style={{ color: card.subtle }} />
                <span style={{ color: card.muted }}>{branch.address}, {branch.region}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={15} style={{ color: card.subtle }} />
                <span style={{ color: card.muted }}>{branch.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield size={15} style={{ color: card.subtle }} />
                <span style={{ color: card.muted }}>License: {branch.licenseNo}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  Exp: {branch.licenseExp}
                </span>
              </div>
            </div>

            {/* Quick Stats Preview */}
            <div className="px-5 py-3 border-t grid grid-cols-3 gap-2 text-center"
              style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.5)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: '#10B981' }}>GH¢{branch.todayRevenue || 0}</p>
                <p className="text-[9px]" style={{ color: card.muted }}>Today</p>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: card.primary }}>{branch.todaySales || 0}</p>
                <p className="text-[9px]" style={{ color: card.muted }}>Sales</p>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>{branch.lowStockCount || 0}</p>
                <p className="text-[9px]" style={{ color: card.muted }}>Low Stock</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); router.push(`/admin/settings/branches/${branch.id}`); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 flex items-center justify-center gap-1"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                View Dashboard <ArrowRight size={12} />
              </button>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: card.muted, border: `1px solid ${card.border}` }}>
                Staff ({branch.staff})
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Branch Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowAddModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: isDark ? '#0F172A' : '#fff' }}>
              <div className="p-6 border-b" style={{ borderColor: card.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: card.primaryBg }}>
                      <Store size={20} style={{ color: card.primary }} />
                    </div>
                    <h2 className="font-display text-xl font-bold" style={{ color: card.text }}>Add New Branch</h2>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-white/5">
                    <X size={20} style={{ color: card.muted }} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Branch Name *</label>
                    <input 
                      type="text"
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                      placeholder="e.g., Azzay Pharmacy"
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Branch Type</label>
                    <select
                      value={newBranch.type}
                      onChange={(e) => setNewBranch({...newBranch, type: e.target.value as any})}
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}>
                      <option value="LICENSED_PHARMACY">Licensed Pharmacy</option>
                      <option value="CHEMICAL_SHOP">Chemical Shop</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Full Address</label>
                  <input 
                    type="text"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                    placeholder="Street address"
                    className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                    style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Town</label>
                    <input 
                      type="text"
                      value={newBranch.town}
                      onChange={(e) => setNewBranch({...newBranch, town: e.target.value})}
                      placeholder="Town"
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Region</label>
                    <input 
                      type="text"
                      value={newBranch.region}
                      onChange={(e) => setNewBranch({...newBranch, region: e.target.value})}
                      placeholder="Region"
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Phone</label>
                    <input 
                      type="tel"
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})}
                      placeholder="+233..."
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Manager Name</label>
                    <input 
                      type="text"
                      value={newBranch.manager}
                      onChange={(e) => setNewBranch({...newBranch, manager: e.target.value})}
                      placeholder="Branch manager"
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Email</label>
                    <input 
                      type="email"
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({...newBranch, email: e.target.value})}
                      placeholder="branch@azzay.com"
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>License Number</label>
                    <input 
                      type="text"
                      value={newBranch.licenseNo}
                      onChange={(e) => setNewBranch({...newBranch, licenseNo: e.target.value})}
                      placeholder="FDA-GH-2024-XXX"
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>License Expiry</label>
                    <input 
                      type="date"
                      value={newBranch.licenseExp}
                      onChange={(e) => setNewBranch({...newBranch, licenseExp: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-[#0EA5E9] transition-all text-sm"
                      style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: card.border, color: card.text }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex gap-3" style={{ borderColor: card.border }}>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', color: card.muted }}>
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (!newBranch.name || !newBranch.address) {
                      alert('Please fill in required fields (Name and Address)');
                      return;
                    }
                    const branch: Branch = {
                      ...newBranch,
                      id: Date.now().toString(),
                      isActive: true,
                      staff: 0,
                      todaySales: 0,
                      todayRevenue: 0,
                      monthRevenue: 0,
                      totalProducts: 0,
                      lowStockCount: 0
                    };
                    setBranches([...branches, branch]);
                    setNewBranch({
                      name: '',
                      type: 'LICENSED_PHARMACY',
                      address: '',
                      town: '',
                      region: '',
                      phone: '',
                      email: '',
                      licenseNo: '',
                      licenseExp: '',
                      manager: ''
                    });
                    setShowAddModal(false);
                  }}
                  disabled={!newBranch.name || !newBranch.address}
                  className="flex-[2] py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ 
                    background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                    color: isDark ? '#0A0E1A' : '#fff'
                  }}>
                  <Plus size={16} /> Create Branch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
