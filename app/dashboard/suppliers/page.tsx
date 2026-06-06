'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Truck, Phone, Mail, MapPin, Star,
  MoreHorizontal, CheckCircle, TrendingUp, Package,
  X, Save, Building, ChevronRight, Award, Clock,
  ShieldCheck, AlertTriangle, ExternalLink, FileText,
  Upload, Download, Receipt, ShoppingCart, Calendar,
  History, DollarSign, ArrowUpRight, RotateCcw, Edit2, Trash2, Loader2, User
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? '#10B981' : score >= 80 ? '#0EA5E9' : score >= 70 ? '#F59E0B' : '#EF4444';
  const label = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 70 ? 'Fair' : 'Poor';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold w-16" style={{ color }}>{score} · {label}</span>
    </div>
  );
}

function StockHealthBar({ out, low, ok, total }: { out: number; low: number; ok: number; total: number }) {
  if (total === 0) return <span className="text-[11px] text-slate-400 font-medium italic">No products</span>;
  
  const outPct = (out / total) * 100;
  const lowPct = (low / total) * 100;
  const okPct = (ok / total) * 100;

  return (
    <div className="flex flex-col gap-1.5 w-32">
      <div className="w-full h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(148,163,184,0.2)' }}>
        {out > 0 && <div className="h-full bg-red-500" style={{ width: `${outPct}%` }} />}
        {low > 0 && <div className="h-full bg-amber-400" style={{ width: `${lowPct}%` }} />}
        {ok > 0 && <div className="h-full bg-emerald-500" style={{ width: `${okPct}%` }} />}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
        {out > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {out} out</span>}
        {low > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {low} low</span>}
        {ok > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {ok} ok</span>}
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { 
    suppliers: storeSuppliers, 
    loadingSuppliers, 
    products,
    createSupplier, 
    updateSupplier, 
    deleteSupplier,
    purchases,
    me
  } = useStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const isManager = ['SE_ADMIN', 'ROOT', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'DEVELOPER'].includes(me?.role || '');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'spend' | 'name'>('score');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', email: '', address: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return;
    try {
      await createSupplier(newSupplier);
      setShowAddModal(false);
      setNewSupplier({ name: '', contact: '', phone: '', email: '', address: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier || !editForm.name) return;
    setIsSaving(true);
    try {
      await updateSupplier({ id: editingSupplier.id, ...editForm });
      setShowEditModal(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (e: any, supplier: any) => {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteSupplier = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSupplier(confirmDelete);
      setConfirmDelete(null);
      setDeleteError(null);
    } catch (err: any) {
      console.error('Delete supplier failed:', err);
      setDeleteError(err?.message || 'Failed to delete supplier. It may have active invoices or purchases.');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setConfirmDelete(null);
    setDeleteError(null);
  };

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.95)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.6)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.07)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    pBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    pBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    sectionBg: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.9)',
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
    inputBg: isDark ? 'rgba(15,23,42,0.6)' : '#fff',
    rowHover: isDark ? 'rgba(0,217,255,0.04)' : 'rgba(14,165,233,0.04)',
    danger: '#EF4444',
    success: '#10B981',
  };

  // Enrich suppliers with computed stats
  const suppliers = storeSuppliers.map(s => {
    const supplierProducts = products.filter(p => p.supplierId === s.id || (p as any).supplier?.id === s.id);
    const supplierPurchases = purchases.filter(p => p.supplier?.id === s.id || (p as any).supplierId === s.id);
    const totalPurchases = supplierPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
    
    const stockOut = supplierProducts.filter(p => p.stockQuantity === 0).length;
    const stockLow = supplierProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
    const stockOk = supplierProducts.filter(p => p.stockQuantity > 10).length;
    
    // Find the most recent purchase date
    let lastOrder = 'No orders yet';
    if (supplierPurchases.length > 0) {
      const sorted = [...supplierPurchases]
        .filter(p => p.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      if (sorted.length > 0 && sorted[0].createdAt) {
        lastOrder = new Date(sorted[0].createdAt).toISOString().split('T')[0];
      }
    }
    
    return {
      ...s,
      totalPurchases,
      onTimeRate: Math.floor((s as any).onTimeRate ?? 0),
      lastOrder,
      paymentTerms: (s as any).paymentTerms || 'Net 30',
      stockOut,
      stockLow,
      stockOk,
      totalProducts: supplierProducts.length
    };
  });

  const filteredAndSorted = [...suppliers]
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'score' ? (b.aiScore ?? 0) - (a.aiScore ?? 0) : sortBy === 'spend' ? b.totalPurchases - a.totalPurchases : a.name.localeCompare(b.name));

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSuppliers,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredAndSorted,
    itemsPerPage: 5,
  });

  useEffect(() => {
    goToPage(1);
  }, [search, sortBy, goToPage]);

  const totalSpend = suppliers.reduce((a, s) => a + s.totalPurchases, 0);
  const avgScore = suppliers.length > 0 ? Math.round(suppliers.reduce((a, s) => a + (s.aiScore ?? 0), 0) / suppliers.length) : 0;
  const topSupplier = suppliers.length > 0 ? suppliers.reduce((a, b) => (a.aiScore ?? 0) > (b.aiScore ?? 0) ? a : b) : { name: 'None', aiScore: 0 };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Suppliers</h1>
          <p className="text-sm" style={{ color: c.muted }}>
            {suppliers.length} pharmaceutical suppliers · AI-scored performance tracking
          </p>
        </div>
        {isManager && (
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
              color: isDark ? '#060B14' : '#fff',
              boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
            }}>
            <Plus size={18} />
            Add Supplier
          </button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: suppliers.length, sub: 'All branches', icon: Truck, color: '#0EA5E9' },
          { label: 'Total Spend (YTD)', value: `GH₵ ${(totalSpend/1000).toFixed(1)}k`, sub: 'Inventory purchases', icon: TrendingUp, color: '#10B981' },
          { label: 'Avg AI Score', value: `${avgScore}/100`, sub: 'Clinical reliability', icon: Award, color: '#8B5CF6' },
          { label: 'Top Supplier', value: topSupplier.name.split(' ')[0], sub: `Score: ${topSupplier.aiScore}`, icon: Star, color: '#F59E0B' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                  <Icon size={18} />
                </div>
                <p className="text-xs" style={{ color: c.subtle }}>{s.label}</p>
              </div>
              <p className="font-display text-xl font-bold mb-0.5" style={{ color: c.text }}>{s.value}</p>
              <p className="text-[11px]" style={{ color: c.subtle }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Supplier List */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: c.bg, borderColor: c.border, boxShadow: c.shadow }}>
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
          style={{ borderColor: c.border, background: c.sectionBg }}>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.subtle }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: c.subtle }}>Sort:</span>
            {(['score','spend','name'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: sortBy === s ? c.pBg : 'transparent',
                  color: sortBy === s ? c.primary : c.subtle,
                  border: sortBy === s ? `1px solid ${c.pBorder}` : '1px solid transparent',
                }}>
                {s === 'score' ? 'AI Score' : s === 'spend' ? 'Spend' : 'Name'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.divider}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.7)' }}>
                {['Supplier', 'AI Score', 'Stock Health', 'On-Time', 'Total Spend', 'Last Order', 'Terms', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.subtle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.map((s, i) => (
                <tr key={s.id}
                  className="cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group"
                  style={{ borderBottom: i < paginatedSuppliers.length - 1 ? `1px solid ${c.divider}` : 'none' }}
                  onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-display text-xs font-bold"
                        style={{ background: c.pBg, color: c.primary }}>
                        {s.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: c.text }}>{s.name}</p>
                        <p className="text-[11px]" style={{ color: c.subtle }}>{s.contact || 'No Contact'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 w-40">
                    <ScoreBar score={s.aiScore ?? 0} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StockHealthBar out={s.stockOut} low={s.stockLow} ok={s.stockOk} total={s.totalProducts} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-sm font-bold"
                      style={{ color: s.onTimeRate >= 90 ? '#10B981' : s.onTimeRate >= 80 ? '#F59E0B' : '#EF4444' }}>
                      {s.onTimeRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm font-bold" style={{ color: c.primary }}>
                    GH₵ {s.totalPurchases.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs" style={{ color: c.muted }}>{s.lastOrder}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: c.pBg, color: c.primary }}>{s.paymentTerms}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {isManager && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => openEditModal(e, s)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(s.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      <ChevronRight size={16} style={{ color: c.subtle }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
          <p className="text-xs" style={{ color: c.muted }}>
            Showing <span className="font-bold text-slate-800" style={{ color: c.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold text-slate-800" style={{ color: c.text }}>{totalItems}</span> suppliers
          </p>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={prevPage}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              style={{ background: c.pBg, color: c.primary, border: `1px solid ${c.pBorder}` }}
            >
              Previous
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={nextPage}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              style={{ background: c.primary, color: '#fff' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-[32px] border overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            style={{ background: isDark ? '#0B1121' : '#ffffff', borderColor: c.border }}>
            
            <div className="p-6 border-b flex items-center justify-between"
              style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.5)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#fff', boxShadow: '0 8px 20px rgba(14,165,233,0.25)' }}>
                  <Building size={22} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold" style={{ color: c.text }}>Add New Supplier</h2>
                  <p className="text-xs mt-0.5" style={{ color: c.muted }}>Register a new pharmaceutical vendor</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Company Name</label>
                  <div className="relative">
                    <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" placeholder="e.g. Bedither Pharmaceuticals" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-[#0EA5E9]/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Contact Person</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" placeholder="John Doe" value={newSupplier.contact} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-[#0EA5E9]/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Phone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" placeholder="+233..." value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-[#0EA5E9]/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="email" placeholder="sales@company.com" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-[#0EA5E9]/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Physical Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" placeholder="Accra, Ghana" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-[#0EA5E9]/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-2 border-t" style={{ borderColor: c.border }}>
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50" style={{ borderColor: c.border, color: c.muted }}>Cancel</button>
                <button onClick={handleAddSupplier} disabled={!newSupplier.name} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/40" style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
                  <Save size={18} /> Register Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-[32px] border overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            style={{ background: isDark ? '#0B1121' : '#ffffff', borderColor: c.border }}>
            
            <div className="p-6 border-b flex items-center justify-between"
              style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.5)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', boxShadow: '0 8px 20px rgba(99,102,241,0.25)' }}>
                  <Edit2 size={22} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold" style={{ color: c.text }}>Edit Supplier</h2>
                  <p className="text-xs mt-0.5" style={{ color: c.muted }}>Updating {editingSupplier.name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Company Name</label>
                  <div className="relative">
                    <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Contact Person</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" value={editForm.contact} onChange={e => setEditForm({...editForm, contact: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Phone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>Physical Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: c.text }} />
                    <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-2 border-t" style={{ borderColor: c.border }}>
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50" style={{ borderColor: c.border, color: c.muted }}>Cancel</button>
                <button onClick={handleEditSupplier} disabled={isSaving || !editForm.name} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSaving ? 'Saving Changes...' : 'Update Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 text-center" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: c.border }}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: c.text }}>Delete Supplier?</h3>
            <p className="text-sm mb-2" style={{ color: c.muted }}>This action is permanent and will remove this supplier from the directory.</p>
            <p className="text-xs mb-4" style={{ color: c.danger }}>Products will be disassociated. Invoices and purchases will remain but unlinked.</p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl text-xs font-medium text-left" style={{ background: 'rgba(239,68,68,0.1)', color: c.danger, border: `1px solid rgba(239,68,68,0.3)` }}>
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeDeleteModal} disabled={isDeleting} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: c.inputBg, color: c.text }}>Cancel</button>
              <button onClick={handleDeleteSupplier} disabled={isDeleting} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
