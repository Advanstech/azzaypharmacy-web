'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { 
  Calendar, Clock, CheckCircle, AlertCircle, FileText, 
  Download, Printer, ArrowRight, UserCheck, BarChart3, TrendingUp,
  XCircle, Search, Filter, ShieldCheck, CheckSquare, ListTodo, ClipboardCheck, History,
  ChevronLeft, ChevronRight, CalendarSearch
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { gql, Q_MY_SHIFT_RECONCILIATIONS } from '@/lib/gql';

export default function EndOfDayDashboardPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { closeTerminal, todaySales, todayRevenue, todayTransactions, me, staff } = useStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [declaredCash, setDeclaredCash] = useState<string>('');
  const [declaredDigital, setDeclaredDigital] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Past reconciliations states
  const [pastShifts, setPastShifts] = useState<any[]>([]);
  const [loadingPastShifts, setLoadingPastShifts] = useState(false);

  // History pagination, search & filter
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const historyLimit = 5;

  const suggestedNotes = [
    "All balanced perfectly",
    "Shortage due to change issue",
    "Overage in physical cash",
    "Network issue with MoMo"
  ];

  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

  // Derived personal stats — robust multi-field matching
  const mySales = useMemo(() => {
    if (!me) return [];
    return todaySales.filter(s => {
      // Match by user.id (cuid from cashier relation)
      if (s.user?.id === me.id) return true;
      // Match by supabaseId (for sales created before the JWT fix)
      if (me.supabaseId && s.user?.id === me.supabaseId) return true;
      // Match by cashierId if present on the sale object
      if ((s as any).cashierId === me.id) return true;
      if (me.supabaseId && (s as any).cashierId === me.supabaseId) return true;
      return false;
    });
  }, [todaySales, me]);

  const myRevenue = mySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const myTransactions = mySales.length;

  const myCashSales = mySales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const myDigitalSales = mySales.filter(s => ['MOMO','CARD'].includes(s.paymentMethod)).reduce((sum, s) => sum + Number(s.totalAmount), 0);

  useEffect(() => { 
    setMounted(true); 
  }, []);

  const fetchPastShifts = async () => {
    if (!me?.id) return;
    setLoadingPastShifts(true);
    try {
      const data = await gql<{ myShiftReconciliations: any[] }>(Q_MY_SHIFT_RECONCILIATIONS, { userId: me.id });
      setPastShifts(data.myShiftReconciliations || []);
    } catch (e) {
      console.error("Failed to fetch past shifts", e);
    } finally {
      setLoadingPastShifts(false);
    }
  };

  useEffect(() => {
    if (mounted && me?.id) {
      fetchPastShifts();
    }
  }, [mounted, me?.id]);

  // Pre-populate inputs when sales load
  useEffect(() => {
    if (mounted && mySales.length > 0) {
      if (declaredCash === '') setDeclaredCash(myCashSales.toFixed(2));
      if (declaredDigital === '') setDeclaredDigital(myDigitalSales.toFixed(2));
    }
  }, [mounted, mySales.length, myCashSales, myDigitalSales]);

  const handleCloseTerminal = async () => {
    setLoading(true);
    try {
      const pCash = declaredCash ? parseFloat(declaredCash) : undefined;
      const dCash = declaredDigital ? parseFloat(declaredDigital) : undefined;
      const result = await closeTerminal(pCash, dCash, notes);
      setReport(result);
      setSubmitted(true);
      await fetchPastShifts();
    } catch (e: any) {
      setReport({
        cashierName: me?.name || user?.email || 'Staff',
        branchName: me?.branch?.name || 'Azzay Pharmacy',
        totalSales: myRevenue,
        cashSales: mySales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        momoSales: mySales.filter(s => s.paymentMethod === 'MOMO').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        cardSales: mySales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        nhisSales: mySales.filter(s => s.paymentMethod === 'NHIS').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        creditSales: mySales.filter(s => s.paymentMethod === 'CREDIT').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        transactionCount: myTransactions,
        closingTime: new Date().toISOString(),
      });
      setSubmitted(true);
      await fetchPastShifts();
    } finally {
      setLoading(false);
    }
  };

  // For managers, we simulate "pending closures" by showing active staff sales
  const activeStaffStats = staff
    .filter(s => s.isActive)
    .map(s => {
      const sSales = todaySales.filter(sale => sale.user?.id === s.id);
      const sTotal = sSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
      return {
        id: s.id,
        cashier: s.name,
        branch: s.branch?.name || 'Main Branch',
        total: sTotal,
        transactions: sSales.length,
        status: s.isOnDuty ? 'ON DUTY' : 'FINISHED',
        time: s.lastSeen || 'N/A'
      };
    })
    .filter(s => s.total > 0);

  const [verifiedStaff, setVerifiedStaff] = useState<string[]>([]);

  const handleVerify = (id: string) => {
    setVerifiedStaff(prev => [...prev, id]);
  };

  // ── History filtering & pagination ────────────────────────────────────────
  const filteredShifts = useMemo(() => {
    let result = pastShifts;

    // Status filter
    if (historyStatusFilter !== 'ALL') {
      result = result.filter(s => s.status === historyStatusFilter);
    }

    // Date filter
    if (historyDateFilter) {
      result = result.filter(s => {
        const shiftDate = new Date(s.createdAt).toISOString().split('T')[0];
        return shiftDate === historyDateFilter;
      });
    }

    // Text search (by branch name, notes, approver name)
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter(s =>
        (s.branch?.name || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q) ||
        (s.approvedBy?.name || '').toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
      );
    }

    return result;
  }, [pastShifts, historyStatusFilter, historyDateFilter, historySearch]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredShifts.length / historyLimit));
  const paginatedShifts = filteredShifts.slice((historyPage - 1) * historyLimit, historyPage * historyLimit);

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyStatusFilter, historyDateFilter, historySearch]);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    success: '#10B981',
    danger: '#EF4444',
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>
            {isManager ? 'Shift Supervision' : 'My End of Day'}
          </h1>
          <p className="text-sm" style={{ color: c.muted }}>
            {isManager ? 'Review and approve staff reconciliations' : 'Submit your shift report for approval'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Stats overview and history */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          
          {/* Supervision Dashboard for Managers */}
          {isManager && (
            <div className="rounded-[32px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
              <div className="p-6 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-blue-500" size={20} />
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c.text }}>Staff Session Overviews</h3>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: c.border }}>
                {activeStaffStats.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm" style={{ color: c.muted }}>No active sales sessions today</p>
                  </div>
                ) : activeStaffStats.map((item) => (
                  <div key={item.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                        <Clock size={24} className={item.status === 'ON DUTY' ? 'text-blue-400 animate-pulse' : 'text-amber-400'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: c.text }}>{item.cashier}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${item.status === 'ON DUTY' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                          {item.branch} • {item.transactions} txns
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold">Today's Sales</p>
                        <p className="text-lg font-black" style={{ color: c.text }}>GH₵ {item.total.toFixed(2)}</p>
                      </div>
                      
                      {!verifiedStaff.includes(item.id) ? (
                        <div className="flex gap-2 border-l pl-6" style={{ borderColor: c.border }}>
                          <button 
                            onClick={() => handleVerify(item.id)}
                            className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
                            title="Verify & Accept"
                          >
                            <CheckCircle size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                          <UserCheck size={16} />
                          <span className="text-[10px] font-black">VERIFIED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Session Summary */}
          <div className="rounded-[32px] border p-6 backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
            <h3 className="font-display text-xs font-bold uppercase tracking-widest mb-6" style={{ color: c.muted }}>
              {isManager ? 'Global Daily Totals' : 'Your Personal Session'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  label: 'Total Revenue', 
                  value: report?.totalSales ?? (isManager ? todayRevenue : myRevenue), 
                  icon: TrendingUp, color: c.primary 
                },
                { 
                  label: 'Physical Cash', 
                  value: report?.cashSales ?? (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + Number(s.totalAmount), 0), 
                  icon: FileText, color: c.success 
                },
                { 
                  label: 'Digital Payments', 
                  value: report ? (report.momoSales + report.cardSales) : (isManager ? todaySales : mySales).filter(s => ['MOMO','CARD'].includes(s.paymentMethod)).reduce((sum, s) => sum + Number(s.totalAmount), 0), 
                  icon: BarChart3, color: '#8B5CF6' 
                },
              ].map(k => (
                <div key={k.label} className="p-4 rounded-2xl border" style={{ borderColor: c.border, background: isDark ? 'rgba(0,0,0,0.1)' : '#fff' }}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{k.label}</p>
                  <p className="text-xl font-black font-mono" style={{ color: c.text }}>GH₵ {Number(k.value).toFixed(2)}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
              <div>
                <p className="text-xs" style={{ color: c.muted }}>Total Transactions</p>
                <p className="font-display text-xl font-bold" style={{ color: c.primary }}>{report?.transactionCount ?? (isManager ? todayTransactions : myTransactions)}</p>
              </div>
              {submitted && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', color: c.success }}>
                  <CheckCircle size={16} />
                  <span className="text-sm font-bold">Report Submitted</span>
                </div>
              )}
            </div>
          </div>

          {/* Shift Reconciliation History */}
          <div className="rounded-[32px] border overflow-hidden backdrop-blur-xl shadow-sm" style={{ background: c.bg, borderColor: c.border }}>
            <div className="px-4 md:px-6 py-5 border-b flex flex-col md:flex-row md:items-center gap-3 justify-between" style={{ borderColor: c.border, background: isDark ? '#0F172A' : '#F8FAFC' }}>
              <div className="flex items-center gap-3">
                <History size={18} className="text-blue-500" />
                <h2 className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: c.text }}>Shift Reconciliation History</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)', color: c.primary }}>
                  {filteredShifts.length}
                </span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="px-4 md:px-6 py-3 border-b flex flex-col md:flex-row gap-3 items-stretch md:items-center" style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.5)' }}>
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search by branch, notes, approver..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }}
                />
              </div>
              {/* Date Filter */}
              <div className="relative">
                <CalendarSearch className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={e => setHistoryDateFilter(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }}
                />
              </div>
              {/* Status Filter */}
              <select
                value={historyStatusFilter}
                onChange={e => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              {/* Clear filters */}
              {(historySearch || historyDateFilter || historyStatusFilter !== 'ALL') && (
                <button
                  onClick={() => { setHistorySearch(''); setHistoryDateFilter(''); setHistoryStatusFilter('ALL'); }}
                  className="text-[10px] font-bold px-3 py-2 rounded-xl transition-colors"
                  style={{ background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${c.border}` }}>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Submitted Date</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Expected / Declared</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Discrepancy</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Approver</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPastShifts ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-xs" style={{ color: c.muted }}>
                        Loading past shift reports...
                      </td>
                    </tr>
                  ) : paginatedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-xs" style={{ color: c.muted }}>
                        {pastShifts.length === 0 
                          ? 'No past shift reconciliations recorded.' 
                          : 'No results match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedShifts.map((shift, idx) => {
                      const dateText = new Date(shift.createdAt).toLocaleDateString();
                      const timeText = new Date(shift.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const totalDeclared = Number(shift.physicalCash) + Number(shift.digitalPayments);
                      const diff = Number(shift.discrepancy);
                      
                      return (
                        <tr key={shift.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30" style={{ borderBottom: idx < paginatedShifts.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold" style={{ color: c.text }}>{dateText}</p>
                            <p className="text-[10px]" style={{ color: c.muted }}>{timeText} · {shift.branch?.name}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs" style={{ color: c.text }}>
                              Exp: <span className="font-mono font-medium">GH₵ {Number(shift.totalRevenue).toFixed(2)}</span>
                            </p>
                            <p className="text-xs" style={{ color: c.muted }}>
                              Dec: <span className="font-mono font-medium">GH₵ {totalDeclared.toFixed(2)}</span>
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`font-mono text-xs font-bold ${diff === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              GH₵ {diff.toFixed(2)}
                            </span>
                            {shift.notes && (
                              <p className="text-[10px] italic mt-0.5 truncate max-w-[150px]" title={shift.notes} style={{ color: c.muted }}>
                                &quot;{shift.notes}&quot;
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded ${
                              shift.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                              shift.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {shift.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium" style={{ color: c.text }}>
                            {shift.approvedBy?.name || <span className="text-[10px]" style={{ color: c.muted }}>Pending manager review</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="px-4 md:px-6 py-3 border-t flex justify-between items-center" style={{ borderColor: c.border, background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC' }}>
                <p className="text-xs" style={{ color: c.muted }}>
                  Page {historyPage} of {historyTotalPages} · {filteredShifts.length} records
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-1.5 rounded-lg border hover:bg-slate-500/10 disabled:opacity-40 transition-all"
                    style={{ borderColor: c.border, color: c.text }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="p-1.5 rounded-lg border hover:bg-slate-500/10 disabled:opacity-40 transition-all"
                    style={{ borderColor: c.border, color: c.text }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Submission Form (top) & checklist */}
        <div className="lg:col-span-4 space-y-6 order-1 lg:order-2 w-full">
          
          {/* Finalize Shift Form */}
          {!isManager && (
            <div className="rounded-[32px] border p-6 backdrop-blur-xl bg-emerald-500/5" style={{ borderColor: c.success + '30' }}>
              <div className="flex items-center gap-3 mb-4">
                 <ClipboardCheck size={20} className="text-emerald-500" />
                 <h3 className="text-sm font-bold" style={{ color: c.text }}>Finalize Shift</h3>
              </div>
              <p className="text-xs leading-relaxed mb-6" style={{ color: c.muted }}>Submitting your report will log your final totals and notify management for approval.</p>
              
              {!submitted ? (
                <div className="space-y-4 mb-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Declared Physical Cash (GH₵)</label>
                      <input 
                        type="number"
                        value={declaredCash}
                        onChange={e => setDeclaredCash(e.target.value)}
                        placeholder={`e.g. ${myCashSales.toFixed(2)}`}
                        className="w-full bg-white/50 dark:bg-black/20 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        style={{ borderColor: c.border, color: c.text }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Declared Digital (MoMo/Card) (GH₵)</label>
                      <input 
                        type="number"
                        value={declaredDigital}
                        onChange={e => setDeclaredDigital(e.target.value)}
                        placeholder={`e.g. ${myDigitalSales.toFixed(2)}`}
                        className="w-full bg-white/50 dark:bg-black/20 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        style={{ borderColor: c.border, color: c.text }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: c.muted }}>Notes / Discrepancy Reason</label>
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any issues or reasons for discrepancy?"
                      className="w-full bg-white/50 dark:bg-black/20 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-2 resize-none"
                      style={{ borderColor: c.border, color: c.text }}
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedNotes.map(note => (
                        <button
                          key={note}
                          onClick={() => setNotes(note)}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wide transition-colors border"
                          style={{
                            background: notes === note ? c.primary : isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                            color: notes === note ? '#fff' : c.muted,
                            borderColor: notes === note ? c.primary : c.border
                          }}
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-start gap-2">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Shift report logged successfully!</p>
                    <p className="mt-0.5 opacity-80">Your manager will review and verify your declared totals. You can track status in the history log on the left.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleCloseTerminal}
                disabled={loading || submitted}
                className="w-full py-4 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest active:scale-[0.98]"
                style={{
                  background: submitted ? 'rgba(16,185,129,0.3)' : '#10B981',
                  color: '#fff',
                  opacity: loading ? 0.7 : 1,
                }}>
                {loading ? 'Processing...' : submitted ? '✓ Report Submitted' : 'Submit Reconciliation'}
              </button>
            </div>
          )}

          {/* Reconciliation Checklist */}
          <div className="rounded-[32px] border p-6 backdrop-blur-xl bg-blue-500/5 border-dashed" style={{ borderColor: c.primary + '40' }}>
            <div className="flex items-center gap-2 mb-4">
              <ListTodo size={16} className="text-blue-500" />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider" style={{ color: c.text }}>Reconciliation Checklist</h3>
            </div>
            <div className="space-y-3.5">
              {[
                { task: 'Verify Physical Cash Drawer', done: true },
                { task: 'Check MoMo/Card Statements', done: true },
                { task: 'Account for All Credit Sales', done: false },
                { task: 'Print Session Summary', done: false },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${t.done ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-500/30'}`}>
                    {t.done && <CheckSquare size={12} />}
                  </div>
                  <span className="text-xs font-medium" style={{ color: t.done ? c.text : c.muted }}>{t.task}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
