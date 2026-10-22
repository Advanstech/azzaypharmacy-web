'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, ClipboardCheck, Download, RefreshCw, Search, UserRound } from 'lucide-react';
import { useBranch } from '@/lib/branch-context';
import { exportToExcel } from '@/lib/export-excel';
import { gql, Q_ALL_SHIFT_RECONCILIATIONS } from '@/lib/gql';
import type { ShiftReconciliation } from '@/lib/store';

type EndOfDayRecord = ShiftReconciliation & {
  branch: { id: string; name: string };
  pharmacist: { id: string; name: string };
  approvedBy?: { id: string; name: string };
};

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load end-of-day reports.';
}

export default function AdminEndOfDayReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const { activeBranchId, activeBranchName } = useBranch();
  const [result, setResult] = useState<{
    branchId: string | null;
    records: EndOfDayRecord[];
    error?: string;
  } | null>(null);
  const today = localDateString(new Date());
  const [dateFrom, setDateFrom] = useState(() => {
    const start = new Date();
    start.setDate(1);
    return localDateString(start);
  });
  const [dateTo, setDateTo] = useState(today);
  const [staffId, setStaffId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const isDark = (resolvedTheme ?? theme) === 'dark';

  useEffect(() => {
    let cancelled = false;

    gql<{ allShiftReconciliations: EndOfDayRecord[] }>(
      Q_ALL_SHIFT_RECONCILIATIONS,
      { branchId: activeBranchId ?? undefined },
    ).then(data => {
      if (!cancelled) setResult({ branchId: activeBranchId, records: data.allShiftReconciliations ?? [] });
    }).catch(err => {
      if (!cancelled) setResult({ branchId: activeBranchId, records: [], error: errorMessage(err) });
    });

    return () => { cancelled = true; };
  }, [activeBranchId]);

  const loading = result?.branchId !== activeBranchId;
  const records = useMemo(
    () => result?.branchId === activeBranchId ? result.records : [],
    [result, activeBranchId],
  );
  const error = result?.branchId === activeBranchId ? result.error : null;

  const staffOptions = useMemo(() => {
    const byId = new Map<string, string>();
    records.forEach(record => {
      if (record.pharmacist?.id) byId.set(record.pharmacist.id, record.pharmacist.name);
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter(record => {
        const day = localDateString(new Date(record.createdAt));
        const inRange = (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
        const staffMatch = staffId === 'ALL' || record.pharmacist?.id === staffId;
        const statusMatch = statusFilter === 'ALL' || record.status === statusFilter;
        const searchMatch = !q
          || (record.pharmacist?.name || '').toLowerCase().includes(q)
          || (record.branch?.name || '').toLowerCase().includes(q)
          || (record.notes || '').toLowerCase().includes(q)
          || (record.approvedBy?.name || '').toLowerCase().includes(q);
        return inRange && staffMatch && statusMatch && searchMatch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, dateFrom, dateTo, staffId, statusFilter, search]);

  const resetPage = () => setPage(1);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRecords = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totals = useMemo(() => filteredRecords.reduce((result, record) => {
    const discrepancy = Number(record.discrepancy || 0);
    return {
      revenue: result.revenue + Number(record.totalRevenue || 0),
      cash: result.cash + Number(record.physicalCash || 0),
      digital: result.digital + Number(record.digitalPayments || 0),
      discrepancy: result.discrepancy + discrepancy,
      shortages: result.shortages + (discrepancy < 0 ? Math.abs(discrepancy) : 0),
      overages: result.overages + (discrepancy > 0 ? discrepancy : 0),
      pending: result.pending + (record.status === 'PENDING' ? 1 : 0),
      approved: result.approved + (record.status === 'APPROVED' ? 1 : 0),
      rejected: result.rejected + (record.status === 'REJECTED' ? 1 : 0),
      balanced: result.balanced + (discrepancy === 0 ? 1 : 0),
    };
  }, { revenue: 0, cash: 0, digital: 0, discrepancy: 0, shortages: 0, overages: 0, pending: 0, approved: 0, rejected: 0, balanced: 0 }), [filteredRecords]);

  const balancedPct = filteredRecords.length ? (totals.balanced / filteredRecords.length) * 100 : 0;

  const discrepancyColor = (value: number) =>
    value === 0 ? '#10B981' : value < 0 ? '#EF4444' : '#F59E0B';
  const statusStyle = (status: string) =>
    status === 'APPROVED'
      ? 'bg-emerald-500/10 text-emerald-500'
      : status === 'REJECTED'
        ? 'bg-red-500/10 text-red-500'
        : 'bg-amber-500/10 text-amber-500';

  const handleExport = () => {
    const selectedStaffName = staffId === 'ALL'
      ? 'All staff'
      : staffOptions.find(staff => staff.id === staffId)?.name ?? 'Selected staff';
    exportToExcel({
      filename: `end-of-day-report-${activeBranchName.replace(/\s+/g, '-').toLowerCase()}-${dateFrom || 'all'}-to-${dateTo || 'all'}`,
      title: 'End of Day Reconciliation Report',
      subtitle: 'Azzay Pharmacy — Staff Shift Closures',
      meta: [
        { label: 'Branch', value: activeBranchName },
        { label: 'Period', value: `${dateFrom || 'All dates'} to ${dateTo || 'All dates'}` },
        { label: 'Staff', value: selectedStaffName },
        { label: 'Status Filter', value: statusFilter === 'ALL' ? 'All statuses' : statusFilter },
        { label: 'Generated', value: new Date().toLocaleString('en-GB') },
      ],
      summary: [
        { label: 'Shift Reports', value: filteredRecords.length },
        { label: 'Approved / Pending / Rejected', value: `${totals.approved} / ${totals.pending} / ${totals.rejected}` },
        { label: 'Total Sales (Expected)', value: totals.revenue },
        { label: 'Declared Cash', value: totals.cash },
        { label: 'Declared Digital', value: totals.digital },
        { label: 'Declared Total', value: totals.cash + totals.digital },
        { label: 'Net Discrepancy', value: totals.discrepancy },
        { label: 'Total Shortages', value: totals.shortages },
        { label: 'Total Overages', value: totals.overages },
        { label: 'Balanced Shifts', value: `${totals.balanced} (${balancedPct.toFixed(1)}%)` },
      ],
      headers: ['Date & Time', 'Staff', 'Branch', 'Status', 'Sales Total', 'Declared Cash', 'Declared Digital', 'Declared Total', 'Discrepancy', 'Approved By', 'Notes'],
      rows: [
        ...filteredRecords.map(record => [
          new Date(record.createdAt).toLocaleString('en-GB'),
          record.pharmacist?.name || 'Unknown',
          record.branch?.name || 'Unknown',
          record.status,
          Number(record.totalRevenue),
          Number(record.physicalCash),
          Number(record.digitalPayments),
          Number(record.physicalCash) + Number(record.digitalPayments),
          Number(record.discrepancy),
          record.approvedBy?.name || '—',
          record.notes || '',
        ]),
        [
          'TOTAL', '', '', `${filteredRecords.length} reports`,
          totals.revenue, totals.cash, totals.digital,
          totals.cash + totals.digital, totals.discrepancy,
          '', '',
        ],
      ],
      currencyColumns: [4, 5, 6, 7, 8],
      totalRowIndices: [filteredRecords.length],
      statusColumn: 3,
      sheetName: 'End of Day',
    });
  };

  const colors = {
    panel: isDark ? 'rgba(15,23,42,0.72)' : '#FFFFFF',
    border: isDark ? 'rgba(148,163,184,0.18)' : '#E2E8F0',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#38BDF8' : '#0284C7',
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/reports')}
            className="rounded-xl border p-2 transition-opacity hover:opacity-75"
            style={{ borderColor: colors.border, color: colors.text }}
            aria-label="Back to reports"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: colors.text }}>
              <ClipboardCheck size={24} style={{ color: colors.primary }} />
              End of Day Report
            </h1>
            <p className="text-sm" style={{ color: colors.muted }}>
              Staff-submitted shift reconciliations · {activeBranchName}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredRecords.length === 0 || loading}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: colors.primary }}
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      <section
        className="flex flex-wrap items-end gap-4 rounded-2xl border p-4"
        style={{ background: colors.panel, borderColor: colors.border }}
      >
        <label className="space-y-1 text-xs font-semibold" style={{ color: colors.muted }}>
          <span className="flex items-center gap-1"><Calendar size={14} /> From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={event => { setDateFrom(event.target.value); resetPage(); }}
            className="block rounded-lg border px-3 py-2 text-sm"
            style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold" style={{ color: colors.muted }}>
          <span className="flex items-center gap-1"><Calendar size={14} /> To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={event => { setDateTo(event.target.value); resetPage(); }}
            className="block rounded-lg border px-3 py-2 text-sm"
            style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
          />
        </label>
        <label className="space-y-1 text-xs font-semibold" style={{ color: colors.muted }}>
          <span className="flex items-center gap-1"><UserRound size={14} /> Staff member</span>
          <select
            value={staffId}
            onChange={event => { setStaffId(event.target.value); resetPage(); }}
            className="block min-w-52 rounded-lg border px-3 py-2 text-sm"
            style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
          >
            <option value="ALL">All staff</option>
            {staffOptions.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold" style={{ color: colors.muted }}>
          <span className="flex items-center gap-1"><ClipboardCheck size={14} /> Status</span>
          <select
            value={statusFilter}
            onChange={event => { setStatusFilter(event.target.value); resetPage(); }}
            className="block rounded-lg border px-3 py-2 text-sm"
            style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold flex-1 min-w-48" style={{ color: colors.muted }}>
          <span className="flex items-center gap-1"><Search size={14} /> Search</span>
          <input
            type="text"
            value={search}
            onChange={event => { setSearch(event.target.value); resetPage(); }}
            placeholder="Staff, branch, notes, approver…"
            className="block w-full rounded-lg border px-3 py-2 text-sm"
            style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
          />
        </label>
        <button
          type="button"
          onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('ALL'); setStaffId('ALL'); setSearch(''); resetPage(); }}
          className="rounded-lg border px-3 py-2 text-xs font-bold"
          style={{ borderColor: colors.border, color: colors.muted }}
        >
          Clear filters
        </button>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Shift Reports', value: String(filteredRecords.length), sub: `${totals.approved} approved`, accent: colors.text },
          { label: 'Pending Approval', value: String(totals.pending), sub: `${totals.rejected} rejected`, accent: totals.pending > 0 ? '#F59E0B' : colors.text },
          { label: 'Expected Sales', value: `GH₵ ${totals.revenue.toFixed(2)}`, sub: `${totals.balanced} balanced (${balancedPct.toFixed(0)}%)`, accent: colors.text },
          { label: 'Declared Total', value: `GH₵ ${(totals.cash + totals.digital).toFixed(2)}`, sub: `cash ${totals.cash.toFixed(2)} · digital ${totals.digital.toFixed(2)}`, accent: colors.text },
          { label: 'Total Shortages', value: `GH₵ ${totals.shortages.toFixed(2)}`, sub: 'declared < expected', accent: totals.shortages > 0 ? '#EF4444' : '#10B981' },
          { label: 'Net Discrepancy', value: `GH₵ ${totals.discrepancy.toFixed(2)}`, sub: `overages ${totals.overages.toFixed(2)}`, accent: discrepancyColor(totals.discrepancy) },
        ].map(metric => (
          <div key={metric.label} className="rounded-xl border p-4" style={{ background: colors.panel, borderColor: colors.border }}>
            <p className="text-xs font-semibold" style={{ color: colors.muted }}>{metric.label}</p>
            <p className="mt-1 text-lg font-bold" style={{ color: metric.accent }}>{metric.value}</p>
            <p className="mt-0.5 text-[10px]" style={{ color: colors.muted }}>{metric.sub}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border" style={{ background: colors.panel, borderColor: colors.border }}>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide" style={{ borderColor: colors.border, color: colors.muted }}>
              {['Date / Time', 'Staff', 'Branch', 'Status', 'Expected', 'Cash', 'Digital', 'Declared', 'Discrepancy', 'Approved By'].map(header => (
                <th key={header} className="px-4 py-3 font-bold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center" style={{ color: colors.muted }}>
                <RefreshCw size={18} className="mx-auto mb-2 animate-spin" /> Loading end-of-day reports…
              </td></tr>
            ) : pageRecords.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center" style={{ color: colors.muted }}>
                No submitted end-of-day reports match the selected filters.
              </td></tr>
            ) : pageRecords.map(record => {
              const discrepancy = Number(record.discrepancy || 0);
              const declared = Number(record.physicalCash || 0) + Number(record.digitalPayments || 0);
              return (
                <tr
                  key={record.id}
                  onClick={() => router.push(`/dashboard/end-of-day/detail?id=${record.id}`)}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-slate-500/5"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(record.createdAt).toLocaleString('en-GB')}</td>
                  <td className="px-4 py-3 font-semibold">{record.pharmacist?.name || 'Unknown'}</td>
                  <td className="px-4 py-3">{record.branch?.name || 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusStyle(record.status)}`}>{record.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">GH₵ {Number(record.totalRevenue).toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">GH₵ {Number(record.physicalCash).toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">GH₵ {Number(record.digitalPayments).toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold">GH₵ {declared.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold" style={{ color: discrepancyColor(discrepancy) }}>
                    {discrepancy > 0 ? '+' : ''}GH₵ {discrepancy.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">{record.approvedBy?.name || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && filteredRecords.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border px-4 py-3 sm:flex-row" style={{ background: colors.panel, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: colors.muted }}>
              Page {safePage} of {totalPages} · {filteredRecords.length} report{filteredRecords.length === 1 ? '' : 's'}
              {staffId !== 'ALL' ? ` · ${staffOptions.find(staff => staff.id === staffId)?.name}` : ''}
            </p>
            <select
              value={pageSize}
              onChange={event => { setPageSize(Number(event.target.value)); resetPage(); }}
              className="rounded-lg border px-2 py-1 text-[10px] font-bold"
              style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
            >
              {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border p-1.5 transition-all hover:bg-slate-500/10 disabled:opacity-40"
                style={{ borderColor: colors.border, color: colors.text }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-xs" style={{ color: colors.muted }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="h-7 min-w-[28px] rounded-lg border px-1.5 text-xs font-bold transition-all"
                    style={{
                      borderColor: p === safePage ? colors.primary : colors.border,
                      background: p === safePage ? 'rgba(14,165,233,0.12)' : 'transparent',
                      color: p === safePage ? colors.primary : colors.text,
                    }}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border p-1.5 transition-all hover:bg-slate-500/10 disabled:opacity-40"
                style={{ borderColor: colors.border, color: colors.text }}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
