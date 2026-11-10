'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CalendarSearch,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileText,
  Filter,
  History,
  ListTodo,
  Receipt,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserCheck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { useCustomAuth } from '@/lib/custom-auth';
import { useStore } from '@/lib/store';
import { gql, Q_MY_SHIFT_RECONCILIATIONS, Q_ALL_SHIFT_RECONCILIATIONS } from '@/lib/gql';
import { useRouter } from 'next/navigation';
import { useBranch, useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';

function formatCurrency(value: unknown) {
  return `GH₵ ${Number(value || 0).toFixed(2)}`;
}

function branchLabel(name?: string | null) {
  if (!name) return 'Branch';
  return name.toLowerCase().includes('chemical') ? 'Chemical Shop' : 'Main Branch';
}

export default function EndOfDayDashboardPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user, signOut } = useCustomAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { closeTerminal, todaySales, todayRevenue, todayTransactions, me, staff } = useStore();
  const branchFilter = useBranchFilter();
  const { activeBranchId } = useBranch();
  const branchTodaySales = useMemo(() => branchFilter(todaySales), [branchFilter, todaySales]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [actionError, setActionError] = useState('');

  const [declaredCash, setDeclaredCash] = useState<string>('');
  const [declaredDigital, setDeclaredDigital] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Past reconciliations states
  const [pastShifts, setPastShifts] = useState<any[]>([]);
  const [loadingPastShifts, setLoadingPastShifts] = useState(false);

  // History pagination, search & filter
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStaffFilter, setHistoryStaffFilter] = useState('ALL');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historyLimit, setHistoryLimit] = useState(5);

  const suggestedNotes = [
    "All balanced perfectly",
    "Shortage due to change issue",
    "Overage in physical cash",
    "Network issue with MoMo"
  ];

  const role = me?.role || user?.role || user?.user_metadata?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

  // Derived personal stats — robust multi-field matching
  const mySales = useMemo(() => {
    if (!me) return [];
    return branchTodaySales.filter(s => {
      // Match by user.id (cuid from cashier relation)
      if (s.user?.id === me.id) return true;
      // Match by supabaseId (for sales created before the JWT fix)
      if (me.supabaseId && s.user?.id === me.supabaseId) return true;
      // Match by cashierId if present on the sale object
      if ((s as any).cashierId === me.id) return true;
      if (me.supabaseId && (s as any).cashierId === me.supabaseId) return true;
      return false;
    });
  }, [branchTodaySales, me]);

  const myRevenue = mySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const myTransactions = mySales.length;

  const myCashSales = mySales.reduce((sum, s) => sum + (s.paymentMethod === 'CASH' ? Number(s.totalAmount) : (s.cashAmount || 0)), 0);
  const myDigitalSales = mySales.reduce((sum, s) => sum + (s.paymentMethod === 'MOMO' || s.paymentMethod === 'CARD' ? Number(s.totalAmount) : (s.momoAmount || 0)), 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPastShifts = async () => {
    if (!me?.id) return;
    setLoadingPastShifts(true);
    try {
      if (isManager) {
        // Fetch branch reconciliations for managers
        const data = await gql<{ allShiftReconciliations: any[] }>(Q_ALL_SHIFT_RECONCILIATIONS, { branchId: activeBranchId ?? undefined });
        setPastShifts(data.allShiftReconciliations || []);
      } else {
        // Fetch own reconciliations for the active branch
        const data = await gql<{ myShiftReconciliations: any[] }>(Q_MY_SHIFT_RECONCILIATIONS, { userId: me.id, branchId: activeBranchId ?? undefined });
        setPastShifts(data.myShiftReconciliations || []);
      }
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
  }, [mounted, me?.id, activeBranchId]);

  // Pre-populate inputs when sales load
  useEffect(() => {
    if (mounted && mySales.length > 0) {
      if (declaredCash === '') setDeclaredCash(myCashSales.toFixed(2));
      if (declaredDigital === '') setDeclaredDigital(myDigitalSales.toFixed(2));
    }
  }, [mounted, mySales.length, myCashSales, myDigitalSales]);

  const handleCloseTerminal = async () => {
    const invalidCash = declaredCash.trim() !== '' && (!Number.isFinite(Number(declaredCash)) || Number(declaredCash) < 0);
    const invalidDigital = declaredDigital.trim() !== '' && (!Number.isFinite(Number(declaredDigital)) || Number(declaredDigital) < 0);
    if (invalidCash || invalidDigital) return;

    setLoading(true);
    setActionError('');
    try {
      const pCash = declaredCash.trim() ? parseFloat(declaredCash) : undefined;
      const dCash = declaredDigital.trim() ? parseFloat(declaredDigital) : undefined;
      const result = await closeTerminal(pCash, dCash, notes);
      setReport(result);
      setSubmitted(true);
      await fetchPastShifts();
      // Security: sign out shortly after a successful submission
      setTimeout(async () => {
        await signOut();
        router.push('/');
      }, 1500);
    } catch (e: any) {
      setActionError(e instanceof Error ? e.message : 'Failed to submit your end-of-day reconciliation. Please try again.');
      console.error('Failed to submit end-of-day reconciliation', e);
    } finally {
      setLoading(false);
    }
  };

  // For managers, we simulate "pending closures" by showing active staff sales
  const activeStaffStats = staff
    .filter(s => s.isActive)
    .map(s => {
      const sSales = branchTodaySales.filter(sale => sale.user?.id === s.id);
      const sTotal = sSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
      return {
        id: s.id,
        cashier: s.name,
        branch: s.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (s.branch?.name ? 'Main Branch' : 'Branch'),
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
  const historyStaffOptions = useMemo(() => {
    const byId = new Map<string, string>();
    pastShifts.forEach(s => {
      if (s.pharmacist?.id) byId.set(s.pharmacist.id, s.pharmacist.name || 'Staff member');
    });
    return Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pastShifts]);

  const filteredShifts = useMemo(() => {
    let result = pastShifts;

    // Status filter
    if (historyStatusFilter !== 'ALL') {
      result = result.filter(s => s.status === historyStatusFilter);
    }

    // Staff filter (managers only — own history has a single requester)
    if (isManager && historyStaffFilter !== 'ALL') {
      result = result.filter(s => s.pharmacist?.id === historyStaffFilter);
    }

    // Date range filter
    if (historyStartDate || historyEndDate) {
      result = result.filter(s => {
        const shiftDate = new Date(s.createdAt).toISOString().split('T')[0];
        if (historyStartDate && shiftDate < historyStartDate) return false;
        if (historyEndDate && shiftDate > historyEndDate) return false;
        return true;
      });
    }

    // Text search (by branch name, notes, approver name)
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter(s =>
        (s.branch?.name || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q) ||
        (s.pharmacist?.name || '').toLowerCase().includes(q) ||
        (s.approvedBy?.name || '').toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
      );
    }

    return result;
  }, [pastShifts, historyStatusFilter, historyStaffFilter, historyStartDate, historyEndDate, historySearch, isManager]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredShifts.length / historyLimit));
  const paginatedShifts = filteredShifts.slice((historyPage - 1) * historyLimit, historyPage * historyLimit);
  const hasHistoryFilters = Boolean(historySearch || historyStaffFilter !== 'ALL' || historyStartDate || historyEndDate || historyStatusFilter !== 'ALL');
  const clearHistoryFilters = () => {
    setHistorySearch('');
    setHistoryStaffFilter('ALL');
    setHistoryStartDate('');
    setHistoryEndDate('');
    setHistoryStatusFilter('ALL');
  };

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyStatusFilter, historyStaffFilter, historyStartDate, historyEndDate, historySearch, historyLimit]);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.82)' : '#FFFFFF',
    subtleBg: isDark ? 'rgba(30,41,59,0.72)' : '#F8FAFC',
    border: isDark ? 'rgba(148,163,184,0.16)' : '#E2E8F0',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#22D3EE' : '#0284C7',
    input: isDark ? 'rgba(2,6,23,0.45)' : '#FFFFFF',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
  };

  const inputStyle = {
    background: c.input,
    border: `1px solid ${c.border}`,
    color: c.text,
  };

  const statusClass = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-500/10 text-emerald-500';
    if (status === 'REJECTED') return 'bg-red-500/10 text-red-500';
    return 'bg-amber-500/10 text-amber-500';
  };

  if (!mounted) return null;

  // ── Display values ────────────────────────────────────────────────────────
  const scopeSales = isManager ? branchTodaySales : mySales;
  const scopeRevenue = report?.totalSales ?? (isManager ? todayRevenue : myRevenue);
  const scopeTransactions = report?.transactionCount ?? (isManager ? todayTransactions : myTransactions);
  const expectedCash = isManager
    ? scopeSales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + Number(s.totalAmount), 0)
    : myCashSales;
  const expectedDigital = isManager
    ? scopeSales.filter(s => s.paymentMethod === 'MOMO' || s.paymentMethod === 'CARD').reduce((sum, s) => sum + Number(s.totalAmount), 0)
    : myDigitalSales;
  const pendingShiftCount = pastShifts.filter(s => s.status === 'PENDING').length;

  const sumMethod = (method: string) =>
    scopeSales.filter(s => s.paymentMethod === method).reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const countMethod = (method: string) =>
    scopeSales.filter(s => s.paymentMethod === method).length;

  const takings = [
    { label: 'Cash', icon: Banknote, color: c.success, value: report?.cashSales ?? sumMethod('CASH'), count: countMethod('CASH') },
    { label: 'MoMo', icon: Smartphone, color: '#8B5CF6', value: report?.momoSales ?? sumMethod('MOMO'), count: countMethod('MOMO') },
    { label: 'Card', icon: CreditCard, color: c.primary, value: report?.cardSales ?? sumMethod('CARD'), count: countMethod('CARD') },
    { label: 'NHIS', icon: ShieldCheck, color: c.warning, value: sumMethod('NHIS'), count: countMethod('NHIS') },
    { label: 'Credit', icon: Wallet, color: c.danger, value: sumMethod('CREDIT'), count: countMethod('CREDIT') },
  ];

  const declaredCashNum = parseFloat(declaredCash) || 0;
  const declaredDigitalNum = parseFloat(declaredDigital) || 0;
  const declaredTotal = declaredCashNum + declaredDigitalNum;
  const expectedDeclaredTotal = myCashSales + myDigitalSales;
  const declaredDiff = declaredTotal - expectedDeclaredTotal;
  const hasDeclaredTotals = declaredCash.trim() !== '' || declaredDigital.trim() !== '';
  const invalidDeclaredCash = declaredCash.trim() !== '' && (!Number.isFinite(Number(declaredCash)) || Number(declaredCash) < 0);
  const invalidDeclaredDigital = declaredDigital.trim() !== '' && (!Number.isFinite(Number(declaredDigital)) || Number(declaredDigital) < 0);

  const topStats = isManager ? [
    { label: 'Revenue today', value: formatCurrency(scopeRevenue), icon: TrendingUp, color: c.primary },
    { label: 'Transactions', value: String(scopeTransactions), icon: Receipt, color: '#8B5CF6' },
    { label: 'Staff sessions', value: String(activeStaffStats.length), icon: UserRound, color: c.success },
    { label: 'Awaiting approval', value: String(pendingShiftCount), icon: Clock, color: c.warning },
  ] : [
    { label: 'Your revenue', value: formatCurrency(scopeRevenue), icon: TrendingUp, color: c.primary },
    { label: 'Transactions', value: String(scopeTransactions), icon: Receipt, color: '#8B5CF6' },
    { label: 'Physical cash', value: formatCurrency(expectedCash), icon: Banknote, color: c.success },
    { label: 'Digital payments', value: formatCurrency(expectedDigital), icon: Smartphone, color: c.warning },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <BranchBanner />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: c.primary }}>
            <CalendarDays size={14} /> Daily close
          </div>
          <h1 className="font-display text-3xl font-bold" style={{ color: c.text }}>
            {isManager ? 'Shift Supervision' : 'End of Day'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: c.muted }}>
            {isManager ? 'Review staff sessions and track reconciliation approvals.' : 'Count your till, declare totals, and submit for manager approval.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: c.border, background: c.bg, color: c.muted }}>
          <ShieldCheck size={15} style={{ color: isManager ? c.primary : c.success }} />
          {isManager ? 'Manager view' : 'Approval required'}
        </div>
      </header>

      {actionError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {topStats.map(stat => (
          <div key={stat.label} className="rounded-2xl border p-4" style={{ background: c.bg, borderColor: c.border }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: c.muted }}>{stat.label}</span>
              <stat.icon size={17} style={{ color: stat.color }} />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums" style={{ color: c.text }}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className={`grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] ${isManager ? '' : ''}`}>
        <div className={`space-y-5 ${isManager ? 'order-1' : 'order-2'} xl:order-1`}>
          {/* Staff session overviews — managers only */}
          {isManager && (
            <div className="overflow-hidden rounded-2xl border" style={{ background: c.bg, borderColor: c.border }}>
              <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: c.border }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                    <UserRound size={19} />
                  </div>
                  <div>
                    <h2 className="font-semibold" style={{ color: c.text }}>Staff sessions today</h2>
                    <p className="mt-0.5 text-xs" style={{ color: c.muted }}>Live sales activity across the branch.</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: c.subtleBg, color: c.muted }}>
                  {activeStaffStats.length} {activeStaffStats.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: c.border }}>
                {activeStaffStats.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: c.subtleBg, color: c.muted }}>
                      <Clock size={20} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: c.text }}>No active sales sessions today</p>
                    <p className="mt-1 text-xs" style={{ color: c.muted }}>Staff sales will appear here as the day progresses.</p>
                  </div>
                ) : activeStaffStats.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-500/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.subtleBg }}>
                        <Clock size={18} className={item.status === 'ON DUTY' ? 'animate-pulse text-blue-500' : 'text-emerald-500'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: c.text }}>{item.cashier}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.status === 'ON DUTY' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: c.muted }}>
                          {item.branch} · {item.transactions} txns
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Today's sales</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: c.text }}>{formatCurrency(item.total)}</p>
                      </div>
                      {verifiedStaff.includes(item.id) ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          <UserCheck size={13} /> Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVerify(item.id)}
                          className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
                          aria-label={`Verify ${item.cashier}`}
                          title="Verify & accept"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Takings by payment method */}
          <div className="rounded-2xl border" style={{ background: c.bg, borderColor: c.border }}>
            <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <CreditCard size={19} />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: c.text }}>
                    {isManager ? 'Branch takings by method' : 'Your takings by method'}
                  </h2>
                  <p className="mt-0.5 text-xs" style={{ color: c.muted }}>Today · {scopeSales.length} recorded sales</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Total revenue</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: c.primary }}>{formatCurrency(scopeRevenue)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-5">
              {takings.map(item => (
                <div key={item.label} className="rounded-xl border p-3" style={{ background: c.subtleBg, borderColor: c.border }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>{item.label}</span>
                    <item.icon size={14} style={{ color: item.color }} />
                  </div>
                  <p className="mt-2 text-sm font-bold tabular-nums" style={{ color: c.text }}>{formatCurrency(item.value)}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: c.muted }}>{item.count} {item.count === 1 ? 'txn' : 'txns'}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: c.border }}>
              <p className="text-xs" style={{ color: c.muted }}>Total transactions</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: c.text }}>{scopeTransactions}</p>
            </div>
          </div>

          {/* Reconciliation history */}
          <section className="overflow-hidden rounded-2xl border" style={{ background: c.bg, borderColor: c.border }}>
            <div className="border-b p-5" style={{ borderColor: c.border }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                    <History size={19} />
                  </div>
                  <div>
                    <h2 className="font-semibold" style={{ color: c.text }}>Reconciliation history</h2>
                    <p className="mt-0.5 text-xs" style={{ color: c.muted }}>
                      {isManager ? 'Submitted reports across the branch scope.' : 'Your submitted reports and their latest status.'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: c.subtleBg, color: c.muted }}>
                  {filteredShifts.length} {filteredShifts.length === 1 ? 'result' : 'results'}
                </span>
              </div>

              <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${isManager ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
                <label className="relative sm:col-span-2 xl:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: c.muted }} />
                  <input
                    type="search"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search branch, notes, approver…"
                    aria-label="Search reconciliation history"
                    className="w-full rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none"
                    style={inputStyle}
                  />
                </label>
                <label className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                  <select value={historyStatusFilter} onChange={e => setHistoryStatusFilter(e.target.value)} aria-label="Filter by status" className="w-full appearance-none rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none" style={inputStyle}>
                    <option value="ALL">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
                {isManager && (
                  <label className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                    <select value={historyStaffFilter} onChange={e => setHistoryStaffFilter(e.target.value)} aria-label="Filter by staff" className="w-full appearance-none rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none" style={inputStyle}>
                      <option value="ALL">All staff</option>
                      {historyStaffOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </label>
                )}
                <label className="relative">
                  <CalendarSearch className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={e => setHistoryStartDate(e.target.value)}
                    max={historyEndDate || undefined}
                    aria-label="From date"
                    className="w-full rounded-lg py-2.5 pl-9 pr-2 text-xs outline-none"
                    style={inputStyle}
                  />
                </label>
                <label className="relative">
                  <CalendarSearch className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={e => setHistoryEndDate(e.target.value)}
                    min={historyStartDate || undefined}
                    aria-label="To date"
                    className="w-full rounded-lg py-2.5 pl-9 pr-2 text-xs outline-none"
                    style={inputStyle}
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                {historyStartDate && historyEndDate && historyStartDate > historyEndDate ? (
                  <p className="flex items-center gap-1.5 text-xs text-red-500" role="alert">
                    <AlertCircle size={13} /> The start date must be on or before the end date.
                  </p>
                ) : <span />}
                {hasHistoryFilters && (
                  <button
                    type="button"
                    onClick={clearHistoryFilters}
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
                  >
                    <X size={13} /> Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr style={{ background: c.subtleBg }}>
                    {['Submitted', ...(isManager ? ['Staff'] : []), 'Expected / declared', 'Discrepancy', 'Status', 'Approver', ''].map(heading => (
                      <th key={heading} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingPastShifts ? (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} className="px-5 py-16 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: c.subtleBg, color: c.muted }}>
                          <Clock size={20} className="animate-pulse" />
                        </div>
                        <p className="text-sm font-medium" style={{ color: c.text }}>Loading reconciliation history…</p>
                      </td>
                    </tr>
                  ) : paginatedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} className="px-5 py-16 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: c.subtleBg, color: c.muted }}>
                          <FileText size={20} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: c.text }}>
                          {pastShifts.length === 0 ? 'No shift reconciliations yet' : 'No reports match the current filters'}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: c.muted }}>
                          {pastShifts.length === 0 ? 'Submitted end-of-day reports will appear here.' : 'Try adjusting the filters or date range.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedShifts.map((shift) => {
                      const shiftDate = new Date(shift.createdAt);
                      const dateText = shiftDate.toLocaleDateString();
                      const timeText = shiftDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const totalDeclared = Number(shift.physicalCash) + Number(shift.digitalPayments);
                      const diff = Number(shift.discrepancy);
                      const diffColor = diff === 0 ? c.success : diff < 0 ? c.danger : c.warning;

                      return (
                        <tr
                          key={shift.id}
                          className="cursor-pointer border-t transition hover:bg-slate-500/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                          style={{ borderColor: c.border }}
                          onClick={() => router.push(`/dashboard/end-of-day/detail?id=${shift.id}`)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              router.push(`/dashboard/end-of-day/detail?id=${shift.id}`);
                            }
                          }}
                          tabIndex={0}
                          role="link"
                          aria-label={`View reconciliation for ${shift.pharmacist?.name || 'staff member'} submitted ${dateText}`}
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold" style={{ color: c.text }}>{dateText}</p>
                            <p className="mt-0.5 text-[10px]" style={{ color: c.muted }}>{timeText} · {branchLabel(shift.branch?.name)}</p>
                          </td>
                          {isManager && (
                            <td className="px-5 py-4 text-xs font-medium" style={{ color: c.text }}>
                              {shift.pharmacist?.name || 'Staff member'}
                            </td>
                          )}
                          <td className="px-5 py-4">
                            <p className="text-xs" style={{ color: c.text }}>
                              Exp: <span className="font-mono font-medium">{formatCurrency(shift.totalRevenue)}</span>
                            </p>
                            <p className="mt-0.5 text-xs" style={{ color: c.muted }}>
                              Dec: <span className="font-mono font-medium">{formatCurrency(totalDeclared)}</span>
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-bold tabular-nums" style={{ color: diffColor }}>
                              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </span>
                            {shift.notes && (
                              <p className="mt-0.5 max-w-[160px] truncate text-[10px] italic" style={{ color: c.muted }} title={shift.notes}>
                                &quot;{shift.notes}&quot;
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(shift.status)}`}>
                              {shift.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs" style={{ color: shift.approvedBy?.name ? c.text : c.muted }}>
                            {shift.approvedBy?.name || 'Pending review'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <ChevronRight size={16} style={{ color: c.muted }} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <p className="text-xs" style={{ color: c.muted }}>
                  Page {historyPage} of {historyTotalPages} · {filteredShifts.length} records
                </p>
                <select
                  value={historyLimit}
                  onChange={e => setHistoryLimit(Number(e.target.value))}
                  aria-label="Rows per page"
                  className="rounded-lg border px-2 py-1 text-[10px] font-bold outline-none"
                  style={inputStyle}
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
              {historyTotalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: c.border, color: c.text }}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === historyTotalPages || Math.abs(p - historyPage) <= 1)
                    .reduce<(number | '…')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => p === '…' ? (
                      <span key={`gap-${i}`} className="px-1 text-xs" style={{ color: c.muted }}>…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHistoryPage(p)}
                        className="h-7 min-w-[28px] rounded-lg border px-1.5 text-xs font-bold transition"
                        style={{
                          borderColor: p === historyPage ? c.primary : c.border,
                          background: p === historyPage ? (isDark ? 'rgba(34,211,238,0.15)' : 'rgba(2,132,199,0.1)') : 'transparent',
                          color: p === historyPage ? c.primary : c.text,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: c.border, color: c.text }}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </footer>
          </section>
        </div>

        <aside className={`space-y-4 ${isManager ? 'order-2' : 'order-1'} xl:order-2`}>
          {/* Finalize shift form — staff only */}
          {!isManager && (
            <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ background: c.bg, borderColor: c.border }}>
              <div className="border-b p-5 sm:p-6" style={{ background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', borderColor: c.border }}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ClipboardCheck size={19} />
                </div>
                <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Daily close</p>
                      <h2 className="mt-0.5 font-display text-lg font-bold" style={{ color: c.text }}>Close your shift</h2>
                    </div>
                  </div>
                  {!submitted && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                      Manager approval
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: c.muted }}>
                  Count your drawer and confirm your digital takings before submitting the reconciliation.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                {!submitted ? (
                  <>

                  {mySales.length === 0 && (
                    <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs font-medium text-amber-600">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      No sales recorded for your session today — declared totals will still be reviewed.
                    </p>
                  )}

                  <div className="space-y-3">
                    {[
                      { id: 'declared-cash', label: 'Physical cash', value: declaredCash, onChange: setDeclaredCash, expected: myCashSales, invalid: invalidDeclaredCash },
                      { id: 'declared-digital', label: 'Digital payments', value: declaredDigital, onChange: setDeclaredDigital, expected: myDigitalSales, invalid: invalidDeclaredDigital },
                    ].map(field => (
                      <div key={field.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <label className="text-xs font-semibold" style={{ color: c.text }} htmlFor={field.id}>{field.label}</label>
                          <span className="text-[10px] tabular-nums" style={{ color: c.muted }}>Expected {formatCurrency(field.expected)}</span>
                        </div>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold" style={{ color: c.muted }}>GH₵</span>
                          <input
                            id={field.id}
                            type="number"
                            min="0"
                            step="0.01"
                            value={field.value}
                            onChange={e => field.onChange(e.target.value)}
                            placeholder={field.expected.toFixed(2)}
                            aria-invalid={field.invalid}
                            className="w-full rounded-xl py-3 pl-12 pr-4 text-sm tabular-nums outline-none focus:ring-2 focus:ring-emerald-500/30"
                            style={{ ...inputStyle, borderColor: field.invalid ? c.danger : c.border }}
                          />
                        </div>
                        {field.invalid && <p className="mt-1 text-[10px] text-red-500" role="alert">Enter a valid amount of zero or more.</p>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border p-4" style={{ background: c.subtleBg, borderColor: c.border }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Declared total</p>
                        <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: c.text }}>{formatCurrency(declaredTotal)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Expected cash + digital</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums" style={{ color: c.text }}>{formatCurrency(expectedDeclaredTotal)}</p>
                      </div>
                    </div>
                    {hasDeclaredTotals && (
                      <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs" style={{ borderColor: c.border }}>
                        {declaredDiff === 0 ? <CheckCircle size={15} style={{ color: c.success }} /> : <AlertCircle size={15} style={{ color: declaredDiff < 0 ? c.danger : c.warning }} />}
                        <span style={{ color: c.muted }}>Difference</span>
                        <span className="ml-auto font-bold tabular-nums" style={{ color: declaredDiff === 0 ? c.success : declaredDiff < 0 ? c.danger : c.warning }}>
                          {declaredDiff > 0 ? '+' : ''}{formatCurrency(declaredDiff)}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasDeclaredTotals && expectedDeclaredTotal > 0 && declaredDiff !== 0 && !notes.trim() && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs font-medium text-amber-600">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      Add a note explaining the difference so your manager can review it.
                    </p>
                  )}

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: c.text }} htmlFor="shift-notes">
                      Notes <span className="font-normal" style={{ color: c.muted }}>· recommended for differences</span>
                    </label>
                    <textarea
                      id="shift-notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Explain any cash or digital payment differences"
                      rows={3}
                      className="w-full resize-y rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                      style={inputStyle}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {suggestedNotes.map(note => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setNotes(note)}
                          className="rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition"
                          style={{
                            background: notes === note ? c.primary : c.subtleBg,
                            color: notes === note ? '#fff' : c.muted,
                            borderColor: notes === note ? c.primary : c.border,
                          }}
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseTerminal}
                    disabled={loading || invalidDeclaredCash || invalidDeclaredDigital}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: c.success }}
                  >
                    {loading ? <><Clock size={16} className="animate-pulse" /> Submitting…</> : <><ClipboardCheck size={16} /> Submit reconciliation</>}
                  </button>
                  <p className="mt-2 text-center text-[10px]" style={{ color: c.muted }}>
                    Your report will be sent to a manager for approval.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-600">
                  <p className="flex items-center gap-2 font-bold">
                    <CheckCircle size={15} />
                    {report?._isSynced === false ? 'Reconciliation saved for sync' : 'Reconciliation submitted'}
                  </p>
                  <p className="mt-1 opacity-80">
                    {report?._isSynced === false
                      ? 'Your report is queued on this device and will sync when your connection is restored.'
                      : 'Your manager will review your declared totals. Track the approval status in the history below.'}
                  </p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Reconciliation checklist */}
          {!isManager && (
          <div className="rounded-2xl border p-5" style={{ background: c.bg, borderColor: c.border }}>
            <div className="mb-4 flex items-center gap-2">
              <ListTodo size={16} style={{ color: c.primary }} />
              <h2 className="text-sm font-semibold" style={{ color: c.text }}>Closing checklist</h2>
            </div>
            <div className="space-y-3">
              {[
                { task: 'Enter the physical cash count', done: declaredCash.trim() !== '' && !invalidDeclaredCash },
                { task: 'Confirm MoMo and card takings', done: declaredDigital.trim() !== '' && !invalidDeclaredDigital },
                { task: 'Explain any difference', done: declaredDiff === 0 || Boolean(notes.trim()) },
                { task: 'Submit for manager approval', done: submitted },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${t.done ? 'border-transparent bg-sky-500 text-white' : 'border-slate-400/40'}`}>
                    {t.done && <CheckSquare size={11} />}
                  </div>
                  <span className="text-xs font-medium" style={{ color: t.done ? c.text : c.muted }}>{t.task}</span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Approvals pointer — managers only */}
          {isManager && (
            <div className="rounded-2xl border p-5" style={{ background: c.bg, borderColor: c.border }}>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: c.primary }} />
                <h2 className="text-sm font-semibold" style={{ color: c.text }}>Approvals</h2>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: c.muted }}>
                Submitted reconciliations are reviewed under Admin → Authorizations, where declared totals can be adjusted before sign-off.
              </p>
              <Link
                href="/admin/authorizations"
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
                style={{ background: c.primary }}
              >
                Open authorizations <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
