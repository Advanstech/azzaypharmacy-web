'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ShieldCheck, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, FileText, DollarSign, Clock, X, Loader2, Edit3, Calendar, User, Building2, Hash, AlertTriangle, RefreshCw, Eye, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gql } from '@/lib/gql';
import { Q_AUTHORIZATIONS_SHIFT, Q_AUTHORIZATIONS_EXPENSE, M_APPROVE_SHIFT, M_REJECT_SHIFT, M_UPDATE_EXPENSE_STATUS, Q_REFUND_REQUESTS, M_APPROVE_REFUND, M_REJECT_REFUND } from '@/lib/gql';
import { useStore } from '@/lib/store';

export default function AdminAuthorizationsPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'EXPENSES' | 'REFUNDS'>('SHIFTS');
  const { refetchSales, refetchProducts, refetchExpenses, refetchLedger } = useStore();

  const [shifts, setShifts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; type: 'SHIFT' | 'EXPENSE' | 'REFUND'; action: 'APPROVE' | 'REJECT'; label: string } | null>(null);

  // Search + date filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'SHIFT' | 'EXPENSE' | 'REFUND' | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 8;

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftData, expData, refundData] = await Promise.all([
        gql<any>(Q_AUTHORIZATIONS_SHIFT),
        gql<any>(Q_AUTHORIZATIONS_EXPENSE, { page: 1, limit: 1000 }),
        gql<any>(Q_REFUND_REQUESTS, { page: 1, limit: 1000 })
      ]);
      setShifts(shiftData.shiftReconciliations || []);
      setExpenses(expData.expenses?.items || []);
      setRefunds(refundData.refundRequests?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter helper — shared across all tabs
  const applyFilters = (items: any[], dateField: string, searchFn: (item: any) => string) => {
    return items.filter(item => {
      const d = new Date(item[dateField] || item.createdAt);
      if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      if (search) {
        const hay = searchFn(item).toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  };

  const filteredShifts = useMemo(() => applyFilters(
    shifts, 'createdAt',
    s => `${s.pharmacist?.name || ''} ${s.branch?.name || ''} ${s.status || ''} ${s.notes || ''}`
  ), [shifts, search, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => applyFilters(
    expenses, 'date',
    e => `${e.description || ''} ${e.requestedBy?.name || ''} ${e.approvedBy?.name || ''} ${e.category?.name || ''} ${e.status || ''}`
  ), [expenses, search, dateFrom, dateTo]);

  const filteredRefunds = useMemo(() => applyFilters(
    refunds, 'createdAt',
    r => `${r.requestedBy?.name || ''} ${r.approvedBy?.name || ''} ${r.reason || ''} ${r.status || ''} ${r.saleId || ''}`
  ), [refunds, search, dateFrom, dateTo]);

  // Auto-dismiss error after 4.5s
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4500);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const handleApproveRefund = async (id: string) => {
    setActioningId(id);
    try {
      const result = await gql<any>(M_APPROVE_REFUND, { requestId: id });
      const ab = result?.approveRefund?.approvedBy;
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED', approvedBy: ab } : r));
      if (detailItem?.id === id) setDetailItem((p: any) => ({ ...p, status: 'APPROVED', approvedBy: ab }));
      setTimeout(() => { refetchSales(); refetchProducts(); refetchLedger(); }, 400);
    } catch (err: any) {
      setErrorMsg('Failed to approve refund — please try again.');
    } finally { setActioningId(null); }
  };

  const handleRejectRefund = async (id: string) => {
    setActioningId(id);
    try {
      const result = await gql<any>(M_REJECT_REFUND, { requestId: id });
      const ab = result?.rejectRefund?.approvedBy;
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED', approvedBy: ab } : r));
      if (detailItem?.id === id) setDetailItem((p: any) => ({ ...p, status: 'REJECTED', approvedBy: ab }));
    } catch (err: any) {
      setErrorMsg('Failed to reject refund — please try again.');
    } finally { setActioningId(null); }
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
    } catch { setErrorMsg('Failed to approve shift — please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectShift = async (id: string) => {
    setActioningId(id);
    try {
      await gql(M_REJECT_SHIFT, { id });
      setShifts(prev => prev.map(s => s.id === id ? { ...s, status: 'REJECTED' } : s));
      if (detailItem?.id === id) setDetailItem((p: any) => ({ ...p, status: 'REJECTED' }));
    } catch { setErrorMsg('Failed to reject shift — please try again.'); }
    finally { setActioningId(null); }
  };

  const handleApproveExpense = async (id: string) => {
    setActioningId(id);
    try {
      await gql(M_UPDATE_EXPENSE_STATUS, { id, status: 'APPROVED' });
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'APPROVED' } : e));
      if (detailItem?.id === id) setDetailItem((p: any) => ({ ...p, status: 'APPROVED' }));
      setTimeout(() => { refetchExpenses(); refetchLedger(); }, 400);
    } catch { setErrorMsg('Failed to approve expense — please try again.'); }
    finally { setActioningId(null); }
  };

  const handleRejectExpense = async (id: string) => {
    setActioningId(id);
    try {
      await gql(M_UPDATE_EXPENSE_STATUS, { id, status: 'REJECTED' });
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'REJECTED' } : e));
      if (detailItem?.id === id) setDetailItem((p: any) => ({ ...p, status: 'REJECTED' }));
      setTimeout(() => { refetchExpenses(); }, 300);
    } catch { setErrorMsg('Failed to reject expense — please try again.'); }
    finally { setActioningId(null); }
  };

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    inputBg: isDark ? 'rgba(0,0,0,0.25)' : '#fff',
    headerBg: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC',
  };

  if (!mounted) return null;

  // ── Filtered + paginated ────────────────────────────────────────────────
  const currentFiltered = activeTab === 'SHIFTS' ? filteredShifts : activeTab === 'EXPENSES' ? filteredExpenses : filteredRefunds;
  const totalPages = Math.max(1, Math.ceil(currentFiltered.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedData = currentFiltered.slice((safePage - 1) * limit, safePage * limit);

  // ── Status badge ────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => (
    <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
      style={{
        background: status === 'APPROVED' ? `${c.success}20` : status === 'REJECTED' ? `${c.danger}20` : `${c.warning}20`,
        color: status === 'APPROVED' ? c.success : status === 'REJECTED' ? c.danger : c.warning,
      }}>{status}</span>
  );

  // ── Detail row: who authorized ──────────────────────────────────────────
  const AuthorizedBy = ({ person, label = 'Actioned by' }: { person?: any; label?: string }) => {
    if (!person) return null;
    const role = person.role ? ` · ${person.role}` : '';
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: c.success }}>
        <CheckCircle size={9} /> {label}: {person.name}{role}
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: c.text }}>Authorizations</h1>
        <p className="text-sm" style={{ color: c.muted }}>Approve or reject shift reports, expenses and refunds</p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold"
            style={{ background: `${c.danger}15`, borderColor: `${c.danger}40`, color: c.danger }}>
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="p-1 flex-shrink-0"><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Date Filter toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 px-3 py-3 rounded-2xl border" style={{ background: c.bg, borderColor: c.border }}>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={13} style={{ color: c.muted }} />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, reason, status…"
            className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
            style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: c.muted }} />
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
          <span className="text-xs" style={{ color: c.muted }}>–</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
          {(dateFrom || dateTo || search) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: `${c.danger}15`, color: c.danger }}>
              Clear
            </button>
          )}
        </div>
        <button onClick={fetchData} title="Refresh" className="p-2 rounded-xl border transition-colors hover:bg-slate-500/10"
          style={{ borderColor: c.border, color: c.muted }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: c.border }}>
        {(['SHIFTS', 'EXPENSES', 'REFUNDS'] as const).map(tab => {
          const counts = { SHIFTS: shifts.filter(s => s.status === 'PENDING').length, EXPENSES: expenses.filter(e => e.status === 'PENDING').length, REFUNDS: refunds.filter(r => r.status === 'PENDING').length };
          const colors = { SHIFTS: 'blue', EXPENSES: 'emerald', REFUNDS: 'orange' };
          const labels = { SHIFTS: 'Shift Reports', EXPENSES: 'Expenses', REFUNDS: 'Refund Requests' };
          const col = colors[tab];
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2`}
              style={{ borderColor: isActive ? (col === 'blue' ? '#3B82F6' : col === 'emerald' ? '#10B981' : '#F97316') : 'transparent', color: isActive ? (col === 'blue' ? '#3B82F6' : col === 'emerald' ? '#10B981' : '#F97316') : c.muted }}>
              {labels[tab]}
              {counts[tab] > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: col === 'blue' ? '#3B82F620' : col === 'emerald' ? '#10B98120' : '#F9731620', color: col === 'blue' ? '#3B82F6' : col === 'emerald' ? '#10B981' : '#F97316' }}>
                  {counts[tab]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div className="rounded-[28px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
        {/* Card header */}
        <div className="px-5 py-3 border-b flex justify-between items-center" style={{ background: c.headerBg, borderColor: c.border }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={activeTab === 'SHIFTS' ? 'text-blue-500' : activeTab === 'EXPENSES' ? 'text-emerald-500' : 'text-orange-500'} />
            <span className="font-bold text-sm" style={{ color: c.text }}>
              {activeTab === 'SHIFTS' ? 'End of Day Reports' : activeTab === 'EXPENSES' ? 'Expense Requests' : 'Refund Requests'}
            </span>
          </div>
          <span className="text-xs" style={{ color: c.muted }}>
            {currentFiltered.length} record{currentFiltered.length !== 1 ? 's' : ''}
            {(search || dateFrom || dateTo) ? ' (filtered)' : ''}
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: c.border }}>
          {loading ? (
            <div className="p-12 flex items-center justify-center gap-3 text-sm" style={{ color: c.muted }}>
              <Loader2 size={18} className="animate-spin" /> Loading…
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: c.muted }}>No records match your filters.</div>
          ) : activeTab === 'SHIFTS' ? paginatedData.map((s: any) => (
            <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-500/5 transition-colors cursor-pointer"
              onClick={() => { setDetailItem(s); setDetailType('SHIFT'); }}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-blue-500/10 text-blue-500"><Clock size={18} /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm" style={{ color: c.text }}>{s.pharmacist?.name || 'Unknown'}</p>
                    <StatusBadge status={s.status} />
                    <AuthorizedBy person={s.approvedBy} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>
                    {new Date(s.createdAt).toLocaleString('en-GB')} &bull; {s.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (s.branch?.name || 'Branch')}
                    {s.notes && <span className="normal-case ml-1">· "{s.notes}"</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <div className="text-right">
                  <p className="text-[10px] font-bold" style={{ color: c.muted }}>Expected: GH₵ {Number(s.totalRevenue).toFixed(2)}</p>
                  <p className="text-sm font-black" style={{ color: c.text }}>GH₵ {(Number(s.physicalCash) + Number(s.digitalPayments)).toFixed(2)}</p>
                  <p className="text-[10px] font-bold" style={{ color: Number(s.discrepancy) !== 0 ? c.danger : c.success }}>
                    Diff: GH₵ {Number(s.discrepancy).toFixed(2)}
                  </p>
                </div>
                {s.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-1.5">
                    <button
                      disabled={actioningId === s.id}
                      onClick={() => { const label = 'this shift report'; setConfirmDialog({ id: s.id, type: 'SHIFT', action: 'APPROVE', label }); }}
                      title="Approve"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 min-h-[44px] text-xs font-bold">
                      {actioningId === s.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button
                      disabled={actioningId === s.id}
                      onClick={() => { const label = 'this shift report'; setConfirmDialog({ id: s.id, type: 'SHIFT', action: 'REJECT', label }); }}
                      title="Reject"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 min-h-[44px] text-xs font-bold">
                      {actioningId === s.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} <span className="hidden sm:inline">Reject</span>
                    </button>
                  </div>
                )}
                <button onClick={() => { setDetailItem(s); setDetailType('SHIFT'); }} className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ color: c.muted }}><Eye size={14} /></button>
              </div>
            </div>
          )) : activeTab === 'EXPENSES' ? paginatedData.map((e: any) => (
            <div key={e.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-500/5 transition-colors cursor-pointer"
              onClick={() => { setDetailItem(e); setDetailType('EXPENSE'); }}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500"><DollarSign size={18} /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm truncate" style={{ color: c.text }}>{e.description}</p>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>
                    <span>{new Date(e.date).toLocaleDateString('en-GB')}</span>
                    <span>&bull; {e.category?.name || 'General'}</span>
                    <span style={{ color: c.primary }}>&bull; By: {e.requestedBy?.name || 'Unknown'}</span>
                    <AuthorizedBy person={e.approvedBy} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <p className="text-sm font-black" style={{ color: c.text }}>GH₵ {Number(e.amount).toFixed(2)}</p>
                {e.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-1.5">
                    <button
                      disabled={actioningId === e.id}
                      onClick={() => setConfirmDialog({ id: e.id, type: 'EXPENSE', action: 'APPROVE', label: `expense of GH₵${Number(e.amount).toFixed(2)}` })}
                      title="Approve"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 min-h-[44px] text-xs font-bold">
                      {actioningId === e.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button
                      disabled={actioningId === e.id}
                      onClick={() => setConfirmDialog({ id: e.id, type: 'EXPENSE', action: 'REJECT', label: `expense of GH₵${Number(e.amount).toFixed(2)}` })}
                      title="Reject"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 min-h-[44px] text-xs font-bold">
                      {actioningId === e.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} <span className="hidden sm:inline">Reject</span>
                    </button>
                  </div>
                )}
                <button onClick={() => { setDetailItem(e); setDetailType('EXPENSE'); }} className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ color: c.muted }}><Eye size={14} /></button>
              </div>
            </div>
          )) : paginatedData.map((r: any) => (
            <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-500/5 transition-colors cursor-pointer"
              onClick={() => { setDetailItem(r); setDetailType('REFUND'); }}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-orange-500/10 text-orange-500"><FileText size={18} /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm" style={{ color: c.text }}>Refund #{r.saleId?.slice(-6).toUpperCase()}</p>
                    <StatusBadge status={r.status} />
                    <AuthorizedBy person={r.approvedBy} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>
                    <span>{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                    <span style={{ color: c.muted }}>&bull; {r.reason || 'No reason'}</span>
                    {r.requestedBy && <span style={{ color: c.primary }}>&bull; By: {r.requestedBy.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: c.text }}>GH₵ {Number(r.sale?.totalAmount || 0).toFixed(2)}</p>
                  {r.sale?.paymentMethod && <p className="text-[10px] font-bold uppercase" style={{ color: c.muted }}>{r.sale.paymentMethod}</p>}
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-1.5">
                    <button
                      disabled={actioningId === r.id}
                      onClick={() => setConfirmDialog({ id: r.id, type: 'REFUND', action: 'APPROVE', label: `refund of GH₵${Number(r.sale?.totalAmount || 0).toFixed(2)}` })}
                      title="Approve"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 min-h-[44px] text-xs font-bold">
                      {actioningId === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button
                      disabled={actioningId === r.id}
                      onClick={() => setConfirmDialog({ id: r.id, type: 'REFUND', action: 'REJECT', label: `refund of GH₵${Number(r.sale?.totalAmount || 0).toFixed(2)}` })}
                      title="Reject"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 min-h-[44px] text-xs font-bold">
                      {actioningId === r.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} <span className="hidden sm:inline">Reject</span>
                    </button>
                  </div>
                )}
                <button onClick={() => { setDetailItem(r); setDetailType('REFUND'); }} className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ color: c.muted }}><Eye size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination — always shown when there's data */}
        <div className="px-5 py-3 border-t flex justify-between items-center" style={{ background: c.headerBg, borderColor: c.border }}>
          <p className="text-xs" style={{ color: c.muted }}>
            Showing {paginatedData.length > 0 ? (safePage - 1) * limit + 1 : 0}–{Math.min(safePage * limit, currentFiltered.length)} of {currentFiltered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1}
              className="px-2 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-40 hover:bg-slate-500/10 transition-colors"
              style={{ borderColor: c.border, color: c.text }}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className="p-1.5 rounded-lg border disabled:opacity-40 hover:bg-slate-500/10 transition-colors"
              style={{ borderColor: c.border, color: c.text }}><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
              const p = start + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs font-bold border transition-colors"
                  style={{ borderColor: p === safePage ? c.primary : c.border, background: p === safePage ? `${c.primary}15` : 'transparent', color: p === safePage ? c.primary : c.text }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border disabled:opacity-40 hover:bg-slate-500/10 transition-colors"
              style={{ borderColor: c.border, color: c.text }}><ChevronRight size={14} /></button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
              className="px-2 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-40 hover:bg-slate-500/10 transition-colors"
              style={{ borderColor: c.border, color: c.text }}>»</button>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailItem && detailType && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="relative w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border shadow-2xl max-h-[92vh] overflow-y-auto"
              style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: c.border }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-400/30 sm:hidden" />
              <div className="p-6 pt-9 sm:pt-6">
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${detailType === 'SHIFT' ? 'bg-blue-500/10 text-blue-500' : detailType === 'EXPENSE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {detailType === 'SHIFT' ? <Clock size={18} /> : detailType === 'EXPENSE' ? <DollarSign size={18} /> : <FileText size={18} />}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg" style={{ color: c.text }}>
                        {detailType === 'SHIFT' ? 'Shift Report Detail' : detailType === 'EXPENSE' ? 'Expense Detail' : 'Refund Detail'}
                      </h2>
                      <StatusBadge status={detailItem.status} />
                    </div>
                  </div>
                  <button onClick={() => setDetailItem(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" style={{ color: c.muted }}><X size={18} /></button>
                </div>

                {/* Detail rows */}
                <div className="space-y-3 mb-5">
                  {detailType === 'SHIFT' && (<>
                    <DetailRow label="Staff Member" value={detailItem.pharmacist?.name || '—'} icon={<User size={12} />} c={c} />
                    <DetailRow label="Role" value={detailItem.pharmacist?.role || '—'} icon={<ShieldCheck size={12} />} c={c} />
                    <DetailRow label="Branch" value={detailItem.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (detailItem.branch?.name || '—')} icon={<Building2 size={12} />} c={c} />
                    <DetailRow label="Submitted" value={new Date(detailItem.createdAt).toLocaleString('en-GB')} icon={<Calendar size={12} />} c={c} />
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <MetricBox label="Expected" value={`GH₵ ${Number(detailItem.totalRevenue).toFixed(2)}`} c={c} isDark={isDark} />
                      <MetricBox label="Cash Declared" value={`GH₵ ${Number(detailItem.physicalCash).toFixed(2)}`} c={c} isDark={isDark} />
                      <MetricBox label="Digital" value={`GH₵ ${Number(detailItem.digitalPayments).toFixed(2)}`} c={c} isDark={isDark} />
                    </div>
                    <div className="p-3 rounded-xl border" style={{ borderColor: Number(detailItem.discrepancy) !== 0 ? `${c.danger}40` : `${c.success}40`, background: Number(detailItem.discrepancy) !== 0 ? `${c.danger}08` : `${c.success}08` }}>
                      <p className="text-xs font-black" style={{ color: Number(detailItem.discrepancy) !== 0 ? c.danger : c.success }}>
                        Discrepancy: GH₵ {Number(detailItem.discrepancy).toFixed(2)}
                        {Number(detailItem.discrepancy) === 0 ? ' — Balanced ✓' : ' — Variance detected'}
                      </p>
                    </div>
                    {detailItem.notes && <DetailRow label="Notes" value={detailItem.notes} icon={<Edit3 size={12} />} c={c} />}
                    {detailItem.approvedBy && (
                      <div className="p-3 rounded-xl border" style={{ borderColor: `${c.success}30`, background: `${c.success}08` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: c.muted }}>Authorized By</p>
                        <p className="text-sm font-bold" style={{ color: c.success }}>{detailItem.approvedBy.name}</p>
                        {detailItem.approvedBy.role && <p className="text-xs" style={{ color: c.muted }}>{detailItem.approvedBy.role}</p>}
                      </div>
                    )}
                  </>)}

                  {detailType === 'EXPENSE' && (<>
                    <DetailRow label="Description" value={detailItem.description || '—'} icon={<Hash size={12} />} c={c} />
                    <DetailRow label="Category" value={detailItem.category?.name || 'General'} icon={<FileText size={12} />} c={c} />
                    <DetailRow label="Date" value={new Date(detailItem.date).toLocaleDateString('en-GB')} icon={<Calendar size={12} />} c={c} />
                    <DetailRow label="Amount" value={`GH₵ ${Number(detailItem.amount).toFixed(2)}`} icon={<DollarSign size={12} />} c={c} valueColor={c.text} />
                    <DetailRow label="Requested By" value={detailItem.requestedBy?.name || '—'} icon={<User size={12} />} c={c} valueColor={c.primary} />
                    {detailItem.approvedBy && (
                      <div className="p-3 rounded-xl border" style={{ borderColor: `${c.success}30`, background: `${c.success}08` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: c.muted }}>Authorized By</p>
                        <p className="text-sm font-bold" style={{ color: c.success }}>{detailItem.approvedBy.name}</p>
                        {detailItem.approvedBy.role && <p className="text-xs" style={{ color: c.muted }}>{detailItem.approvedBy.role} — approved this expense</p>}
                      </div>
                    )}
                  </>)}

                  {detailType === 'REFUND' && (<>
                    <DetailRow label="Sale Reference" value={`#${detailItem.saleId?.slice(-6).toUpperCase()}`} icon={<Hash size={12} />} c={c} />
                    <DetailRow label="Sale Amount" value={`GH₵ ${Number(detailItem.sale?.totalAmount || 0).toFixed(2)}`} icon={<DollarSign size={12} />} c={c} />
                    {detailItem.sale?.paymentMethod && <DetailRow label="Payment Method" value={detailItem.sale.paymentMethod} icon={<FileText size={12} />} c={c} />}
                    <DetailRow label="Reason" value={detailItem.reason || 'No reason given'} icon={<AlertTriangle size={12} />} c={c} valueColor={c.warning} />
                    <DetailRow label="Submitted" value={new Date(detailItem.createdAt).toLocaleString('en-GB')} icon={<Calendar size={12} />} c={c} />
                    <DetailRow label="Requested By" value={detailItem.requestedBy?.name || '—'} icon={<User size={12} />} c={c} valueColor={c.primary} />
                    {detailItem.approvedBy && (
                      <div className="p-3 rounded-xl border" style={{ borderColor: `${c.success}30`, background: `${c.success}08` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: c.muted }}>Authorized By</p>
                        <p className="text-sm font-bold" style={{ color: c.success }}>{detailItem.approvedBy.name}</p>
                        {detailItem.approvedBy.role && <p className="text-xs" style={{ color: c.muted }}>{detailItem.approvedBy.role} — stock & ledger reversed</p>}
                      </div>
                    )}
                    {detailItem.status === 'APPROVED' && (
                      <div className="p-3 rounded-xl border text-xs font-medium" style={{ borderColor: `${c.success}30`, background: `${c.success}08`, color: c.success }}>
                        ✓ Stock restored &amp; revenue ledger reversed
                      </div>
                    )}
                  </>)}
                </div>

                {/* Action buttons if still pending */}
                {detailItem.status === 'PENDING' && (
                  <div className="flex gap-3 pt-4 border-t" style={{ borderColor: c.border }}>
                    <button onClick={() => setDetailItem(null)} className="flex-1 py-3 rounded-xl font-bold text-sm border transition-colors hover:bg-black/5 dark:hover:bg-white/5 min-h-[52px]" style={{ borderColor: c.border, color: c.text }}>
                      Close
                    </button>
                    <button
                      onClick={() => {
                        const id = detailItem.id;
                        const type = detailType!;
                        const label = type === 'EXPENSE' ? `expense of GH₵${Number(detailItem.amount).toFixed(2)}` : type === 'REFUND' ? `refund of GH₵${Number(detailItem.sale?.totalAmount||0).toFixed(2)}` : 'this shift report';
                        setDetailItem(null);
                        setConfirmDialog({ id, type, action: 'APPROVE', label });
                      }}
                      className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-colors min-h-[52px]">
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const id = detailItem.id;
                        const type = detailType!;
                        const label = type === 'EXPENSE' ? `expense of GH₵${Number(detailItem.amount).toFixed(2)}` : type === 'REFUND' ? `refund of GH₵${Number(detailItem.sale?.totalAmount||0).toFixed(2)}` : 'this shift report';
                        setDetailItem(null);
                        setConfirmDialog({ id, type, action: 'REJECT', label });
                      }}
                      className="flex-1 py-3 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors min-h-[52px]">
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}
                {detailItem.status !== 'PENDING' && (
                  <button onClick={() => setDetailItem(null)} className="w-full py-2.5 rounded-xl font-bold text-sm border transition-colors hover:bg-black/5 dark:hover:bg-white/5 mt-2" style={{ borderColor: c.border, color: c.text }}>
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Dialog ───────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setConfirmDialog(null)} />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="relative w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] border-t sm:border shadow-2xl"
              style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: confirmDialog.action === 'APPROVE' ? `${c.success}40` : `${c.danger}40` }}>
              {/* Handle bar — mobile only */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-400/30 sm:hidden" />
              <div className="p-6 pt-9 sm:pt-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmDialog.action === 'APPROVE' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                  {confirmDialog.action === 'APPROVE'
                    ? <CheckCircle size={28} className="text-emerald-500" />
                    : <XCircle size={28} className="text-red-400" />}
                </div>
                <h3 className="text-center font-display font-bold text-lg mb-1" style={{ color: c.text }}>
                  {confirmDialog.action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </h3>
                <p className="text-center text-sm mb-6" style={{ color: c.muted }}>
                  {confirmDialog.action === 'APPROVE' ? 'Approve' : 'Reject'} this{' '}
                  <span className="font-bold" style={{ color: c.text }}>{confirmDialog.label}</span>?
                  <br /><span className="text-xs">This action cannot be undone.</span>
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDialog(null)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-sm border min-h-[52px]"
                    style={{ borderColor: c.border, color: c.muted }}>Cancel</button>
                  <button
                    onClick={() => {
                      const { id, type, action } = confirmDialog!;
                      setConfirmDialog(null);
                      if (type === 'SHIFT' && action === 'APPROVE') handleApproveShift(id);
                      else if (type === 'SHIFT' && action === 'REJECT') handleRejectShift(id);
                      else if (type === 'EXPENSE' && action === 'APPROVE') handleApproveExpense(id);
                      else if (type === 'EXPENSE' && action === 'REJECT') handleRejectExpense(id);
                      else if (type === 'REFUND' && action === 'APPROVE') handleApproveRefund(id);
                      else if (type === 'REFUND' && action === 'REJECT') handleRejectRefund(id);
                    }}
                    className={`flex-[2] py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 min-h-[52px] shadow-lg transition-all active:scale-95 ${
                      confirmDialog.action === 'APPROVE'
                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                        : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                    }`}>
                    {confirmDialog.action === 'APPROVE' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    {confirmDialog.action === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Shift Approval (verify) Modal ────────────────────────────────── */}
      <AnimatePresence>
        {selectedShift && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedShift(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="relative w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: c.border }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-400/30 sm:hidden" />
              <div className="p-6 pt-9 sm:pt-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500"><Edit3 size={20} /></div>
                    <div>
                      <h2 className="text-xl font-display font-bold" style={{ color: c.text }}>Verify & Approve Shift</h2>
                      <p className="text-xs" style={{ color: c.muted }}>{selectedShift.pharmacist?.name || 'Unknown'} &bull; {new Date(selectedShift.createdAt).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedShift(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" style={{ color: c.muted }}><X size={20} /></button>
                </div>
                <div className="mb-5 p-4 rounded-xl border bg-slate-500/5" style={{ borderColor: c.border }}>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: c.muted }}>Expected Revenue</p>
                  <p className="text-2xl font-mono font-black" style={{ color: c.text }}>GH₵ {Number(selectedShift.totalRevenue).toFixed(2)}</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Verify Physical Cash</label>
                      <input type="number" value={overrideCash} onChange={e => setOverrideCash(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Verify Digital</label>
                      <input type="number" value={overrideDigital} onChange={e => setOverrideDigital(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Manager Notes</label>
                    <textarea value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)}
                      placeholder="e.g. Cleared 5.00 discrepancy" rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', border: `1px solid ${c.border}`, color: c.text }} />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {suggestedNotes.map(note => (
                        <button key={note} onClick={() => setOverrideNotes(prev => prev ? `${prev} - ${note}` : note)}
                          className="px-2 py-1 rounded border text-[9px] font-bold tracking-wide hover:bg-blue-500 hover:text-white transition-colors"
                          style={{ borderColor: c.border, color: c.muted }}>{note}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-5 border-t mt-5" style={{ borderColor: c.border }}>
                  <button onClick={() => setSelectedShift(null)} className="flex-1 py-3.5 rounded-xl font-bold text-sm border min-h-[52px]" style={{ borderColor: c.border, color: c.text }}>Cancel</button>
                  <button onClick={confirmApproveShift} disabled={approving}
                    className="flex-[2] py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-70 transition-all active:scale-95 min-h-[52px]">
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

// ── Small helper components ─────────────────────────────────────────────────
function DetailRow({ label, value, icon, c, valueColor }: { label: string; value: string; icon?: React.ReactNode; c: any; valueColor?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: c.border }}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: c.muted }}>
        {icon}{label}
      </div>
      <p className="text-sm font-bold text-right" style={{ color: valueColor || c.text }}>{value}</p>
    </div>
  );
}

function MetricBox({ label, value, c, isDark }: { label: string; value: string; c: any; isDark: boolean }) {
  return (
    <div className="p-3 rounded-xl border text-center" style={{ background: isDark ? 'rgba(0,0,0,0.15)' : '#F8FAFC', borderColor: c.border }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: c.muted }}>{label}</p>
      <p className="text-sm font-black font-mono" style={{ color: c.text }}>{value}</p>
    </div>
  );
}
