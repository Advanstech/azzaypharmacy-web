'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  ArrowRightLeft, Plus, Search, Calendar, X, CheckCircle, XCircle,
  Package, Building2, ChevronDown, ChevronUp, FileText, Truck,
  DollarSign, Hash, Clock, ShieldCheck, Eye, ChevronLeft, ChevronRight,
  AlertTriangle, Loader2, Receipt, BarChart2, RefreshCw, Minus, Trash2,
} from 'lucide-react';
import { useStore, type StockTransfer, type Product } from '@/lib/store';
import { gql } from '@/lib/gql';
import {
  M_INITIATE_TRANSFER, M_APPROVE_TRANSFER, M_REJECT_TRANSFER, M_DELETE_TRANSFER, Q_BRANCHES,
} from '@/lib/gql';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch { id: string; name: string; }

interface TransferLineItem {
  product: Product;
  quantity: number;
  transferPrice: number;
}

// ─── Theme helper ─────────────────────────────────────────────────────────────

function useColors(isDark: boolean) {
  return isDark ? {
    bg: '#0A0F1E', card: '#0F172A', border: '#1E293B', text: '#F1F5F9',
    muted: '#64748B', inputBg: '#1E293B', headerBg: '#0F172A',
    success: '#10B981', danger: '#EF4444', warning: '#F59E0B', primary: '#3B82F6',
    tag: '#1E293B',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A',
    muted: '#94A3B8', inputBg: '#F8FAFC', headerBg: '#F1F5F9',
    success: '#10B981', danger: '#EF4444', warning: '#F59E0B', primary: '#3B82F6',
    tag: '#F1F5F9',
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    PENDING:  { bg: '#F59E0B20', color: '#F59E0B' },
    APPROVED: { bg: '#10B98120', color: '#10B981' },
    REJECTED: { bg: '#EF444420', color: '#EF4444' },
    RECEIVED: { bg: '#3B82F620', color: '#3B82F6' },
  };
  const s = colors[status] || colors.PENDING;
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DR({ label, value, c, icon }: { label: string; value: string; c: any; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: c.border }}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: c.muted }}>
        {icon}{label}
      </div>
      <p className="text-sm font-bold text-right" style={{ color: c.text }}>{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 10;

export default function StockTransferPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const c = useColors(isDark);

  const {
    stockTransfers, loadingTransfers, refetchTransfers,
    products, me, refetchProducts, refetchLedger, refetchPurchases, refetchInvoices,
  } = useStore();

  // ── Branches ──────────────────────────────────────────────────────────────
  const [branches, setBranches] = useState<Branch[]>([]);
  useEffect(() => {
    gql<{ branches: Branch[] }>(Q_BRANCHES).then(d => {
      const list = d.branches ?? [];
      setBranches(list);
      // Default source to Main Branch
      const main = list.find(b => b.name.toLowerCase().includes('main'));
      if (main) setSourceBranchId(main.id);
    }).catch(() => {});
    refetchTransfers();
  }, []);

  const isAdmin = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(me?.role || '');
  const canApprove = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER'].includes(me?.role || '');

  // ── Filters + Pagination ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return stockTransfers.filter(t => {
      const d = new Date(t.transferDate || t.createdAt);
      if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (search) {
        const hay = `${t.transferNo} ${t.sourceBranch?.name} ${t.destBranch?.name} ${t.notes || ''} ${t.status}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [stockTransfers, search, dateFrom, dateTo, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, statusFilter]);

  // ── Detail Modal ──────────────────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState<StockTransfer | null>(null);

  // ── New Transfer Modal ────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<TransferLineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const productMatches = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter(p => p.stockQuantity > 0 && (p.name.toLowerCase().includes(q) || (p.genericName || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [products, productSearch]);

  const addProduct = (p: Product) => {
    setLineItems(prev => {
      const existing = prev.find(l => l.product.id === p.id);
      if (existing) return prev;
      return [...prev, { product: p, quantity: 1, transferPrice: p.sellingPrice }];
    });
    setProductSearch('');
  };

  const updateLine = (idx: number, field: 'quantity' | 'transferPrice', val: number) => {
    setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  const removeLine = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalTransferValue = lineItems.reduce((s, l) => s + l.quantity * l.transferPrice, 0);

  const handleCreateTransfer = async () => {
    setCreateError('');
    if (!sourceBranchId || !destBranchId) { setCreateError('Select both source and destination branches'); return; }
    if (sourceBranchId === destBranchId) { setCreateError('Source and destination must be different'); return; }
    if (lineItems.length === 0) { setCreateError('Add at least one product'); return; }
    for (const l of lineItems) {
      if (l.quantity <= 0) { setCreateError(`Quantity for "${l.product.name}" must be > 0`); return; }
      if (l.quantity > l.product.stockQuantity) {
        setCreateError(`"${l.product.name}" has only ${l.product.stockQuantity} in stock`);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      await gql(M_INITIATE_TRANSFER, {
        sourceBranchId,
        destBranchId,
        notes: notes || undefined,
        items: lineItems.map(l => ({
          productId: l.product.id,
          quantity: l.quantity,
          transferPrice: l.transferPrice,
        })),
      });
      await refetchTransfers();
      setTimeout(() => refetchProducts(), 400);
      setShowCreate(false);
      setLineItems([]);
      setNotes('');
      setSourceBranchId('');
      setDestBranchId('');
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to initiate transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await gql<any>(M_APPROVE_TRANSFER, { transferId: id });
      // Optimistic update
      const updated = res?.approveTransfer;
      if (detailItem?.id === id) setDetailItem(p => p ? { ...p, status: 'APPROVED', approvedBy: updated?.approvedBy } : p);
      await refetchTransfers();
      setTimeout(() => {
        refetchProducts();
        refetchLedger();
        refetchPurchases();
        refetchInvoices();
      }, 400);
    } catch (err: any) {
      console.error('Approve transfer failed:', err?.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      await gql<any>(M_DELETE_TRANSFER, { transferId: id });
      if (detailItem?.id === id) setDetailItem(null);
      await refetchTransfers();
      setTimeout(() => refetchProducts(), 400);
    } catch (err: any) {
      console.error('Delete transfer failed:', err?.message);
    } finally {
      setActionId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      const res = await gql<any>(M_REJECT_TRANSFER, { transferId: id, reason: rejectReason || undefined });
      const updated = res?.rejectTransfer;
      if (detailItem?.id === id) setDetailItem(p => p ? { ...p, status: 'REJECTED', approvedBy: updated?.approvedBy } : p);
      await refetchTransfers();
      setTimeout(() => refetchProducts(), 400);
    } catch (err: any) {
      console.error('Reject transfer failed:', err?.message);
    } finally {
      setActionId(null);
      setShowRejectInput(null);
      setRejectReason('');
    }
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const pending = stockTransfers.filter(t => t.status === 'PENDING').length;
    const approved = stockTransfers.filter(t => t.status === 'APPROVED').length;
    const totalValue = stockTransfers.filter(t => t.status === 'APPROVED').reduce((s, t) => s + t.transferPrice, 0);
    const totalItems = stockTransfers.reduce((s, t) => s + t.items.reduce((si, i) => si + i.quantity, 0), 0);
    return { pending, approved, totalValue, totalItems };
  }, [stockTransfers]);

  if (!mounted) return null;

  const hasFilters = search || dateFrom || dateTo || statusFilter !== 'ALL';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: c.bg }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-black flex items-center gap-2" style={{ color: c.text }}>
            <ArrowRightLeft size={22} style={{ color: c.primary }} /> Stock Transfers
          </h1>
          <p className="text-sm mt-0.5" style={{ color: c.muted }}>
            Supply stock from Pharmacy to Chemical Shop or other branches — generates invoice + ledger entries automatically
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetchTransfers()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{ borderColor: c.border, color: c.muted, background: c.card }}>
            <RefreshCw size={13} /> Refresh
          </button>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: c.primary }}>
              <Plus size={15} /> New Transfer
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: kpis.pending, icon: Clock, color: c.warning },
          { label: 'Approved', value: kpis.approved, icon: CheckCircle, color: c.success },
          { label: 'Total Value Transferred', value: `GH₵ ${kpis.totalValue.toFixed(2)}`, icon: DollarSign, color: c.primary },
          { label: 'Total Units Transferred', value: kpis.totalItems.toLocaleString(), icon: Package, color: '#8B5CF6' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border p-4" style={{ background: c.card, borderColor: c.border }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: `${k.color}18`, color: k.color }}>
                  <Icon size={15} />
                </div>
                <p className="text-xs" style={{ color: c.muted }}>{k.label}</p>
              </div>
              <p className="text-xl font-black font-display" style={{ color: c.text }}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border p-4" style={{ background: c.card, borderColor: c.border }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transfer no, branch, status..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} style={{ color: c.muted }} />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl text-xs px-2 py-2 focus:outline-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
            <span style={{ color: c.muted }}>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded-xl text-xs px-2 py-2 focus:outline-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: statusFilter === s ? c.primary : c.inputBg,
                  color: statusFilter === s ? '#fff' : c.muted,
                  border: `1px solid ${statusFilter === s ? c.primary : c.border}`,
                }}>
                {s}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('ALL'); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: `${c.danger}15`, color: c.danger }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: c.card, borderColor: c.border }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: c.border, background: c.headerBg }}>
          <p className="font-bold text-sm" style={{ color: c.text }}>
            Transfer History
            <span className="ml-2 text-xs font-normal" style={{ color: c.muted }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''}
            </span>
          </p>
          {loadingTransfers && <Loader2 size={15} className="animate-spin" style={{ color: c.muted }} />}
        </div>

        {loadingTransfers && stockTransfers.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: c.muted }} />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ArrowRightLeft size={36} style={{ color: c.muted, opacity: 0.4 }} />
            <p className="text-sm" style={{ color: c.muted }}>{hasFilters ? 'No transfers match filters' : 'No transfers yet'}</p>
            {isAdmin && !hasFilters && (
              <button onClick={() => setShowCreate(true)}
                className="mt-1 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: c.primary }}>
                Initiate First Transfer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: c.headerBg }}>
                  {['Transfer No', 'From', 'To', 'Items', 'Transfer Value', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: c.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => (
                  <tr key={t.id}
                    className="border-t cursor-pointer transition-colors hover:opacity-80"
                    style={{ borderColor: c.border, background: i % 2 === 0 ? 'transparent' : `${c.border}30` }}
                    onClick={() => setDetailItem(t)}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-xs" style={{ color: c.primary }}>{t.transferNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold" style={{ color: c.text }}>{t.sourceBranch?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold" style={{ color: c.text }}>{t.destBranch?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: c.muted }}>
                        {t.items.length} product{t.items.length !== 1 ? 's' : ''}
                        {' · '}{t.items.reduce((s, i) => s + i.quantity, 0)} units
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-xs" style={{ color: c.success }}>GH₵ {Number(t.transferPrice).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: c.muted }}>
                        {new Date(t.transferDate || t.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetailItem(t)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: `${c.primary}15`, color: c.primary }}
                          title="View details">
                          <Eye size={13} />
                        </button>
                        {canApprove && t.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleApprove(t.id)}
                              disabled={actionId === t.id}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: `${c.success}15`, color: c.success }}>
                              {actionId === t.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            </button>
                            <button onClick={() => setShowRejectInput(t.id)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: `${c.danger}15`, color: c.danger }}>
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {canApprove && (t.status === 'PENDING' || t.status === 'REJECTED') && (
                          <button onClick={() => setDeleteConfirmId(t.id)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: `${c.danger}15`, color: c.danger }}
                            title="Delete transfer">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
            <p className="text-xs" style={{ color: c.muted }}>
              Showing {(safePage - 1) * LIMIT + 1}–{Math.min(safePage * LIMIT, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={safePage === 1}
                className="px-2 py-1 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: c.inputBg, color: c.muted }}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="px-2 py-1 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: c.inputBg, color: c.muted }}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, safePage - 2);
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-bold"
                    style={{ background: p === safePage ? c.primary : c.inputBg, color: p === safePage ? '#fff' : c.muted }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="px-2 py-1 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: c.inputBg, color: c.muted }}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                className="px-2 py-1 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: c.inputBg, color: c.muted }}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Dialog ───────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
            style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ background: `${c.danger}15` }}>
                <Trash2 size={18} style={{ color: c.danger }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: c.text }}>Delete Transfer?</h3>
                <p className="text-xs" style={{ color: c.muted }}>This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: c.muted }}>
              If the transfer is <strong style={{ color: c.text }}>PENDING</strong>, stock will be restored to the source branch automatically.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border"
                style={{ borderColor: c.border, color: c.muted }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)}
                disabled={!!actionId}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: c.danger }}>
                {actionId ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Inline Prompt ─────────────────────────────────────── */}
      {showRejectInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
            style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <h3 className="font-bold text-base" style={{ color: c.text }}>Reject Transfer</h3>
            <p className="text-xs" style={{ color: c.muted }}>Provide a reason (optional). Stock will be restored to source.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
            <div className="flex gap-2">
              <button onClick={() => { setShowRejectInput(null); setRejectReason(''); }}
                className="flex-1 py-2 rounded-xl text-sm font-bold border"
                style={{ borderColor: c.border, color: c.muted }}>Cancel</button>
              <button onClick={() => handleReject(showRejectInput)}
                disabled={!!actionId}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: c.danger }}>
                {actionId ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setDetailItem(null)}>
          <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ background: c.card, border: `1px solid ${c.border}` }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: c.border, background: c.card }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${c.primary}18` }}>
                  <ArrowRightLeft size={18} style={{ color: c.primary }} />
                </div>
                <div>
                  <p className="font-mono font-black text-base" style={{ color: c.text }}>{detailItem.transferNo}</p>
                  <p className="text-[11px]" style={{ color: c.muted }}>
                    {new Date(detailItem.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
                <StatusBadge status={detailItem.status} />
              </div>
              <button onClick={() => setDetailItem(null)}
                className="p-2 rounded-xl" style={{ background: c.inputBg }}>
                <X size={16} style={{ color: c.muted }} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Route */}
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: c.inputBg }}>
                <div className="flex-1 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-1">
                    <Building2 size={13} style={{ color: c.primary }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.muted }}>Source</p>
                  </div>
                  <p className="font-black text-sm" style={{ color: c.text }}>{detailItem.sourceBranch?.name || '—'}</p>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowRightLeft size={18} style={{ color: c.primary }} />
                </div>
                <div className="flex-1 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-1">
                    <Building2 size={13} style={{ color: c.success }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.muted }}>Destination</p>
                  </div>
                  <p className="font-black text-sm" style={{ color: c.text }}>{detailItem.destBranch?.name || '—'}</p>
                </div>
              </div>

              {/* Key details */}
              <div>
                <DR label="Transfer Date" value={new Date(detailItem.transferDate || detailItem.createdAt).toLocaleString('en-GB')} c={c} icon={<Calendar size={11} />} />
                <DR label="Cost of Goods" value={`GH₵ ${Number(detailItem.totalCost).toFixed(2)}`} c={c} icon={<DollarSign size={11} />} />
                <DR label="Invoice Value (Transfer Price)" value={`GH₵ ${Number(detailItem.transferPrice).toFixed(2)}`} c={c} icon={<Receipt size={11} />} />
                {detailItem.invoiceId && <DR label="Invoice ID" value={detailItem.invoiceId} c={c} icon={<FileText size={11} />} />}
                {detailItem.notes && <DR label="Notes" value={detailItem.notes} c={c} icon={<Hash size={11} />} />}
                {detailItem.initiatedBy && <DR label="Initiated By" value={`${detailItem.initiatedBy.name} (${detailItem.initiatedBy.role || '—'})`} c={c} icon={<ShieldCheck size={11} />} />}
                {detailItem.approvedBy && <DR label="Authorized By" value={`${detailItem.approvedBy.name} (${detailItem.approvedBy.role || '—'})`} c={c} icon={<ShieldCheck size={11} />} />}
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: c.muted }}>
                  Items ({detailItem.items.length} product{detailItem.items.length !== 1 ? 's' : ''})
                </p>
                <div className="space-y-2">
                  {detailItem.items.map((item, i) => (
                    <div key={item.id || i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: c.inputBg }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: c.text }}>
                          {item.product?.name || '—'}
                        </p>
                        <p className="text-[11px]" style={{ color: c.muted }}>
                          {item.product?.category} · {item.product?.strength || 'N/A'}{item.batchNo ? ` · Batch: ${item.batchNo}` : ''}
                        </p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-xs font-bold" style={{ color: c.text }}>{item.quantity} units</p>
                        <p className="text-[11px]" style={{ color: c.muted }}>
                          @ GH₵ {Number(item.transferPrice).toFixed(2)} = <span style={{ color: c.success, fontWeight: 700 }}>GH₵ {Number(item.total).toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounting Impact */}
              {detailItem.status === 'APPROVED' && (
                <div className="p-4 rounded-2xl border" style={{ borderColor: `${c.success}30`, background: `${c.success}08` }}>
                  <p className="text-xs font-black mb-2" style={{ color: c.success }}>✓ Accounting & Stock Synced</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: c.muted }}>
                    <p>• Stock deducted from {detailItem.sourceBranch?.name}</p>
                    <p>• Stock added to {detailItem.destBranch?.name}</p>
                    <p>• Supplier invoice created at destination</p>
                    <p>• Ledger entries posted on both branches</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {canApprove && detailItem.status === 'PENDING' && (
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(detailItem.id)}
                    disabled={!!actionId}
                    className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: c.success }}>
                    {actionId === detailItem.id ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle size={15} /> Approve Transfer</>}
                  </button>
                  <button onClick={() => setShowRejectInput(detailItem.id)}
                    className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    style={{ background: `${c.danger}15`, color: c.danger }}>
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              )}
              {canApprove && (detailItem.status === 'PENDING' || detailItem.status === 'REJECTED') && (
                <button onClick={() => setDeleteConfirmId(detailItem.id)}
                  className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border"
                  style={{ borderColor: `${c.danger}40`, color: c.danger, background: `${c.danger}08` }}>
                  <Trash2 size={14} /> Delete Transfer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Transfer Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
            style={{ background: c.card, border: `1px solid ${c.border}` }}>

            {/* Create header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: c.border, background: c.card }}>
              <div className="flex items-center gap-2">
                <Plus size={18} style={{ color: c.primary }} />
                <p className="font-black text-base" style={{ color: c.text }}>Initiate Stock Transfer</p>
              </div>
              <button onClick={() => { setShowCreate(false); setCreateError(''); setLineItems([]); }}
                className="p-2 rounded-xl" style={{ background: c.inputBg }}>
                <X size={16} style={{ color: c.muted }} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Branch selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>
                    Source Branch (Supplier)
                  </label>
                  <select value={sourceBranchId} onChange={e => setSourceBranchId(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                    <option value="">— Select source —</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>
                    Destination Branch
                  </label>
                  <select value={destBranchId} onChange={e => setDestBranchId(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                    <option value="">— Select destination —</option>
                    {branches.filter(b => b.id !== sourceBranchId).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product search */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>
                  Add Products
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.muted }} />
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search product by name or generic..."
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  {productMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl shadow-2xl border overflow-hidden"
                      style={{ background: c.card, borderColor: c.border }}>
                      {productMatches.map(p => (
                        <button key={p.id} onClick={() => addProduct(p)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:opacity-80 transition-all border-b last:border-0"
                          style={{ borderColor: c.border }}>
                          <div>
                            <p className="text-sm font-bold" style={{ color: c.text }}>{p.name}</p>
                            <p className="text-[11px]" style={{ color: c.muted }}>{p.genericName || p.category} · {p.strength || ''}</p>
                          </div>
                          <div className="text-right ml-3">
                            <p className="text-xs font-bold" style={{ color: c.success }}>GH₵ {p.sellingPrice.toFixed(2)}</p>
                            <p className="text-[11px]" style={{ color: p.stockQuantity <= 10 ? c.warning : c.muted }}>
                              {p.stockQuantity} in stock
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Line items */}
              {lineItems.length > 0 && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: c.border }}>
                  <div className="px-4 py-2.5 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: c.headerBg, color: c.muted }}>
                    <div className="col-span-4">Product</div>
                    <div className="col-span-2 text-center">Available</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-center">Transfer Price</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lineItems.map((l, idx) => (
                    <div key={l.product.id}
                      className="px-4 py-3 grid grid-cols-12 gap-2 items-center border-t"
                      style={{ borderColor: c.border }}>
                      <div className="col-span-4">
                        <p className="text-xs font-bold leading-tight" style={{ color: c.text }}>{l.product.name}</p>
                        <p className="text-[10px]" style={{ color: c.muted }}>{l.product.category}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <p className="text-xs font-bold" style={{ color: l.product.stockQuantity <= 10 ? c.warning : c.muted }}>
                          {l.product.stockQuantity}
                        </p>
                      </div>
                      <div className="col-span-2 text-center">
                        <input type="number" min={1} max={l.product.stockQuantity}
                          value={l.quantity}
                          onChange={e => updateLine(idx, 'quantity', Math.max(1, Math.min(l.product.stockQuantity, Number(e.target.value))))}
                          className="w-full text-center rounded-lg py-1 text-sm focus:outline-none"
                          style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                      </div>
                      <div className="col-span-3 text-center">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: c.muted }}>GH₵</span>
                          <input type="number" min={0} step={0.01}
                            value={l.transferPrice}
                            onChange={e => updateLine(idx, 'transferPrice', Math.max(0, Number(e.target.value)))}
                            className="w-full text-center rounded-lg py-1 text-sm focus:outline-none"
                            style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => removeLine(idx)}
                          className="p-1 rounded-lg" style={{ color: c.danger }}>
                          <Minus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Totals row */}
                  <div className="px-4 py-3 border-t flex justify-between items-center"
                    style={{ borderColor: c.border, background: c.headerBg }}>
                    <p className="text-xs font-bold" style={{ color: c.muted }}>
                      {lineItems.reduce((s, l) => s + l.quantity, 0)} total units
                    </p>
                    <p className="text-sm font-black" style={{ color: c.success }}>
                      Invoice Total: GH₵ {totalTransferValue.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.muted }}>
                  Notes (optional)
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Reason for transfer, special instructions..."
                  rows={2}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
              </div>

              {/* What happens info box */}
              <div className="p-4 rounded-2xl border" style={{ borderColor: `${c.primary}30`, background: `${c.primary}08` }}>
                <p className="text-xs font-black mb-1.5" style={{ color: c.primary }}>What happens when approved:</p>
                <ul className="text-[11px] space-y-0.5" style={{ color: c.muted }}>
                  <li>• Stock is immediately deducted from source on submission</li>
                  <li>• On approval: stock is credited to destination branch</li>
                  <li>• A purchase record + supplier invoice is auto-generated for destination</li>
                  <li>• Ledger entries posted: Revenue on source, Liability on destination</li>
                  <li>• All accounting dashboards sync automatically</li>
                </ul>
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: `${c.danger}15`, color: c.danger }}>
                  <AlertTriangle size={14} /> {createError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setShowCreate(false); setCreateError(''); setLineItems([]); }}
                  className="flex-1 py-3 rounded-xl font-bold border text-sm"
                  style={{ borderColor: c.border, color: c.muted }}>
                  Cancel
                </button>
                <button onClick={handleCreateTransfer}
                  disabled={isSubmitting || lineItems.length === 0}
                  className="flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: c.primary }}>
                  {isSubmitting
                    ? <><Loader2 size={15} className="animate-spin" /> Initiating…</>
                    : <><Truck size={15} /> Initiate Transfer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
