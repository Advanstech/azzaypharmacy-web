'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Tags, Search, X, AlertTriangle, Loader2, RefreshCw,
  TrendingUp, TrendingDown, Package, RotateCcw,
  ArrowUpRight, ArrowDownRight, Info, CheckCheck,
  SortAsc, SortDesc, ChevronLeft, ChevronRight,
  Truck, Eye, Calculator, Clock, CheckCircle2, Filter, Edit3,
} from 'lucide-react';
import { useStore, type Product } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceEdit {
  productId: string;
  costPrice: number;
  sellingPrice: number;
  originalCost: number;
  originalSell: number;
}

type SortField = 'name' | 'sellingPrice' | 'costPrice' | 'markup' | 'stock' | 'updatedAt';
type MarginStatus = 'ALL' | 'GOOD' | 'LOW' | 'LOSS';
type BulkAction =
  | 'SELL_UP_PCT' | 'SELL_DOWN_PCT' | 'SELL_SET'
  | 'COST_UP_PCT' | 'COST_DOWN_PCT'
  | 'MARGIN_SET';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function markupOf(cost: number, sell: number) {
  return cost > 0 ? ((sell - cost) / cost) * 100 : 0;
}

function marginStatus(cost: number, sell: number): 'GOOD' | 'LOW' | 'LOSS' {
  if (sell < cost) return 'LOSS';
  if (cost <= 0 || markupOf(cost, sell) < 20) return 'LOW';
  return 'GOOD';
}

function relativeDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

const BULK_ACTIONS: { value: BulkAction; label: string; field: 'sellingPrice' | 'costPrice'; unit: '%' | 'GH₵' }[] = [
  { value: 'SELL_UP_PCT', label: 'Increase selling price by %', field: 'sellingPrice', unit: '%' },
  { value: 'SELL_DOWN_PCT', label: 'Decrease selling price by %', field: 'sellingPrice', unit: '%' },
  { value: 'SELL_SET', label: 'Set selling price to amount', field: 'sellingPrice', unit: 'GH₵' },
  { value: 'COST_UP_PCT', label: 'Increase cost price by %', field: 'costPrice', unit: '%' },
  { value: 'COST_DOWN_PCT', label: 'Decrease cost price by %', field: 'costPrice', unit: '%' },
  { value: 'MARGIN_SET', label: 'Set markup % (sell = cost × markup)', field: 'sellingPrice', unit: '%' },
];

// ─── Theme ────────────────────────────────────────────────────────────────────

function useColors(isDark: boolean) {
  return isDark ? {
    bg: '#0A0F1E', card: '#0F172A', border: '#1E293B', text: '#F1F5F9',
    muted: '#64748B', inputBg: '#1E293B', headerBg: '#0D1527',
    success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
    primary: '#F97316', accent: '#3B82F6',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A',
    muted: '#64748B', inputBg: '#F8FAFC', headerBg: '#F1F5F9',
    success: '#059669', danger: '#DC2626', warning: '#D97706',
    primary: '#EA580C', accent: '#2563EB',
  };
}

// ─── Margin badge ─────────────────────────────────────────────────────────────

function MarginBadge({ cost, sell, c, showNew }: { cost: number; sell: number; c: any; showNew?: boolean }) {
  if (cost <= 0) return <span style={{ color: c.muted }} className="text-xs">—</span>;
  const status = marginStatus(cost, sell);
  const markup = markupOf(cost, sell);
  const color = status === 'LOSS' ? c.danger : status === 'GOOD' ? c.success : c.warning;
  const label = status === 'LOSS' ? 'LOSS' : `${markup.toFixed(0)}%`;
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{
        background: `${color}18`,
        color,
        outline: showNew ? `2px solid ${color}55` : 'none',
      }}
    >
      {label}
    </span>
  );
}

// ─── Price delta indicator ────────────────────────────────────────────────────

function Delta({ original, current, c }: { original: number; current: number; c: any }) {
  if (original === current) return null;
  const diff = current - original;
  const pct = original ? Math.abs((diff / original) * 100).toFixed(1) : '—';
  const up = diff > 0;
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-bold"
      style={{ color: up ? c.success : c.danger }}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {up ? '+' : ''}{diff.toFixed(2)} ({pct}%)
    </span>
  );
}

// ─── Always-visible price input ───────────────────────────────────────────────

function PriceInput({
  value,
  changed,
  accent,
  c,
  disabled,
  onChange,
}: {
  value: number;
  changed: boolean;
  accent: string;
  c: any;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="flex items-center rounded-lg overflow-hidden transition-shadow"
      style={{
        border: `1.5px solid ${changed ? accent : c.border}`,
        background: disabled ? 'transparent' : c.inputBg,
        boxShadow: changed ? `0 0 0 3px ${accent}20` : 'none',
      }}
    >
      <span className="pl-2.5 text-xs flex-shrink-0" style={{ color: c.muted }}>GH₵</span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onFocus={e => e.target.select()}
        className="w-full py-2 pr-2.5 text-sm font-bold text-right focus:outline-none bg-transparent disabled:opacity-60"
        style={{ color: changed ? accent : c.text, minWidth: '88px' }}
      />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, c, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-4 text-left transition-all hover:shadow-md"
      style={{
        background: c.card,
        borderColor: active ? color : c.border,
        boxShadow: active ? `0 0 0 2px ${color}40` : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>
          <Icon size={16} />
        </div>
        {active && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>Filtered</span>}
      </div>
      <p className="text-2xl font-black" style={{ color: c.text }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: c.muted }}>{label}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: c.muted }}>{sub}</p>}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FORM_CATEGORIES = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'POWDER'];

export default function PriceControlPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  const c = useColors(isDark);

  const { products, suppliers, loadingProducts, refetchProducts, bulkUpdateProductPrices, me } = useStore();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [marginFilter, setMarginFilter] = useState<MarginStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Price edits ───────────────────────────────────────────────────────────
  const [edits, setEdits] = useState<Record<string, PriceEdit>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Selection / bulk / review ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [bulkAction, setBulkAction] = useState<BulkAction>('SELL_UP_PCT');
  const [bulkValue, setBulkValue] = useState('');
  const [showReview, setShowReview] = useState(false);

  const canEdit = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER'].includes(me?.role || '');

  // ── Filtered + sorted products ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = products.filter(p => {
      if (formFilter !== 'ALL' && !p.category?.toUpperCase().includes(formFilter)) return false;
      if (supplierFilter !== 'ALL' && p.supplierId !== supplierFilter) return false;
      if (marginFilter !== 'ALL' && marginStatus(p.costPrice, p.sellingPrice) !== marginFilter) return false;
      if (search) {
        const hay = `${p.name} ${p.genericName || ''} ${p.brand || ''} ${p.category} ${p.supplier?.name || ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'name') { va = a.name; vb = b.name; }
      else if (sortField === 'sellingPrice') { va = a.sellingPrice; vb = b.sellingPrice; }
      else if (sortField === 'costPrice') { va = a.costPrice; vb = b.costPrice; }
      else if (sortField === 'stock') { va = a.stockQuantity; vb = b.stockQuantity; }
      else if (sortField === 'updatedAt') { va = a.updatedAt || ''; vb = b.updatedAt || ''; }
      else { va = markupOf(a.costPrice, a.sellingPrice); vb = markupOf(b.costPrice, b.sellingPrice); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, search, formFilter, supplierFilter, marginFilter, sortField, sortDir]);

  const pendingEdits = useMemo(() =>
    Object.values(edits).filter(e => e.costPrice !== e.originalCost || e.sellingPrice !== e.originalSell),
    [edits]);

  const pagination = usePagination({ data: filtered, itemsPerPage });
  const pageProducts = pagination.paginatedData;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const good = products.filter(p => marginStatus(p.costPrice, p.sellingPrice) === 'GOOD').length;
    const low = products.filter(p => marginStatus(p.costPrice, p.sellingPrice) === 'LOW').length;
    const loss = products.filter(p => marginStatus(p.costPrice, p.sellingPrice) === 'LOSS').length;
    const avgMarkup = products.length
      ? products.reduce((s, p) => s + markupOf(p.costPrice, p.sellingPrice), 0) / products.length
      : 0;
    return { good, low, loss, avgMarkup, total: products.length };
  }, [products]);

  // ── Edit handlers ─────────────────────────────────────────────────────────

  const getEdit = useCallback((p: Product): PriceEdit => {
    return edits[p.id] ?? {
      productId: p.id,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      originalCost: p.costPrice,
      originalSell: p.sellingPrice,
    };
  }, [edits]);

  const setPrice = useCallback((productId: string, field: 'costPrice' | 'sellingPrice', val: number) => {
    setEdits(prev => {
      const existing = prev[productId];
      const product = products.find(p => p.id === productId);
      if (!existing && !product) return prev;
      const originalCost = existing?.originalCost ?? product!.costPrice;
      const originalSell = existing?.originalSell ?? product!.sellingPrice;
      const next: PriceEdit = {
        productId,
        originalCost,
        originalSell,
        costPrice: field === 'costPrice' ? val : (existing?.costPrice ?? product!.costPrice),
        sellingPrice: field === 'sellingPrice' ? val : (existing?.sellingPrice ?? product!.sellingPrice),
      };
      // Auto-remove if reverted back to originals
      if (next.costPrice === next.originalCost && next.sellingPrice === next.originalSell) {
        const n = { ...prev };
        delete n[productId];
        return n;
      }
      return { ...prev, [productId]: next };
    });
  }, [products]);

  const revertProduct = useCallback((productId: string) => {
    setEdits(prev => {
      const n = { ...prev };
      delete n[productId];
      return n;
    });
  }, []);

  const discardAll = useCallback(() => {
    setEdits({});
    setSelectedIds(new Set());
    setShowReview(false);
  }, []);

  // ── Bulk apply ────────────────────────────────────────────────────────────

  const bulkTargets = useMemo(() => {
    return selectedIds.size > 0 ? filtered.filter(p => selectedIds.has(p.id)) : filtered;
  }, [filtered, selectedIds]);

  const applyBulk = useCallback(() => {
    const val = parseFloat(bulkValue);
    if (isNaN(val)) return;
    const action = BULK_ACTIONS.find(a => a.value === bulkAction)!;
    setEdits(prev => {
      const n = { ...prev };
      bulkTargets.forEach(p => {
        const cur = n[p.id] ?? {
          productId: p.id,
          originalCost: p.costPrice,
          originalSell: p.sellingPrice,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
        };
        let cost = cur.costPrice;
        let sell = cur.sellingPrice;
        switch (bulkAction) {
          case 'SELL_UP_PCT': sell = sell * (1 + val / 100); break;
          case 'SELL_DOWN_PCT': sell = sell * (1 - val / 100); break;
          case 'SELL_SET': sell = val; break;
          case 'COST_UP_PCT': cost = cost * (1 + val / 100); break;
          case 'COST_DOWN_PCT': cost = cost * (1 - val / 100); break;
          case 'MARGIN_SET': sell = cost * (1 + val / 100); break;
        }
        n[p.id] = { ...cur, costPrice: +cost.toFixed(2), sellingPrice: +sell.toFixed(2) };
      });
      return n;
    });
    setBulkValue('');
  }, [bulkValue, bulkAction, bulkTargets]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const reviewImpact = useMemo(() => {
    const belowCost = pendingEdits.filter(e => e.sellingPrice < e.costPrice).length;
    const avgNew = pendingEdits.length
      ? pendingEdits.reduce((s, e) => s + markupOf(e.costPrice, e.sellingPrice), 0) / pendingEdits.length
      : 0;
    return { belowCost, avgNew };
  }, [pendingEdits]);

  const handleSave = async () => {
    if (!canEdit || pendingEdits.length === 0) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await bulkUpdateProductPrices(
        pendingEdits.map(e => ({ productId: e.productId, costPrice: e.costPrice, sellingPrice: e.sellingPrice }))
      );
      setEdits({});
      setSelectedIds(new Set());
      setSaveSuccess(true);
      setShowReview(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save prices');
      setShowReview(false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = pageProducts.map(p => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allSelected) pageIds.forEach(id => n.delete(id));
      else pageIds.forEach(id => n.add(id));
      return n;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => map.set(s.id, s.name));
    products.forEach(p => {
      if (p.supplierId && p.supplier?.name && !map.has(p.supplierId)) map.set(p.supplierId, p.supplier.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products, suppliers]);

  const activeFilterCount = [formFilter !== 'ALL', supplierFilter !== 'ALL', marginFilter !== 'ALL', !!search]
    .filter(Boolean).length;

  if (!mounted) return null;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAsc size={12} style={{ color: c.muted, opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <SortAsc size={12} style={{ color: c.primary }} />
      : <SortDesc size={12} style={{ color: c.primary }} />;
  };

  const colTemplate = canEdit
    ? '36px minmax(220px,1.7fr) 70px minmax(120px,140px) minmax(120px,140px) 110px 44px'
    : 'minmax(220px,1.7fr) 70px minmax(120px,140px) minmax(120px,140px) 110px 44px';

  return (
    <div className="min-h-screen pb-28" style={{ background: c.bg }}>
      <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-black flex items-center gap-2" style={{ color: c.text }}>
              <Tags size={22} style={{ color: c.primary }} /> Price Control
            </h1>
            <p className="text-sm mt-1 max-w-xl" style={{ color: c.muted }}>
              Update cost and selling prices across your catalog. Type directly into the price cells, or use the bulk tool to adjust many products at once. Nothing saves until you click <strong style={{ color: c.text }}>Review &amp; Save</strong>.
            </p>
          </div>
          <button onClick={() => refetchProducts()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:shadow-sm"
            style={{ borderColor: c.border, color: c.muted, background: c.card }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Health stats (click to filter) ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Products" value={stats.total} sub={`Avg markup ${stats.avgMarkup.toFixed(0)}%`}
            icon={Package} color={c.accent} c={c}
            active={marginFilter === 'ALL' && !search && formFilter === 'ALL' && supplierFilter === 'ALL'}
            onClick={() => { setMarginFilter('ALL'); setSearch(''); setFormFilter('ALL'); setSupplierFilter('ALL'); }} />
          <StatCard label="Healthy Margin (≥20%)" value={stats.good} sub="Priced well"
            icon={TrendingUp} color={c.success} c={c}
            active={marginFilter === 'GOOD'}
            onClick={() => setMarginFilter(marginFilter === 'GOOD' ? 'ALL' : 'GOOD')} />
          <StatCard label="Low Margin (<20%)" value={stats.low} sub="May need a price review"
            icon={AlertTriangle} color={c.warning} c={c}
            active={marginFilter === 'LOW'}
            onClick={() => setMarginFilter(marginFilter === 'LOW' ? 'ALL' : 'LOW')} />
          <StatCard label="Selling Below Cost" value={stats.loss} sub="Losing money on every sale"
            icon={TrendingDown} color={c.danger} c={c}
            active={marginFilter === 'LOSS'}
            onClick={() => setMarginFilter(marginFilter === 'LOSS' ? 'ALL' : 'LOSS')} />
        </div>

        {/* ── Banners ────────────────────────────────────────────────────── */}
        {saveError && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl text-sm font-medium"
            style={{ background: `${c.danger}12`, color: c.danger, border: `1px solid ${c.danger}30` }}>
            <AlertTriangle size={15} /> {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl text-sm font-medium"
            style={{ background: `${c.success}12`, color: c.success, border: `1px solid ${c.success}30` }}>
            <CheckCheck size={15} /> Prices saved — POS, invoices and inventory are already using the new prices.
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border p-4 space-y-3" style={{ background: c.card, borderColor: c.border }}>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-60">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: c.muted }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search product, generic name, brand, supplier…"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: c.muted }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dosage form */}
            <select value={formFilter} onChange={e => setFormFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none appearance-none cursor-pointer"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: formFilter !== 'ALL' ? c.primary : c.text }}>
              <option value="ALL">All forms</option>
              {FORM_CATEGORIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            {/* Supplier */}
            <div className="relative">
              <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.muted }} />
              <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
                className="pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none appearance-none cursor-pointer min-w-44"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: supplierFilter !== 'ALL' ? c.primary : c.text }}>
                <option value="ALL">All suppliers</option>
                {supplierOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>

            {/* Margin filter pills */}
            <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: c.border }}>
              {([
                { v: 'ALL', label: 'All', color: c.muted },
                { v: 'GOOD', label: 'Healthy', color: c.success },
                { v: 'LOW', label: 'Low', color: c.warning },
                { v: 'LOSS', label: 'Loss', color: c.danger },
              ] as const).map(o => (
                <button key={o.v} onClick={() => setMarginFilter(o.v)}
                  className="px-3.5 py-2.5 text-xs font-bold transition-all"
                  style={{
                    background: marginFilter === o.v ? `${o.color}18` : 'transparent',
                    color: marginFilter === o.v ? o.color : c.muted,
                  }}>
                  {o.label}
                </button>
              ))}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearch(''); setFormFilter('ALL'); setSupplierFilter('ALL'); setMarginFilter('ALL'); }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ color: c.danger, background: `${c.danger}10` }}>
                <Filter size={12} /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* ── Bulk tool ─────────────────────────────────────────────────── */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-1.5">
                <Calculator size={15} style={{ color: c.primary }} />
                <span className="text-xs font-black" style={{ color: c.text }}>Bulk edit</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${c.accent}12`, color: c.accent }}>
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `all ${filtered.length} shown`}
                </span>
              </div>

              <select value={bulkAction} onChange={e => setBulkAction(e.target.value as BulkAction)}
                className="px-3 py-2 rounded-lg text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                {BULK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>

              <div className="flex items-center rounded-lg overflow-hidden"
                style={{ border: `1px solid ${c.border}`, background: c.inputBg }}>
                <input type="number" step="0.01" value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder="Value"
                  className="w-24 px-3 py-2 text-sm font-bold focus:outline-none bg-transparent text-right"
                  style={{ color: c.text }}
                  onKeyDown={e => e.key === 'Enter' && applyBulk()} />
                <span className="pr-3 text-xs font-bold" style={{ color: c.muted }}>
                  {BULK_ACTIONS.find(a => a.value === bulkAction)?.unit}
                </span>
              </div>

              <button onClick={applyBulk}
                disabled={!bulkValue || bulkTargets.length === 0}
                className="px-4 py-2 rounded-lg text-xs font-black text-white transition-all disabled:opacity-40"
                style={{ background: c.primary }}>
                Apply to {bulkTargets.length} product{bulkTargets.length !== 1 ? 's' : ''}
              </button>

              {selectedIds.size > 0 && (
                <button onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-bold px-2 py-2"
                  style={{ color: c.muted }}>
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Guidance ────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: `${c.accent}08`, color: c.muted, border: `1px solid ${c.accent}20` }}>
          <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: c.accent }} />
          <span>
            Changed rows are highlighted in orange. New prices take effect at POS, invoices and valuation <strong style={{ color: c.text }}>only after you save</strong> — existing sales are never changed retroactively.
          </span>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: c.card, borderColor: c.border }}>
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">

              {/* Table toolbar */}
              <div className="px-5 py-3 border-b flex items-center justify-between gap-2"
                style={{ borderColor: c.border, background: c.headerBg }}>
                <p className="font-bold text-sm" style={{ color: c.text }}>
                  Products
                  <span className="ml-2 text-xs font-normal" style={{ color: c.muted }}>
                    {filtered.length} shown{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  {canEdit && selectedIds.size > 0 && selectedIds.size < filtered.length && (
                    <button onClick={() => setSelectedIds(new Set(filtered.map(p => p.id)))}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{ background: `${c.primary}12`, color: c.primary, border: `1px solid ${c.primary}30` }}>
                      Select all {filtered.length}
                    </button>
                  )}
                  {loadingProducts && <Loader2 size={15} className="animate-spin" style={{ color: c.muted }} />}
                </div>
              </div>

              {/* Column headers */}
              <div className="grid px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider items-center"
                style={{ background: c.headerBg, color: c.muted, borderBottom: `1px solid ${c.border}`, gridTemplateColumns: colTemplate }}>
                {canEdit && (
                  <input type="checkbox"
                    checked={pageProducts.length > 0 && pageProducts.every(p => selectedIds.has(p.id))}
                    onChange={toggleSelectPage}
                    className="w-4 h-4 rounded accent-orange-600 cursor-pointer" />
                )}
                <button className="flex items-center gap-1 text-left" onClick={() => toggleSort('name')}>
                  Product <SortIcon field="name" />
                </button>
                <button className="flex items-center gap-1 justify-center" onClick={() => toggleSort('stock')}>
                  Stock <SortIcon field="stock" />
                </button>
                <button className="flex items-center gap-1 justify-end" onClick={() => toggleSort('costPrice')}>
                  Cost Price <SortIcon field="costPrice" />
                </button>
                <button className="flex items-center gap-1 justify-end" onClick={() => toggleSort('sellingPrice')}>
                  Selling Price <SortIcon field="sellingPrice" />
                </button>
                <button className="flex items-center gap-1 justify-center" onClick={() => toggleSort('markup')}>
                  Markup <SortIcon field="markup" />
                </button>
                <span />
              </div>

              {/* Rows */}
              {loadingProducts && filtered.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={30} className="animate-spin" style={{ color: c.muted }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Package size={40} style={{ color: c.muted, opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: c.muted }}>No products match your filters</p>
                  <button onClick={() => { setSearch(''); setFormFilter('ALL'); setSupplierFilter('ALL'); setMarginFilter('ALL'); }}
                    className="text-xs font-bold" style={{ color: c.primary }}>
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: c.border }}>
                  {pageProducts.map(p => {
                    const edit = getEdit(p);
                    const costChanged = edit.costPrice !== edit.originalCost;
                    const sellChanged = edit.sellingPrice !== edit.originalSell;
                    const isEdited = costChanged || sellChanged;
                    const status = marginStatus(p.costPrice, p.sellingPrice);

                    return (
                      <div key={p.id}
                        className="grid items-center px-5 py-3 gap-3 transition-colors"
                        style={{
                          gridTemplateColumns: colTemplate,
                          background: isEdited ? `${c.primary}08` : 'transparent',
                          borderLeft: isEdited ? `3px solid ${c.primary}` : '3px solid transparent',
                        }}>

                        {canEdit && (
                          <input type="checkbox" checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded accent-orange-600 cursor-pointer" />
                        )}

                        {/* Product */}
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: c.text }}>{p.name}</p>
                          <p className="text-xs truncate" style={{ color: c.muted }}>
                            {p.genericName ? `${p.genericName} · ` : ''}{p.category}{p.strength ? ` · ${p.strength}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: c.muted }}>
                            {p.supplier?.name && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: `${c.accent}10`, color: c.accent }}>
                                <Truck size={10} /> {p.supplier.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {relativeDate(p.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Stock */}
                        <div className="flex justify-center">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{
                              background: p.stockQuantity === 0 ? `${c.danger}15` : p.stockQuantity <= 10 ? `${c.warning}15` : `${c.success}15`,
                              color: p.stockQuantity === 0 ? c.danger : p.stockQuantity <= 10 ? c.warning : c.success,
                            }}>
                            {p.stockQuantity}
                          </span>
                        </div>

                        {/* Cost input */}
                        <div className="flex flex-col items-end gap-1">
                          <PriceInput
                            value={edit.costPrice}
                            changed={costChanged}
                            accent={c.accent}
                            c={c}
                            disabled={!canEdit}
                            onChange={v => setPrice(p.id, 'costPrice', v)}
                          />
                          <Delta original={edit.originalCost} current={edit.costPrice} c={c} />
                        </div>

                        {/* Sell input */}
                        <div className="flex flex-col items-end gap-1">
                          <PriceInput
                            value={edit.sellingPrice}
                            changed={sellChanged}
                            accent={c.primary}
                            c={c}
                            disabled={!canEdit}
                            onChange={v => setPrice(p.id, 'sellingPrice', v)}
                          />
                          <Delta original={edit.originalSell} current={edit.sellingPrice} c={c} />
                        </div>

                        {/* Margin: current → new */}
                        <div className="flex items-center justify-center gap-1.5">
                          <MarginBadge cost={p.costPrice} sell={p.sellingPrice} c={c} />
                          {isEdited && (
                            <>
                              <span style={{ color: c.muted }} className="text-xs">→</span>
                              <MarginBadge cost={edit.costPrice} sell={edit.sellingPrice} c={c} showNew />
                            </>
                          )}
                        </div>

                        {/* Revert */}
                        <div className="flex items-center justify-center">
                          {isEdited ? (
                            <button onClick={() => revertProduct(p.id)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: c.danger, background: `${c.danger}10` }}
                              title="Undo changes to this product">
                              <RotateCcw size={14} />
                            </button>
                          ) : <span style={{ color: c.muted, opacity: 0.3 }}>·</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t flex flex-col md:flex-row md:items-center justify-between gap-3"
              style={{ borderColor: c.border, background: c.headerBg }}>
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold" style={{ color: c.muted }}>
                  Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems}
                </p>
                <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
                  style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                  {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={pagination.prevPage} disabled={pagination.currentPage === 1}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs font-black px-2" style={{ color: c.text }}>
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button onClick={pagination.nextPage} disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky save bar ────────────────────────────────────────────────── */}
      {pendingEdits.length > 0 && !showReview && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
          <div className="max-w-[1400px] mx-auto rounded-2xl border shadow-2xl px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap"
            style={{ background: c.card, borderColor: c.primary }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: `${c.primary}15`, color: c.primary }}>
                <Edit3 size={16} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: c.text }}>
                  {pendingEdits.length} product{pendingEdits.length !== 1 ? 's' : ''} changed
                </p>
                <p className="text-xs" style={{ color: c.muted }}>
                  Not saved yet — review before applying
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={discardAll}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: `${c.danger}10`, color: c.danger, border: `1px solid ${c.danger}30` }}>
                Discard all
              </button>
              <button onClick={() => setShowReview(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all"
                style={{ background: c.primary }}>
                <Eye size={15} /> Review &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review modal ───────────────────────────────────────────────────── */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => !isSaving && setShowReview(false)}>
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border flex flex-col overflow-hidden"
            style={{ background: c.card, borderColor: c.border }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
              <div>
                <h2 className="text-lg font-black" style={{ color: c.text }}>Review price changes</h2>
                <p className="text-xs mt-0.5" style={{ color: c.muted }}>
                  {pendingEdits.length} product{pendingEdits.length !== 1 ? 's' : ''} · confirm before these go live
                </p>
              </div>
              <button onClick={() => setShowReview(false)} disabled={isSaving}
                className="p-2 rounded-lg" style={{ color: c.muted }}>
                <X size={18} />
              </button>
            </div>

            {/* Impact summary */}
            <div className="px-6 py-3.5 grid grid-cols-3 gap-3 border-b" style={{ borderColor: c.border }}>
              <div className="rounded-xl p-3" style={{ background: c.headerBg }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Products</p>
                <p className="text-xl font-black" style={{ color: c.text }}>{pendingEdits.length}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: c.headerBg }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>Avg new markup</p>
                <p className="text-xl font-black" style={{ color: c.text }}>{reviewImpact.avgNew.toFixed(0)}%</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: reviewImpact.belowCost > 0 ? `${c.danger}12` : c.headerBg }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: reviewImpact.belowCost > 0 ? c.danger : c.muted }}>Below cost</p>
                <p className="text-xl font-black" style={{ color: reviewImpact.belowCost > 0 ? c.danger : c.text }}>
                  {reviewImpact.belowCost}
                </p>
              </div>
            </div>

            {reviewImpact.belowCost > 0 && (
              <div className="mx-6 mt-3 flex items-center gap-2 p-3 rounded-xl text-xs font-bold"
                style={{ background: `${c.danger}12`, color: c.danger, border: `1px solid ${c.danger}30` }}>
                <AlertTriangle size={14} />
                {reviewImpact.belowCost} product{reviewImpact.belowCost !== 1 ? 's' : ''} will sell below cost — you will lose money on every sale.
              </div>
            )}

            {/* Changes table */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: c.border }}>
                <div className="grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: c.headerBg, color: c.muted, gridTemplateColumns: 'minmax(140px,1.6fr) 1fr 1fr 90px' }}>
                  <span>Product</span>
                  <span className="text-right">Cost</span>
                  <span className="text-right">Selling</span>
                  <span className="text-center">Markup</span>
                </div>
                <div className="divide-y" style={{ borderColor: c.border }}>
                  {pendingEdits.map(e => {
                    const product = products.find(p => p.id === e.productId);
                    return (
                      <div key={e.productId} className="grid px-4 py-2.5 text-xs items-center gap-2"
                        style={{ gridTemplateColumns: 'minmax(140px,1.6fr) 1fr 1fr 90px', color: c.text }}>
                        <span className="font-bold truncate">{product?.name || e.productId.slice(0, 8)}</span>
                        <span className="text-right whitespace-nowrap">
                          {e.costPrice !== e.originalCost ? (
                            <>
                              <span className="line-through mr-1.5" style={{ color: c.danger }}>{e.originalCost.toFixed(2)}</span>
                              <span className="font-black" style={{ color: c.success }}>{e.costPrice.toFixed(2)}</span>
                            </>
                          ) : (
                            <span style={{ color: c.muted }}>{e.costPrice.toFixed(2)}</span>
                          )}
                        </span>
                        <span className="text-right whitespace-nowrap">
                          {e.sellingPrice !== e.originalSell ? (
                            <>
                              <span className="line-through mr-1.5" style={{ color: c.danger }}>{e.originalSell.toFixed(2)}</span>
                              <span className="font-black" style={{ color: c.success }}>{e.sellingPrice.toFixed(2)}</span>
                            </>
                          ) : (
                            <span style={{ color: c.muted }}>{e.sellingPrice.toFixed(2)}</span>
                          )}
                        </span>
                        <span className="flex justify-center">
                          <MarginBadge cost={e.costPrice} sell={e.sellingPrice} c={c} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: c.border }}>
              <button onClick={() => setShowReview(false)} disabled={isSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold"
                style={{ color: c.muted, background: c.inputBg }}>
                ← Back to editing
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
                style={{ background: reviewImpact.belowCost > 0 ? c.danger : c.success }}>
                {isSaving
                  ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  : <><CheckCircle2 size={15} /> Confirm — apply {pendingEdits.length} change{pendingEdits.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
