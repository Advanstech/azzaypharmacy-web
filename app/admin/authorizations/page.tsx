'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ShieldCheck, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, FileText, DollarSign, Clock, X, Loader2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gql } from '@/lib/gql';
import { Q_AUTHORIZATIONS_SHIFT, Q_AUTHORIZATIONS_EXPENSE, M_APPROVE_SHIFT, M_REJECT_SHIFT, M_UPDATE_EXPENSE_STATUS } from '@/lib/gql';

export default function AdminAuthorizationsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'EXPENSES'>('SHIFTS');
  
  const [shifts, setShifts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftData, expData] = await Promise.all([
        gql<any>(Q_AUTHORIZATIONS_SHIFT),
        gql<any>(Q_AUTHORIZATIONS_EXPENSE, { page: 1, limit: 1000 })
      ]);
      setShifts(shiftData.shiftReconciliations || []);
      setExpenses(expData.expenses?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Approval Modal State
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [overrideCash, setOverrideCash] = useState<string>('');
  const [overrideDigital, setOverrideDigital] = useState<string>('');
  const [overrideNotes, setOverrideNotes] = useState<string>('');
  const [approving, setApproving] = useState(false);
  const suggestedNotes = ["All verified", "Shortage approved", "Manager cleared variance"];

  const handleApproveShift = async (id: string) => {
    const shift = shifts.find(s => s.id === id);
    if (shift) {
      setSelectedShift(shift);
      setOverrideCash(Number(shift.physicalCash).toFixed(2));
      setOverrideDigital(Number(shift.digitalPayments).toFixed(2));
      setOverrideNotes(shift.notes || '');
    }
  };

  const confirmApproveShift = async () => {
    if (!selectedShift) return;
    setApproving(true);
    try {
      const vars = {
        id: selectedShift.id,
        physicalCash: overrideCash ? parseFloat(overrideCash) : undefined,
        digitalPayments: overrideDigital ? parseFloat(overrideDigital) : undefined,
        notes: overrideNotes || undefined
      };
      await gql(M_APPROVE_SHIFT, vars);
      setShifts(prev => prev.map(s => s.id === selectedShift.id ? { ...s, status: 'APPROVED' } : s));
      setSelectedShift(null);
    } catch (err) {
      alert('Error approving shift');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectShift = async (id: string) => {
    try {
      await gql(M_REJECT_SHIFT, { id });
      setShifts(prev => prev.map(s => s.id === id ? { ...s, status: 'REJECTED' } : s));
    } catch (err) {
      alert('Error rejecting shift');
    }
  };

  const handleApproveExpense = async (id: string) => {
    try {
      await gql(M_UPDATE_EXPENSE_STATUS, { id, status: 'APPROVED' });
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'APPROVED' } : e));
    } catch (err) {
      alert('Error approving expense');
    }
  };

  const handleRejectExpense = async (id: string) => {
    try {
      await gql(M_UPDATE_EXPENSE_STATUS, { id, status: 'REJECTED' });
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'REJECTED' } : e));
    } catch (err) {
      alert('Error rejecting expense');
    }
  };

  const isDark = mounted && theme === 'dark';
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  if (!mounted) return null;

  const currentData = activeTab === 'SHIFTS' ? shifts : expenses;
  const totalPages = Math.ceil(currentData.length / limit);
  const paginatedData = currentData.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Authorization Management</h1>
          <p className="text-sm" style={{ color: c.muted }}>Review and approve staff reconciliations and expenses</p>
        </div>
      </div>

      <div className="flex gap-4 border-b" style={{ borderColor: c.border }}>
        <button 
          onClick={() => { setActiveTab('SHIFTS'); setPage(1); }}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'SHIFTS' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500'}`}
        >
          Shift Reports ({shifts.filter(s => s.status === 'PENDING').length})
        </button>
        <button 
          onClick={() => { setActiveTab('EXPENSES'); setPage(1); }}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'EXPENSES' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500'}`}
        >
          Expenses ({expenses.filter(e => e.status === 'PENDING').length})
        </button>
      </div>

      <div className="rounded-[32px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
        <div className="p-4 border-b flex justify-between items-center" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className={activeTab === 'SHIFTS' ? 'text-blue-500' : 'text-emerald-500'} />
            <h3 className="font-display text-sm font-bold" style={{ color: c.text }}>
              {activeTab === 'SHIFTS' ? 'End of Day Reports' : 'Expense Requests'}
            </h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
            <input type="text" placeholder="Search..." className="pl-9 pr-4 py-1.5 rounded-lg text-xs outline-none" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }} />
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: c.border }}>
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading...</div>
          ) : paginatedData.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No records found.</div>
          ) : activeTab === 'SHIFTS' ? (
            paginatedData.map((s: any) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color: c.text }}>{s.pharmacist?.name || 'Unknown'}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
                        style={{ 
                          background: s.status === 'APPROVED' ? `${c.success}20` : s.status === 'REJECTED' ? `${c.danger}20` : `${c.warning}20`,
                          color: s.status === 'APPROVED' ? c.success : s.status === 'REJECTED' ? c.danger : c.warning
                        }}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      {new Date(s.createdAt).toLocaleString()} • {s.branch?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500">Expected: GH₵ {Number(s.totalRevenue).toFixed(2)}</p>
                    <p className="text-sm font-black" style={{ color: c.text }}>Declared: GH₵ {(Number(s.physicalCash) + Number(s.digitalPayments)).toFixed(2)}</p>
                    <p className="text-[10px] text-red-400 font-bold">Diff: GH₵ {Number(s.discrepancy).toFixed(2)}</p>
                  </div>
                  {s.status === 'PENDING' && (
                    <div className="flex gap-2 border-l pl-4" style={{ borderColor: c.border }}>
                      <button onClick={() => handleApproveShift(s.id)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={18} /></button>
                      <button onClick={() => handleRejectShift(s.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><XCircle size={18} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            paginatedData.map((e: any) => (
              <div key={e.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color: c.text }}>{e.description}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
                        style={{ 
                          background: e.status === 'APPROVED' ? `${c.success}20` : e.status === 'REJECTED' ? `${c.danger}20` : `${c.warning}20`,
                          color: e.status === 'APPROVED' ? c.success : e.status === 'REJECTED' ? c.danger : c.warning
                        }}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      {new Date(e.date).toLocaleDateString()} • {e.category?.name || 'General'} • By {e.requestedBy?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-black" style={{ color: c.text }}>GH₵ {Number(e.amount).toFixed(2)}</p>
                  </div>
                  {e.status === 'PENDING' && (
                    <div className="flex gap-2 border-l pl-4" style={{ borderColor: c.border }}>
                      <button onClick={() => handleApproveExpense(e.id)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={18} /></button>
                      <button onClick={() => handleRejectExpense(e.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><XCircle size={18} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
            <p className="text-xs text-slate-500">Showing page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border hover:bg-slate-500/10 disabled:opacity-50"
                style={{ borderColor: c.border, color: c.text }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border hover:bg-slate-500/10 disabled:opacity-50"
                style={{ borderColor: c.border, color: c.text }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <AnimatePresence>
        {selectedShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShift(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-[32px] overflow-hidden border shadow-2xl"
              style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: c.border }}
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                      <Edit3 size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold" style={{ color: c.text }}>Verify & Approve Shift</h2>
                      <p className="text-xs" style={{ color: c.muted }}>{selectedShift.pharmacist?.name || 'Unknown'} • {new Date(selectedShift.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedShift(null)} 
                    className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-6 p-4 rounded-xl border bg-slate-500/5" style={{ borderColor: c.border }}>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: c.muted }}>Expected Revenue</p>
                  <p className="text-xl font-mono font-black" style={{ color: c.text }}>GH₵ {Number(selectedShift.totalRevenue).toFixed(2)}</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Verify Physical Cash</label>
                      <input 
                        type="number" value={overrideCash} onChange={e => setOverrideCash(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', border: `1px solid ${c.border}`, color: c.text }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Verify Digital</label>
                      <input 
                        type="number" value={overrideDigital} onChange={e => setOverrideDigital(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', border: `1px solid ${c.border}`, color: c.text }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Manager Notes / Adjustments</label>
                    <textarea 
                      value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)}
                      placeholder="e.g. Cleared 5.00 discrepancy"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                      style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', border: `1px solid ${c.border}`, color: c.text }}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {suggestedNotes.map(note => (
                        <button
                          key={note}
                          onClick={() => setOverrideNotes(prev => prev ? `${prev} - ${note}` : note)}
                          className="px-2 py-1 rounded border text-[9px] font-bold tracking-wide transition-colors hover:bg-blue-500 hover:text-white"
                          style={{ borderColor: c.border, color: c.muted }}
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t mt-6" style={{ borderColor: c.border }}>
                  <button 
                    onClick={() => setSelectedShift(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: c.text }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmApproveShift}
                    disabled={approving}
                    className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-70"
                  >
                    {approving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Confirm & Approve
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
