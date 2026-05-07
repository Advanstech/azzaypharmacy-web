'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  Search, Filter, ChevronRight, Printer, FileText, 
  Download, Calendar, User, ShoppingBag, CreditCard,
  CheckCircle, Clock, ArrowLeft, RefreshCw, MoreVertical,
  ChevronDown, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';

// Roles that can see ALL staff sales
const MANAGER_ROLES = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'];

export default function SalesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { sales, loadingSales, refetchSales, me } = useStore();
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewScope, setViewScope] = useState<'mine' | 'all'>('mine');
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === 'dark';
  const loading = loadingSales;

  // Determine if user has managerial access
  const isManager = me ? MANAGER_ROLES.includes(me.role) : false;

  // Auto-set scope: managers default to 'all', others always 'mine'
  useEffect(() => {
    if (isManager) {
      setViewScope('all');
    } else {
      setViewScope('mine');
    }
  }, [isManager]);

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    card: isDark ? 'rgba(30,41,59,0.5)' : '#FFFFFF',
    input: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
  };

  // Role-based sales: filter to user's own unless manager viewing 'all'
  const scopedSales = useMemo(() => {
    if (isManager && viewScope === 'all') return sales;
    if (!me) return [];
    // Match by cashier user id (sale.user.id) or cashierId
    return sales.filter(s => 
      s.user?.id === me.id || (s as any).cashierId === me.id
    );
  }, [sales, me, isManager, viewScope]);

  const filteredSales = scopedSales.filter(sale => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (sale.id || '').toLowerCase().includes(q) ||
      (sale.customerName?.toLowerCase() || '').includes(q) ||
      (sale.user?.name?.toLowerCase() || '').includes(q);
    const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
    const matchFrom = !dateFrom || saleDate >= dateFrom;
    const matchTo = !dateTo || saleDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  if (!mounted) return null;

  if (selectedSale) {
    return (
      <div className="p-8 space-y-6">
        <button 
          onClick={() => setSelectedSale(null)}
          className="flex items-center gap-2 transition-colors"
          style={{ color: c.muted }}
        >
          <ArrowLeft size={20} />
          <span>Back to Sales</span>
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: c.text }}>Sale Details</h1>
            <p className="font-mono text-sm" style={{ color: c.muted }}>{selectedSale.id}</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-amber-400 border border-amber-400/20 rounded-xl hover:bg-slate-700 transition-all">
              <RefreshCw size={18} />
              <span>Request Refund</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 rounded-xl hover:bg-emerald-500/20 transition-all">
              <Printer size={18} />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
              { label: 'Branch', val: (selectedSale as any).branch?.name || 'Azzay Pharmacy', sub: 'Main Hub', icon: ShoppingBag },
            { label: 'Sold By', val: selectedSale.user?.name || (selectedSale as any).cashier?.name || 'Staff', sub: selectedSale.user?.role || 'Pharmacist', icon: User },
            { label: 'Recorded', val: new Date(selectedSale.createdAt).toLocaleDateString(), sub: new Date(selectedSale.createdAt).toLocaleTimeString(), icon: Clock },
            { label: 'Payment', val: `GH¢${Number(selectedSale.totalAmount).toFixed(2)}`, sub: selectedSale.paymentMethod, icon: CreditCard },
          ].map(k => (
            <div key={k.label} className="border p-6 rounded-2xl" style={{ background: c.card, borderColor: c.border }}>
              <div className="flex items-center gap-3 mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: c.muted }}>
                <k.icon size={16} className="text-emerald-400" />
                <span>{k.label}</span>
              </div>
              <p className="font-bold text-lg" style={{ color: c.text }}>{k.val}</p>
              <p className="text-[10px] mt-1" style={{ color: c.muted }}>{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="border rounded-2xl overflow-hidden backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: c.border }}>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Product</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Category</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Qty</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Unit Price</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: c.border }}>
              {selectedSale.items.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-medium" style={{ color: c.text }}>{item.product.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest" style={{ background: isDark ? '#1E293B' : '#E2E8F0', color: c.muted }}>
                      {item.product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" style={{ color: c.text }}>{item.quantity}</td>
                  <td className="px-6 py-4 text-right" style={{ color: c.muted }}>GH¢{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold font-mono" style={{ color: c.text }}>GH¢{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ background: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC', borderColor: c.border }}>
                <td colSpan={3}></td>
                <td className="px-6 py-4 text-right font-medium" style={{ color: c.muted }}>Subtotal</td>
                <td className="px-6 py-4 text-right font-bold font-mono" style={{ color: c.text }}>GH¢{Number(selectedSale.totalAmount).toFixed(2)}</td>
              </tr>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.9)' : '#F1F5F9' }}>
                <td colSpan={3}></td>
                <td className="px-6 py-4 text-right text-emerald-500 font-bold uppercase tracking-widest text-xs">Final Total</td>
                <td className="px-6 py-4 text-right text-xl font-black font-mono" style={{ color: c.text }}>GH¢{Number(selectedSale.totalAmount).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: c.text }}>Sales History</h1>
          <p style={{ color: c.muted }}>Manage and track all pharmaceutical transactions</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-xl font-bold text-xs transition-all"
            style={{ background: isDark ? 'rgba(30,41,59,0.5)' : '#fff', borderColor: c.border, color: c.muted }}>
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="border p-6 rounded-3xl backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
        <div className="flex items-center gap-2 text-emerald-400 mb-6 font-bold uppercase tracking-widest text-[10px]">
          <Filter size={14} />
          <span>Intelligent Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: c.muted }}>Search Receipt</label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: c.muted }} />
              <input 
                type="text" 
                placeholder="AZY-000000..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-xl py-2.5 pl-10 pr-4 outline-none transition-all text-sm"
                style={{ background: c.input, borderColor: c.border, color: c.text }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: c.muted }}>From Date</label>
            <input 
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border rounded-xl py-2.5 px-4 outline-none transition-all text-sm"
              style={{ background: c.input, borderColor: c.border, color: c.text }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: c.muted }}>To Date</label>
            <input 
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border rounded-xl py-2.5 px-4 outline-none transition-all text-sm"
              style={{ background: c.input, borderColor: c.border, color: c.text }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: c.muted }}>Type</label>
            <div className="relative">
              <select className="w-full border rounded-xl py-2.5 px-4 appearance-none outline-none transition-all text-sm"
                style={{ background: c.input, borderColor: c.border, color: c.text }}>
                <option>All Types</option>
                <option>OTC</option>
                <option>Prescription</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2" size={18} style={{ color: c.muted }} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="border rounded-3xl overflow-hidden backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-[10px] font-bold uppercase tracking-widest" style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: c.border }}>
              <th className="px-6 py-5" style={{ color: c.muted }}>Branch</th>
              <th className="px-6 py-5" style={{ color: c.muted }}>Sale ID</th>
              <th className="px-6 py-5 text-center" style={{ color: c.muted }}>Time</th>
              <th className="px-6 py-5" style={{ color: c.muted }}>Payment</th>
              <th className="px-6 py-5" style={{ color: c.muted }}>Total</th>
              <th className="px-6 py-5 text-right" style={{ color: c.muted }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: c.border }}>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-8 h-16 bg-slate-800/5"></td>
                </tr>
              ))
            ) : filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Building2 size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: c.text }}>{(sale as any).branch?.name || 'Azzay Pharmacy'}</p>
                      <p className="text-[10px] uppercase font-bold tracking-tighter" style={{ color: c.muted }}>Main Hub</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 group/id cursor-pointer" onClick={() => setSelectedSale(sale)}>
                    <p className="font-mono text-xs" style={{ color: c.text }}>{(sale as any).receiptNo || sale.id.slice(-8).toUpperCase()}</p>
                    <ChevronRight size={14} className="group-hover/id:text-emerald-400 group-hover/id:translate-x-1 transition-all" style={{ color: c.muted }} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: c.text }}>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[10px] uppercase font-bold" style={{ color: c.muted }}>{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 border rounded-lg text-[10px] font-black tracking-widest uppercase"
                    style={{ background: isDark ? 'rgba(30,41,59,0.5)' : '#fff', borderColor: c.border, color: c.muted }}>
                    {sale.paymentMethod}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-black font-mono" style={{ color: c.text }}>GH¢{Number(sale.totalAmount).toFixed(2)}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
                      title="View Details"
                    >
                      <ExternalLink size={18} />
                    </button>
                    <button 
                      className="p-2 bg-slate-800/10 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white transition-all"
                      title="Reprint"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Building2({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
