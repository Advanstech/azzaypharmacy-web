'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useBranch } from '@/lib/branch-context';
import { exportToExcel } from '@/lib/export-excel';
import { usePagination } from '@/hooks/use-pagination';
import {
  ArrowLeft, Download, Search, CheckCircle, Clock, XCircle,
  Receipt, RotateCcw, Calendar, Shield, Filter, FileCheck,
} from 'lucide-react';

const STATUS_META: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  APPROVED: { color: '#10B981', icon: CheckCircle, label: 'Approved' },
  PENDING:  { color: '#F59E0B', icon: Clock, label: 'Pending' },
  REJECTED: { color: '#EF4444', icon: XCircle, label: 'Rejected' },
};

const TYPE_META: Record<string, { color: string; icon: typeof Receipt; label: string }> = {
  EXPENSE: { color: '#F97316', icon: Receipt, label: 'Expense' },
  REFUND: { color: '#EC4899', icon: RotateCcw, label: 'Refund' },
  EOD: { color: '#0EA5E9', icon: Calendar, label: 'End of Day' },
};

type AuthItem = {
  id: string;
  type: 'EXPENSE' | 'REFUND' | 'EOD';
  date: string;
  reference: string;
  requestedBy: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  branchName?: string;
  details: string;
  raw: any;
};

export default function AuthorizationsReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const {
    expenses: allExpenses, refundRequests: allRefunds, shiftReconciliations: allShifts,
    refetchExpenses, refetchRefundRequests, refetchShiftReconciliations,
    loadingExpenses, loadingShiftReconciliations,
  } = useStore();
  const { activeBranchId, activeBranchName } = useBranch();

  useEffect(() => {
    if (allExpenses.length === 0) refetchExpenses();
    if (allRefunds.length === 0) refetchRefundRequests(activeBranchId);
    if (allShifts.length === 0) refetchShiftReconciliations(activeBranchId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const items = useMemo(() => {
    const list: AuthItem[] = [];

    allExpenses.forEach(e => {
      list.push({
        id: e.id,
        type: 'EXPENSE',
        date: e.date || e.createdAt,
        reference: e.category?.name || 'Uncategorized',
        requestedBy: (e as any).requestedBy?.name || 'Unknown',
        amount: Number(e.amount),
        status: e.status as AuthItem['status'],
        approvedBy: (e as any).approvedBy?.name,
        branchName: (e as any).branch?.name,
        details: e.description || '',
        raw: e,
      });
    });

    allRefunds.forEach(r => {
      list.push({
        id: r.id,
        type: 'REFUND',
        date: r.createdAt,
        reference: `Sale #${r.sale?.receiptNo || r.saleId.slice(0, 8)}`,
        requestedBy: r.requestedBy?.name || 'Unknown',
        amount: Number(r.sale?.totalAmount || 0),
        status: r.status,
        approvedBy: r.approvedBy?.name,
        branchName: (r.sale as any)?.branch?.name,
        details: r.reason || '',
        raw: r,
      });
    });

    allShifts.forEach(s => {
      list.push({
        id: s.id,
        type: 'EOD',
        date: s.createdAt,
        reference: `EOD — ${s.pharmacist?.name || 'Unknown'}`,
        requestedBy: s.pharmacist?.name || 'Unknown',
        amount: Number(s.totalRevenue),
        status: s.status,
        approvedBy: s.approvedBy?.name,
        branchName: s.branch?.name,
        details: s.notes || `Cash: GH₵${s.physicalCash} · Digital: GH₵${s.digitalPayments} · Discrepancy: GH₵${s.discrepancy}`,
        raw: s,
      });
    });

    return list;
  }, [allExpenses, allRefunds, allShifts]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : 0;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;

    let list = items.filter(i => {
      const t = new Date(i.date).getTime();
      return t >= from && t <= to;
    });

    if (activeBranchId) list = list.filter(i => {
      if (i.type === 'EXPENSE') return i.raw.branchId === activeBranchId;
      if (i.type === 'REFUND') return i.raw.sale?.branchId === activeBranchId;
      return i.raw.branchId === activeBranchId;
    });

    if (statusFilter !== 'All') list = list.filter(i => i.status === statusFilter);
    if (typeFilter !== 'All') list = list.filter(i => i.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.reference.toLowerCase().includes(q) ||
        i.requestedBy.toLowerCase().includes(q) ||
        i.details.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [items, activeBranchId, statusFilter, typeFilter, search, dateFrom, dateTo, sortDir]);

  const kpis = useMemo(() => {
    const pending = filtered.filter(i => i.status === 'PENDING');
    const approved = filtered.filter(i => i.status === 'APPROVED');
    const totalApprovedValue = approved.reduce((s, i) => s + i.amount, 0);
    const byType: Record<string, number> = {};
    filtered.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
    return { total: filtered.length, pending: pending.length, approvedCount: approved.length, totalApprovedValue, byType };
  }, [filtered]);

  const { currentPage, totalPages, paginatedData: paginated, nextPage, prevPage, goToPage, startIndex, endIndex } = usePagination({ data: filtered });

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
  };

  const handleExport = () => {
    const rows = filtered.map(i => [
      new Date(i.date).toLocaleDateString('en-GB'),
      TYPE_META[i.type].label,
      i.reference,
      i.requestedBy,
      i.amount,
      i.status,
      i.approvedBy || '—',
      i.branchName || activeBranchName,
      i.details,
    ]);
    exportToExcel({
      filename: `authorizations-report-${activeBranchName.replace(/\s+/g, '-').toLowerCase()}-${dateFrom}-to-${dateTo}`,
      title: 'Authorizations Report',
      subtitle: 'Azzay Pharmacy — Expenses, Refunds & End-of-Day Approvals',
      meta: [
        { label: 'Branch', value: activeBranchName },
        { label: 'Period', value: `${dateFrom} to ${dateTo}` },
      ],
      summary: [
        { label: 'Total Items', value: filtered.length },
        { label: 'Pending', value: kpis.pending },
        { label: 'Approved Value', value: `GH₵ ${kpis.totalApprovedValue.toFixed(2)}` },
      ],
      headers: ['Date', 'Type', 'Reference', 'Requested By', 'Amount', 'Status', 'Approved By', 'Branch', 'Details'],
      rows,
      currencyColumns: [4],
      sheetName: 'Authorizations',
    });
  };

  const isLoading = loadingExpenses || loadingShiftReconciliations;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/reports')}
            className="flex items-center gap-2 text-xs font-bold mb-2 hover:opacity-70 transition-opacity"
            style={{ color: card.muted }}
          >
            <ArrowLeft size={14} /> Back to Reports
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight" style={{ color: card.text }}>
            Authorizations Report
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: card.muted }}>
            Expenses, refund requests & end-of-day reconciliations — <span style={{ color: card.primary }}>{activeBranchName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: card.primaryBg, color: card.primary, borderColor: card.primary + '40' }}
          >
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: kpis.total, color: card.primary },
          { label: 'Pending', value: kpis.pending, color: '#F59E0B' },
          { label: 'Approved', value: kpis.approvedCount, color: '#10B981' },
          { label: 'Approved Value', value: `GH₵ ${kpis.totalApprovedValue.toFixed(2)}`, color: '#8B5CF6' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border p-4" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>{k.label}</p>
            <p className="text-xl font-display font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border p-4 flex flex-wrap gap-4 items-end" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Search</p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: card.muted }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Reference, requester, details..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border outline-none focus:ring-2"
              style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: card.border, color: card.text }}
            />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Type</p>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none"
            style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: card.border, color: card.text }}
          >
            <option value="All">All Types</option>
            <option value="EXPENSE">Expense</option>
            <option value="REFUND">Refund</option>
            <option value="EOD">End of Day</option>
          </select>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: card.subtle }}>Status</p>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none"
            style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: card.border, color: card.text }}
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none"
            style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: card.border, color: card.text }}
          />
          <span style={{ color: card.muted }}>→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none"
            style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: card.border, color: card.text }}
          />
        </div>
        <button
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 rounded-xl text-xs font-bold border"
          style={{ borderColor: card.border, color: card.text }}
        >
          Date {sortDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Type</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Reference</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Requested By</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Approved By</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: card.subtle }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs font-medium" style={{ color: card.muted }}>
                    Loading authorizations...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs font-medium" style={{ color: card.muted }}>
                    No authorizations match the selected filters.
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => {
                  const TypeIcon = TYPE_META[item.type].icon;
                  const StatusIcon = STATUS_META[item.status].icon;
                  return (
                    <tr key={item.id} style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: card.text }}>
                        {new Date(item.date).toLocaleDateString('en-GB')}
                        <span className="text-[10px] block" style={{ color: card.muted }}>{new Date(item.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: TYPE_META[item.type].color + '15', color: TYPE_META[item.type].color }}>
                          <TypeIcon size={12} /> {TYPE_META[item.type].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: card.text }}>{item.reference}</td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: card.text }}>{item.requestedBy}</td>
                      <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: card.text }}>GH₵ {item.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: STATUS_META[item.status].color + '15', color: STATUS_META[item.status].color }}>
                          <StatusIcon size={12} /> {STATUS_META[item.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: item.approvedBy ? card.text : card.muted }}>{item.approvedBy || '—'}</td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: card.muted }} title={item.details}>{item.details}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: card.border }}>
            <span className="text-xs" style={{ color: card.muted }}>Showing {startIndex} - {endIndex} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button onClick={prevPage} disabled={currentPage === 1} className="px-3 py-1 rounded-lg text-xs font-bold border disabled:opacity-50" style={{ borderColor: card.border, color: card.text }}>Previous</button>
              <span className="text-xs font-bold" style={{ color: card.text }}>{currentPage} / {totalPages}</span>
              <button onClick={nextPage} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg text-xs font-bold border disabled:opacity-50" style={{ borderColor: card.border, color: card.text }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
