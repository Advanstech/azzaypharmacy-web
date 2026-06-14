'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  ArrowLeft, Download, PackageCheck, Search, Filter,
  ChevronDown, ChevronUp, TrendingUp, Clock, CheckCircle,
  XCircle, AlertCircle, Package, Truck,
} from 'lucide-react';

function downloadCSV(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csv = rows.map(r => r.map(c => {
    if (c == null) return '""';
    const str = String(c).replace(/"/g, '""');
    return `"${str}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  RECEIVED:  { label: 'Received',  color: '#10B981', icon: CheckCircle },
  PENDING:   { label: 'Pending',   color: '#F59E0B', icon: Clock },
  PARTIAL:   { label: 'Partial',   color: '#0EA5E9', icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', icon: XCircle },
};

export default function PurchaseOrdersReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { purchases, suppliers, refetchPurchases } = useStore();

  useEffect(() => {
    if (purchases.length === 0) refetchPurchases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [sortField, setSortField] = useState<'date' | 'total' | 'items'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueStatuses = useMemo(() => {
    const s = new Set(purchases.map(p => p.status));
    return ['All', ...Array.from(s)];
  }, [purchases]);

  const uniqueSuppliers = useMemo(() => {
    const s = new Set(purchases.map(p => p.supplier?.name).filter(Boolean));
    return ['All', ...Array.from(s) as string[]];
  }, [purchases]);

  const filtered = useMemo(() => {
    let list = [...purchases];
    if (statusFilter !== 'All') list = list.filter(p => p.status === statusFilter);
    if (supplierFilter !== 'All') list = list.filter(p => p.supplier?.name === supplierFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.invoiceNo || '').toLowerCase().includes(q) ||
        (p.supplier?.name || '').toLowerCase().includes(q) ||
        p.items.some(i => (i.product?.name || '').toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
      if (sortField === 'total') cmp = a.total - b.total;
      if (sortField === 'items') cmp = (a.items?.length || 0) - (b.items?.length || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [purchases, statusFilter, supplierFilter, search, sortField, sortDir]);

  // Summary KPIs
  const kpis = useMemo(() => {
    const total = purchases.reduce((s, p) => s + p.total, 0);
    const byStatus: Record<string, number> = {};
    purchases.forEach(p => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });
    const bySupplier: Record<string, number> = {};
    purchases.forEach(p => {
      if (p.supplier) bySupplier[p.supplier.name] = (bySupplier[p.supplier.name] || 0) + p.total;
    });
    const topSupplier = Object.entries(bySupplier).sort((a, b) => b[1] - a[1])[0];
    return {
      total, count: purchases.length,
      received: byStatus['RECEIVED'] || 0,
      pending: byStatus['PENDING'] || 0,
      avgOrder: purchases.length > 0 ? total / purchases.length : 0,
      topSupplier: topSupplier ? topSupplier[0] : 'N/A',
    };
  }, [purchases]);

  const handleExport = () => {
    const rows: (string | number | boolean | null | undefined)[][] = [
      ['PURCHASE ORDERS REPORT'],
      ['Generated:', new Date().toLocaleString('en-GB')],
      [''],
      ['Invoice #', 'Date', 'Supplier', 'Status', 'Items', 'Total Value (GH₵)'],
      ...filtered.map(p => [
        p.invoiceNo || 'N/A',
        new Date(p.invoiceDate).toLocaleDateString('en-GB'),
        p.supplier?.name || 'Unknown',
        p.status,
        String(p.items?.length || 0),
        p.total.toFixed(2),
      ]),
      [''],
      ['SUMMARY'],
      ['Total Orders', String(filtered.length)],
      ['Total Value', filtered.reduce((s, p) => s + p.total, 0).toFixed(2)],
    ];
    downloadCSV(`purchase-orders-${today}.csv`, rows);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    row: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
    rowHover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  if (!mounted) return null;

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
      : <ChevronDown size={12} style={{ opacity: 0.3 }} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/reports')}
            className="p-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <ArrowLeft size={20} style={{ color: card.text }} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: card.text }}>
              <PackageCheck size={22} style={{ color: '#22C55E' }} />
              Purchase Orders Report
            </h1>
            <p className="text-sm" style={{ color: card.muted }}>
              {kpis.count} orders · GH₵ {kpis.total.toFixed(2)} total value
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primary}30` }}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Orders', value: String(kpis.count), icon: PackageCheck, color: '#22C55E' },
          { label: 'Total Value', value: `GH₵ ${kpis.total.toFixed(2)}`, icon: TrendingUp, color: card.primary },
          { label: 'Received', value: String(kpis.received), icon: CheckCircle, color: '#10B981' },
          { label: 'Pending', value: String(kpis.pending), icon: Clock, color: '#F59E0B' },
          { label: 'Avg Order', value: `GH₵ ${kpis.avgOrder.toFixed(2)}`, icon: Truck, color: '#A855F7' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl border p-3" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: card.subtle }}>{k.label}</span>
            </div>
            <p className="font-display text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl border" style={{ background: card.bg, borderColor: card.border }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: card.muted }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice, supplier, product…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none"
            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
        <select
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
          {uniqueSuppliers.map(s => <option key={s} value={s}>{s === 'All' ? 'All Suppliers' : s}</option>)}
        </select>
        <span className="flex items-center text-xs font-bold px-3 py-2 rounded-lg"
          style={{ background: `${card.primary}15`, color: card.primary }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_130px_160px_100px_80px_110px_40px] gap-2 px-4 py-3 border-b text-[10px] font-bold uppercase tracking-wider"
          style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: card.border, color: card.subtle }}>
          <button className="flex items-center gap-1 text-left" onClick={() => toggleSort('date')}>
            Invoice / Date <SortIcon field="date" />
          </button>
          <span>Supplier</span>
          <span>Status</span>
          <button className="flex items-center gap-1" onClick={() => toggleSort('items')}>
            Items <SortIcon field="items" />
          </button>
          <button className="flex items-center gap-1 justify-end" onClick={() => toggleSort('total')}>
            Total <SortIcon field="total" />
          </button>
          <span />
          <span />
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: card.muted }}>
            <PackageCheck size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No purchase orders found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: card.border }}>
            {filtered.map(p => {
              const meta = STATUS_META[p.status] || { label: p.status, color: card.muted, icon: AlertCircle };
              const StatusIcon = meta.icon;
              const isExpanded = expandedId === p.id;

              return (
                <div key={p.id}>
                  <div
                    className="grid grid-cols-[1fr_130px_160px_100px_80px_110px_40px] gap-2 px-4 py-3 items-center cursor-pointer transition-colors"
                    style={{ background: isExpanded ? card.rowHover : 'transparent' }}
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}>

                    {/* Invoice / Date */}
                    <div>
                      <p className="text-xs font-bold font-mono" style={{ color: card.text }}>
                        {p.invoiceNo || `PO-${p.id.slice(-6).toUpperCase()}`}
                      </p>
                      <p className="text-[10px]" style={{ color: card.muted }}>
                        {new Date(p.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Supplier */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black"
                        style={{ background: `${card.primary}20`, color: card.primary }}>
                        {(p.supplier?.name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs truncate" style={{ color: card.text }}>{p.supplier?.name || 'Unknown'}</span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      <StatusIcon size={13} style={{ color: meta.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${meta.color}15`, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="flex items-center gap-1">
                      <Package size={12} style={{ color: card.muted }} />
                      <span className="text-xs font-medium" style={{ color: card.muted }}>{p.items?.length || 0}</span>
                    </div>

                    {/* Total */}
                    <p className="text-sm font-bold font-mono text-right" style={{ color: card.text }}>
                      GH₵ {p.total.toFixed(2)}
                    </p>

                    {/* Expand toggle */}
                    <div />
                    <div className="flex justify-end">
                      {isExpanded
                        ? <ChevronUp size={16} style={{ color: card.muted }} />
                        : <ChevronDown size={16} style={{ color: card.muted }} />}
                    </div>
                  </div>

                  {/* Expanded Item Lines */}
                  {isExpanded && p.items?.length > 0 && (
                    <div className="px-6 pb-4 space-y-1 border-t" style={{ borderColor: card.border, background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }}>
                      <div className="grid grid-cols-[1fr_80px_100px_100px_110px] gap-2 py-2 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: card.subtle }}>
                        <span>Product</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Unit Cost</span>
                        <span>Batch</span>
                        <span className="text-right">Line Total</span>
                      </div>
                      {p.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_110px] gap-2 py-1.5 rounded-lg px-2"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                          <span className="text-xs font-medium" style={{ color: card.text }}>
                            {item.product?.name || 'Unknown Product'}
                          </span>
                          <span className="text-xs text-right font-mono" style={{ color: card.muted }}>{item.quantity}</span>
                          <span className="text-xs text-right font-mono" style={{ color: card.muted }}>
                            GH₵ {Number(item.unitCost).toFixed(2)}
                          </span>
                          <span className="text-[10px]" style={{ color: card.subtle }}>{item.batchNo || '—'}</span>
                          <span className="text-xs text-right font-mono font-bold" style={{ color: card.text }}>
                            GH₵ {Number(item.total).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 mt-1 border-t" style={{ borderColor: card.border }}>
                        <span className="text-xs font-bold" style={{ color: card.muted }}>Order Total</span>
                        <span className="text-sm font-bold font-mono" style={{ color: card.text }}>GH₵ {p.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer totals */}
        {filtered.length > 0 && (
          <div className="flex justify-between items-center px-4 py-3 border-t"
            style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: card.border }}>
            <span className="text-xs font-bold" style={{ color: card.muted }}>
              {filtered.length} order{filtered.length !== 1 ? 's' : ''} shown
            </span>
            <div className="text-right">
              <span className="text-xs font-bold" style={{ color: card.muted }}>Filtered Total: </span>
              <span className="font-display text-base font-bold font-mono" style={{ color: card.text }}>
                GH₵ {filtered.reduce((s, p) => s + p.total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
