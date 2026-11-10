'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Package,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useCustomAuth } from '@/lib/custom-auth';
import { useStore } from '@/lib/store';
import type { RefundRequest, Sale } from '@/lib/store';
import { useBranch, useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';
import { usePagination } from '@/hooks/use-pagination';

const MANAGER_ROLES = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'];
const PAGE_SIZE = 10;

function formatCurrency(value: unknown) {
  return `GH₵ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function RefundPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user } = useCustomAuth();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  const {
    sales,
    me,
    requestRefund,
    approveRefund,
    rejectRefund,
    refundRequests,
    refetchRefundRequests,
    refetchSales,
  } = useStore();
  const role = me?.role || user?.role || user?.user_metadata?.role;
  const isManager = MANAGER_ROLES.includes(role || '');
  const branchFilter = useBranchFilter();
  const { activeBranchId } = useBranch();

  useEffect(() => {
    refetchRefundRequests(activeBranchId ?? null);
    // Refund candidates can be older than the shared store's 30-day sync window.
    refetchSales(activeBranchId ?? undefined);
  }, [activeBranchId, refetchRefundRequests, refetchSales]);

  const branchSales = branchFilter(sales);
  const branchRefundRequests = activeBranchId
    ? refundRequests.filter(request => request.sale?.branchId === activeBranchId)
    : refundRequests;

  const [receiptSearch, setReceiptSearch] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [saleLookupComplete, setSaleLookupComplete] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [requesterFilter, setRequesterFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [actionError, setActionError] = useState('');

  const lookupReceipt = () => {
    const q = receiptSearch.trim().toLowerCase();
    setSaleLookupComplete(Boolean(q));
    if (!q) {
      setFoundSale(null);
      return;
    }
    const match = branchSales.find(s =>
      s.id.toLowerCase().includes(q) ||
      (s.receiptNo || '').toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q)
    );
    setFoundSale(match || null);
  };

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

  const submitRequest = async () => {
    if (!foundSale || !refundReason.trim()) return;
    setProcessing(true);
    setActionError('');
    try {
      await requestRefund(foundSale.id, refundReason);
      setFoundSale(null);
      setReceiptSearch('');
      setRefundReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit refund request.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(true);
    setActionError('');
    try {
      await approveRefund(requestId);
      setSelectedRefund(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve refund.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(true);
    setActionError('');
    try {
      await rejectRefund(requestId);
      setSelectedRefund(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject refund.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const existingRefundRequest = foundSale
    ? branchRefundRequests.find(request =>
      request.saleId === foundSale.id &&
      (request.status === 'PENDING' || request.status === 'APPROVED')
    )
    : null;

  const requesters = useMemo(() => {
    const uniqueRequesters = new Map<string, string>();
    branchRefundRequests.forEach(request => {
      if (request.requestedBy?.id) {
        uniqueRequesters.set(request.requestedBy.id, request.requestedBy.name || 'Staff member');
      }
    });
    return Array.from(uniqueRequesters.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [branchRefundRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return branchRefundRequests
      .filter(request => {
        const requestDate = new Date(request.createdAt);
        const requestDay = Number.isNaN(requestDate.getTime())
          ? ''
          : `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}-${String(requestDate.getDate()).padStart(2, '0')}`;
        const matchesSearch = !query || [
          request.saleId,
          request.sale?.receiptNo,
          request.sale?.customerName,
          request.reason,
          request.requestedBy?.name,
          request.approvedBy?.name,
        ].some(value => value?.toLowerCase().includes(query));
        const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
        const matchesRequester = !isManager || requesterFilter === 'ALL' || request.requestedBy?.id === requesterFilter;
        const matchesFrom = !dateFrom || requestDay >= dateFrom;
        const matchesTo = !dateTo || requestDay <= dateTo;
        return matchesSearch && matchesStatus && matchesRequester && matchesFrom && matchesTo;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [branchRefundRequests, search, statusFilter, requesterFilter, dateFrom, dateTo, isManager]);

  const pagination = usePagination({ data: filteredRequests, itemsPerPage: PAGE_SIZE });
  const pendingCount = branchRefundRequests.filter(request => request.status === 'PENDING').length;
  const approvedCount = branchRefundRequests.filter(request => request.status === 'APPROVED').length;
  const rejectedCount = branchRefundRequests.filter(request => request.status === 'REJECTED').length;

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BranchBanner />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: c.primary }}>
            <RotateCcw size={14} /> Returns & adjustments
          </div>
          <h1 className="font-display text-3xl font-bold" style={{ color: c.text }}>Refunds</h1>
          <p className="mt-1 text-sm" style={{ color: c.muted }}>
            {isManager ? 'Review requests, authorize returns, and track refund history.' : 'Submit return requests and follow their approval status.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: c.border, background: c.bg, color: c.muted }}>
          <ShieldCheck size={15} style={{ color: c.success }} />
          {isManager ? 'Approvals enabled' : 'Approval required'}
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
        {[
          { label: 'All requests', value: branchRefundRequests.length, icon: Receipt, color: c.primary },
          { label: 'Awaiting review', value: pendingCount, icon: Clock3, color: c.warning },
          { label: 'Approved', value: approvedCount, icon: CheckCircle, color: c.success },
          { label: 'Declined', value: rejectedCount, icon: XCircle, color: c.danger },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border p-4" style={{ background: c.bg, borderColor: c.border }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: c.muted }}>{stat.label}</span>
              <stat.icon size={17} style={{ color: stat.color }} />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums" style={{ color: c.text }}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="rounded-2xl border p-5 sm:p-6" style={{ background: c.bg, borderColor: c.border }}>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <Search size={19} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: c.text }}>Start a refund request</h2>
                <p className="mt-0.5 text-xs" style={{ color: c.muted }}>Find a sale using its receipt number, sale ID, or customer name.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: c.muted }} />
                <input
                  type="search"
                  value={receiptSearch}
                  onChange={event => {
                    setReceiptSearch(event.target.value);
                    setFoundSale(null);
                    setSaleLookupComplete(false);
                  }}
                  onKeyDown={event => event.key === 'Enter' && lookupReceipt()}
                  placeholder="Receipt ID or customer name"
                  className="w-full rounded-xl py-3 pl-10 pr-3 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <button onClick={lookupReceipt} className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110" style={{ background: c.primary }}>
                Find sale
              </button>
            </div>

            {receiptSearch.trim() && !foundSale && (
              <p className="mt-3 text-xs" style={{ color: c.muted }}>
                {saleLookupComplete ? 'No matching sale found. Check the receipt ID or customer name and try again.' : 'Enter a full or partial receipt ID, sale ID, or customer name, then select Find sale.'}
              </p>
            )}

            {foundSale && (
              <div className="mt-4 rounded-xl border p-4" style={{ background: c.subtleBg, borderColor: c.border }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold" style={{ color: c.text }}>{foundSale.receiptNo || foundSale.id}</p>
                    <p className="mt-1 text-xs" style={{ color: c.muted }}>{foundSale.customerName || 'Walk-in customer'} · {formatDate(foundSale.createdAt)}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: c.text }}>{formatCurrency(foundSale.totalAmount)}</p>
                </div>
                {foundSale.status === 'REFUNDED' ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs font-medium text-amber-600">
                    <AlertCircle size={15} /> This sale has already been refunded.
                  </p>
                ) : existingRefundRequest ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs font-medium text-amber-600">
                    <AlertCircle size={15} />
                    {existingRefundRequest.status === 'APPROVED' ? 'A refund for this sale has already been approved.' : 'A refund request for this sale is already pending review.'}
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold" style={{ color: c.text }} htmlFor="refund-reason">Reason for return</label>
                    <textarea
                      id="refund-reason"
                      value={refundReason}
                      onChange={event => setRefundReason(event.target.value)}
                      placeholder="Describe the reason for this refund request"
                      rows={3}
                      className="w-full resize-y rounded-xl p-3 text-sm outline-none"
                      style={inputStyle}
                    />
                    <button
                      onClick={submitRequest}
                      disabled={!refundReason.trim() || processing}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: c.primary }}
                    >
                      {processing ? 'Submitting…' : 'Submit for approval'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="overflow-hidden rounded-2xl border" style={{ background: c.bg, borderColor: c.border }}>
            <div className="flex flex-col gap-4 border-b p-5" style={{ borderColor: c.border }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold" style={{ color: c.text }}>Refund history</h2>
                  <p className="mt-1 text-xs" style={{ color: c.muted }}>
                    {isManager ? 'Requests across staff in the selected branch scope.' : 'Your submitted requests and their latest status.'}
                  </p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: c.subtleBg, color: c.muted }}>
                  {filteredRequests.length} {filteredRequests.length === 1 ? 'result' : 'results'}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <label className="relative sm:col-span-2 xl:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: c.muted }} />
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search receipt, customer, staff, reason…"
                    aria-label="Search refund history"
                    className="w-full rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none"
                    style={inputStyle}
                  />
                </label>
                <label className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status" className="w-full appearance-none rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none" style={inputStyle}>
                    <option value="ALL">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
                {isManager && (
                  <label className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
                    <select value={requesterFilter} onChange={event => setRequesterFilter(event.target.value)} aria-label="Filter by requester" className="w-full appearance-none rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none" style={inputStyle}>
                      <option value="ALL">All staff</option>
                      {requesters.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </label>
                )}
                <div className={`grid grid-cols-2 gap-2 ${isManager ? '' : 'sm:col-span-2 xl:col-span-2'}`}>
                  <label className="relative">
                    <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: c.muted }} />
                    <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} aria-label="From date" className="w-full rounded-lg py-2.5 pl-8 pr-1 text-xs outline-none" style={inputStyle} />
                  </label>
                  <label className="relative">
                    <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: c.muted }} />
                    <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} aria-label="To date" className="w-full rounded-lg py-2.5 pl-8 pr-1 text-xs outline-none" style={inputStyle} />
                  </label>
                </div>
              </div>
              {dateFrom && dateTo && dateFrom > dateTo && (
                <p className="text-xs text-red-500" role="alert">The start date must be on or before the end date.</p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr style={{ background: c.subtleBg }}>
                    {['Request', 'Sale / customer', 'Requested by', 'Amount', 'Status', ''].map(heading => (
                      <th key={heading} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedData.map(request => (
                    <tr key={request.id} className="border-t transition hover:bg-slate-500/[0.04]" style={{ borderColor: c.border }}>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold" style={{ color: c.text }}>{formatDate(request.createdAt)}</p>
                        <p className="mt-1 max-w-[190px] truncate text-xs" style={{ color: c.muted }} title={request.reason}>{request.reason}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-semibold" style={{ color: c.text }}>{request.sale?.receiptNo || request.saleId}</p>
                        <p className="mt-1 text-xs" style={{ color: c.muted }}>{request.sale?.customerName || 'Walk-in customer'}</p>
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: c.muted }}>{isManager ? request.requestedBy?.name || 'Staff member' : 'You'}</td>
                      <td className="px-5 py-4 text-xs font-semibold tabular-nums" style={{ color: c.text }}>{formatCurrency(request.sale?.totalAmount)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(request.status)}`}>{request.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRefund(request)}
                            className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-slate-500/10"
                            style={{ borderColor: c.border, color: c.text }}
                          >
                            Details
                          </button>
                          {isManager && request.status === 'PENDING' && (
                            <>
                              <button type="button" onClick={() => handleApprove(request.id)} disabled={processing} aria-label={`Approve refund ${request.saleId}`} title="Approve refund" className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 transition hover:bg-emerald-500 hover:text-white disabled:opacity-50">
                                <CheckCircle size={16} />
                              </button>
                              <button type="button" onClick={() => handleReject(request.id)} disabled={processing} aria-label={`Reject refund ${request.saleId}`} title="Reject refund" className="rounded-lg bg-red-500/10 p-2 text-red-500 transition hover:bg-red-500 hover:text-white disabled:opacity-50">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagination.totalItems === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: c.subtleBg, color: c.muted }}>
                          <FileText size={20} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: c.text }}>No refund requests found</p>
                        <p className="mt-1 text-xs" style={{ color: c.muted }}>Try adjusting the filters or submit a new request.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: c.border }}>
              <p className="text-xs" style={{ color: c.muted }}>
                Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={pagination.prevPage} disabled={pagination.currentPage <= 1} className="rounded-lg border p-2 disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: c.border, color: c.text }} aria-label="Previous page">
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-[100px] text-center text-xs tabular-nums" style={{ color: c.muted }}>Page {pagination.currentPage} of {pagination.totalPages}</span>
                <button type="button" onClick={pagination.nextPage} disabled={pagination.currentPage >= pagination.totalPages} className="rounded-lg border p-2 disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: c.border, color: c.text }} aria-label="Next page">
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border p-5" style={{ background: c.bg, borderColor: c.border }}>
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle size={16} style={{ color: c.warning }} />
              <h2 className="text-sm font-semibold" style={{ color: c.text }}>Return policy</h2>
            </div>
            <ul className="space-y-3 text-xs leading-relaxed" style={{ color: c.muted }}>
              <li>Cold-chain medicines, including insulin and vaccines, are not returnable once they leave the pharmacy.</li>
              <li>Controlled substances require a manager’s signature and regulatory log entry.</li>
              <li>Full refunds are subject to the 48-hour return window and untampered packaging.</li>
            </ul>
          </div>
          <div className="rounded-2xl border p-5" style={{ background: c.bg, borderColor: c.border }}>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={16} style={{ color: c.primary }} />
              <h2 className="text-sm font-semibold" style={{ color: c.text }}>Approval & audit</h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: c.muted }}>
              Requests remain pending until an authorized manager reviews them. Approved refunds update sales, inventory, and the ledger.
            </p>
          </div>
        </aside>
      </section>

      {selectedRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && setSelectedRefund(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="refund-detail-title" className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl" style={{ background: c.bg, borderColor: c.border }}>
            <header className="flex items-start justify-between border-b p-5 sm:p-6" style={{ borderColor: c.border }}>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(selectedRefund.status)}`}>{selectedRefund.status}</span>
                  <span className="text-xs" style={{ color: c.muted }}>Refund request</span>
                </div>
                <h2 id="refund-detail-title" className="font-display text-xl font-bold" style={{ color: c.text }}>{selectedRefund.sale?.receiptNo || selectedRefund.saleId}</h2>
                <p className="mt-1 text-xs" style={{ color: c.muted }}>Submitted {formatDate(selectedRefund.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedRefund(null)} aria-label="Close refund details" className="rounded-lg p-2 hover:bg-slate-500/10" style={{ color: c.muted }}><X size={18} /></button>
            </header>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Customer', value: selectedRefund.sale?.customerName || 'Walk-in customer' },
                  { label: 'Refund amount', value: formatCurrency(selectedRefund.sale?.totalAmount) },
                  { label: 'Requested by', value: selectedRefund.requestedBy?.name || 'Staff member' },
                  { label: 'Reviewed by', value: selectedRefund.approvedBy?.name || (selectedRefund.status === 'PENDING' ? 'Awaiting review' : 'Not recorded') },
                  { label: 'Sale date', value: formatDate(selectedRefund.sale?.createdAt) },
                  { label: 'Payment method', value: selectedRefund.sale?.paymentMethod || '—' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border p-3" style={{ background: c.subtleBg, borderColor: c.border }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>{item.label}</p>
                    <p className="mt-1 text-sm font-medium" style={{ color: c.text }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Reason for refund</h3>
                <p className="rounded-xl border p-4 text-sm leading-relaxed" style={{ background: c.subtleBg, borderColor: c.border, color: c.text }}>{selectedRefund.reason}</p>
              </div>

              {selectedRefund.sale?.items?.length ? (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                    <Package size={14} /> Sale items
                  </h3>
                  <div className="overflow-hidden rounded-xl border" style={{ borderColor: c.border }}>
                    {selectedRefund.sale.items.map((item, index) => (
                      <div key={item.id || `${item.product?.name}-${index}`} className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0" style={{ borderColor: c.border }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: c.text }}>{item.product?.name || 'Product'}</p>
                          <p className="mt-0.5 text-xs" style={{ color: c.muted }}>{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: c.text }}>{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {isManager && selectedRefund.status === 'PENDING' && (
              <footer className="flex justify-end gap-2 border-t p-5" style={{ borderColor: c.border }}>
                <button type="button" onClick={() => handleReject(selectedRefund.id)} disabled={processing} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50" style={{ borderColor: c.border }}>
                  Decline request
                </button>
                <button type="button" onClick={() => handleApprove(selectedRefund.id)} disabled={processing} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: c.success }}>
                  {processing ? 'Processing…' : 'Approve refund'}
                </button>
              </footer>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
