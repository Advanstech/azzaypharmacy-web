'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  Tags, Search, X, AlertTriangle, Loader2, RefreshCw,
  TrendingUp, TrendingDown, Package, Save, RotateCcw, Percent,
  ArrowUpRight, ArrowDownRight, Info, CheckCheck, Edit3,
  SortAsc, SortDesc, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Truck, Eye, Calculator, Clock,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function markupOf(cost: number, sell: number) {
  return cost > 0 ? ((sell - cost) / cost) * 100 : 0;
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

// ─── Theme helper ─────────────────────────────────────────────────────────────

function useColors(isDark: boolean) {
  return isDark ? {
    bg: '#0A0F1E', card: '#0F172A', border: '#1E293B', text: '#F1F5F9',
    muted: '#64748B', inputBg: '#1E293B', headerBg: '#0D1527',
    success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
    primary: '#F97316', accent: '#3B82F6',
    tagBg: '#1E293B',
  } : {
    bg: '#FFF7F0', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A',
    muted: '#94A3B8', inputBg: '#FFF7F0', headerBg: '#FFF1E6',
    success: '#059669', danger: '#EF4444', warning: '#D97706',
    primary: '#F97316', accent: '#3B82F6',
    tagBg: '#FFF1E6',
  };
}

// ─── Markup badge ─────────────────────────────────────────────────────────────

function MarkupBadge({ cost, sell, c }: { cost: number; sell: number; c: any }) {
  if (cost <= 0) return <span style={{ color: c.muted }} className="text-[10px]">—</span>;
  const markup = markupOf(cost, sell);
  const isGood = markup >= 20;
  const isOk = markup >= 10;
  const isLoss = sell < cost;
  const color = isLoss ? c.danger : isGood ? c.success : isOk ? c.warning : c.danger;
  const label = isLoss ? 'LOSS' : `${markup.toFixed(1)}%`;
  return (
    <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}>
      {label}
    </span>
  );
}

// ─── Price delta indicator ────────────────────────────────────────────────────

function Delta({ original, current, c }: { original: number; current: number; c: any }) {
  if (original === current) return null;
  const diff = current - original;
  const pct = original ? Math.abs((diff / original) * 100).toFixed(1) : '0.0';
  const up = diff > 0;
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold"
      style={{ color: up ? c.success : c.danger }}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {up ? '+' : ''}{diff.toFixed(2)} ({pct}%)
    </span>
  );
}

// ─── Inline price cell ───────────────────────────────────────────────────────

function PriceCell({
  value,
  original,
  prefix,
  accent,
  isEditing,
  readOnly,
  onStart,
  onChange,
  onCommit,
  onKeyDown,
}: {
  value: number;
  original: number;
  prefix: string;
  accent: string;
  isEditing: boolean;
  readOnly: boolean;
  onStart: () => void;
  onChange: (v: number) => void;
  onCommit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const changed = value !== original;
  if (readOnly || !isEditing) {
    return (
      <button
        onClick={readOnly ? undefined : onStart}
        className={`flex flex-col items-end gap-0.5 ${readOnly ? 'cursor-default' : 'cursor-text'}`}
      >
        <span className="text-sm font-black" style={{ color: changed ? accent : 'inherit' }}>
          {prefix} {value.toFixed(2)}
        </span>
        <Delta original={original} current={value} c={{ success: '#10B981', danger: '#EF4444' }} />
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 rounded-lg overflow-hidden"
        style={{ border: `1px solid ${changed ? accent : '#E2E8F0'}`, background: '#FFF7F0' }}>
        <span className="pl-2 text-xs flex-shrink-0 text-slate-400">GH₵</span>
        <input
          type="number" min={0} step={0.01}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onBlur={onCommit}
          onKeyDown={onKeyDown}
          className="flex-1 py-1.5 pr-2 text-sm font-bold text-right focus:outline-none bg-transparent"
          style={{ color: changed ? accent : 'inherit', width: '80px' }}
          autoFocus
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CATS = ['ALL', 'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'POWDER', 'OTHER'];

export default function PriceControlPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  const c = useColors(isDark);

  const { products, suppliers, loadingProducts, refetchProducts, bulkUpdateProductPrices, me } = useStore();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [showLowMargin, setShowLowMargin] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Price edits ───────────────────────────────────────────────────────────
  const [edits, setEdits] = useState<Record<string, PriceEdit>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Inline edit focus ─────────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ productId: string; field: 'costPrice' | 'sellingPrice' } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Bulk & preview ────────────────────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState<'none' | 'markup' | 'cost' | 'sell'>('none');
  const [bulkPct, setBulkPct] = useState('');
  const [targetMarkup, setTargetMarkup] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPreview, setShowPreview] = useState(false);

  const canEdit = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER'].includes(me?.role || '');

  // ── Filtered + sorted products ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products.filter(p => {
      if (catFilter !== 'ALL' && !p.category?.toUpperCase().includes(catFilter)) return false;
      if (supplierFilter !== 'ALL' && p.supplierId !== supplierFilter) return false;
      if (search) {
        const hay = `${p.name} ${p.genericName || ''} ${p.brand || ''} ${p.category} ${p.supplier?.name || ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (showLowMargin && p.costPrice > 0) {
        const m = markupOf(p.costPrice, p.sellingPrice);
        if (m >= 20) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'name') { va = a.name; vb = b.name; }
      else if (sortField === 'sellingPrice') { va = a.sellingPrice; vb = b.sellingPrice; }
      else if (sortField === 'costPrice') { va = a.costPrice; vb = b.costPrice; }
      else if (sortField === 'stock') { va = a.stockQuantity; vb = b.stockQuantity; }
      else if (sortField === 'updatedAt') { va = a.updatedAt || ''; vb = b.updatedAt || ''; }
      else {
        va = markupOf(a.costPrice, a.sellingPrice);
        vb = markupOf(b.costPrice, b.sellingPrice);
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [products, search, catFilter, supplierFilter, showLowMargin, sortField, sortDir]);

  const pendingEdits = useMemo(() => Object.values(edits).filter(e =>
    e.costPrice !== e.originalCost || e.sellingPrice !== e.originalSell
  ), [edits]);

  const pagination = usePagination({ data: filtered, itemsPerPage });
  const pageProducts = pagination.paginatedData;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const avgMarkup = products.length
      ? products.reduce((s, p) => s + markupOf(p.costPrice, p.sellingPrice), 0) / products.length
      : 0;
    const lowMarginCount = products.filter(p => p.costPrice > 0 && markupOf(p.costPrice, p.sellingPrice) < 20).length;
    const lossCount = products.filter(p => p.costPrice > 0 && p.sellingPrice < p.costPrice).length;
    const edited = Object.keys(edits).length;
    return { avgMarkup, lowMarginCount, lossCount, edited, total: products.length };
  }, [products, edits]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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
      const cost = field === 'costPrice' ? val : (existing?.costPrice ?? product!.costPrice);
      const sell = field === 'sellingPrice' ? val : (existing?.sellingPrice ?? product!.sellingPrice);
      return {
        ...prev,
        [productId]: {
          productId,
          originalCost,
          originalSell,
          costPrice: cost,
          sellingPrice: sell,
        },
      };
    });
  }, [products]);

  const revertProduct = useCallback((productId: string) => {
    setEdits(prev => {
      const n = { ...prev };
      delete n[productId];
      return n;
    });
  }, []);

  const revertAll = useCallback(() => {
    setEdits({});
    setSelectedIds(new Set());
    setEditingCell(null);
  }, []);

  const applyBulkPercent = useCallback(() => {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct)) return;
    const targets = selectedIds.size > 0 ? filtered.filter(p => selectedIds.has(p.id)) : pageProducts;
    setEdits(prev => {
      const n = { ...prev };
      targets.forEach(p => {
        const cur = n[p.id] ?? { productId: p.id, originalCost: p.costPrice, originalSell: p.sellingPrice, costPrice: p.costPrice, sellingPrice: p.sellingPrice };
        if (bulkMode === 'sell') {
          n[p.id] = { ...cur, sellingPrice: parseFloat((cur.sellingPrice * (1 + pct / 100)).toFixed(2)) };
        } else if (bulkMode === 'cost') {
          n[p.id] = { ...cur, costPrice: parseFloat((cur.costPrice * (1 + pct / 100)).toFixed(2)) };
        } else if (bulkMode === 'markup') {
          n[p.id] = { ...cur, sellingPrice: parseFloat((cur.costPrice * (1 + pct / 100)).toFixed(2)) };
        }
      });
      return n;
    });
    setBulkPct('');
    setBulkMode('none');
  }, [bulkPct, bulkMode, filtered, pageProducts, selectedIds]);

  const applyTargetMarkup = useCallback(() => {
    const pct = parseFloat(targetMarkup);
    if (isNaN(pct)) return;
    const targets = selectedIds.size > 0 ? filtered.filter(p => selectedIds.has(p.id)) : pageProducts;
    setEdits(prev => {
      const n = { ...prev };
      targets.forEach(p => {
        const cur = n[p.id] ?? {
          productId: p.id,
          originalCost: p.costPrice,
          originalSell: p.sellingPrice,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
        };
        n[p.id] = { ...cur, sellingPrice: parseFloat((cur.costPrice * (1 + pct / 100)).toFixed(2)) };
      });
      return n;
    });
    setTargetMarkup('');
  }, [targetMarkup, filtered, pageProducts, selectedIds]);

  const totalImpact = useMemo(() => {
    return pendingEdits.reduce((acc, e) => {
      const costDiff = e.costPrice - e.originalCost;
      const sellDiff = e.sellingPrice - e.originalSell;
      return { cost: acc.cost + costDiff, sell: acc.sell + sellDiff };
    }, { cost: 0, sell: 0 });
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
      setEditingCell(null);
      setSaveSuccess(true);
      setShowPreview(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save prices');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleCellKey = (e: React.KeyboardEvent, productId: string, field: 'costPrice' | 'sellingPrice') => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextField = field === 'sellingPrice' ? 'costPrice' : 'sellingPrice';
      setEditingCell({ productId, field: nextField });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.supplierId && p.supplier?.name) map.set(p.supplierId, p.supplier.name);
    });
    suppliers.forEach(s => {
      if (!map.has(s.id)) map.set(s.id, s.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products, suppliers]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = pageProducts.map(p => p.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allPageSelected) pageIds.forEach(id => n.delete(id));
      else pageIds.forEach(id => n.add(id));
      return n;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  if (!mounted) return null;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAsc size={11} style={{ color: c.muted, opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <SortAsc size={11} style={{ color: c.primary }} />
      : <SortDesc size={11} style={{ color: c.primary }} />;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4 md:space-y-5" style={{ background: c.bg }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-black flex items-center gap-2" style={{ color: c.text }}>
            <Tags size={22} style={{ color: c.primary }} /> Price Control
          </h1>
          <p className="text-sm mt-0.5" style={{ color: c.muted }}>
            Manage cost & selling prices — changes sync to POS, invoices, supplier invoices, and inventory valuation instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => refetchProducts()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{ borderColor: c.border, color: c.muted, background: c.card }}>
            <RefreshCw size={13} /> Refresh
          </button>
          {pendingEdits.length > 0 && (
            <>
              <button onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: `${c.accent}12`, color: c.accent, border: `1px solid ${c.accent}30` }}>
                <Eye size={13} /> {showPreview ? 'Hide' : 'Preview'}
              </button>
              <button onClick={revertAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: `${c.danger}12`, color: c.danger, border: `1px solid ${c.danger}30` }}>
                <RotateCcw size={13} /> Revert ({pendingEdits.length})
              </button>
              <button onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
                style={{ background: c.primary }}>
                {isSaving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : saveSuccess
                    ? <><CheckCheck size={14} /> Saved!</>
                    : <><Save size={14} /> Save {pendingEdits.length} Change{pendingEdits.length !== 1 ? 's' : ''}</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Total Products', value: kpis.total, icon: Package, color: c.accent },
          { label: 'Avg Markup', value: `${kpis.avgMarkup.toFixed(1)}%`, icon: Percent, color: c.primary },
          { label: 'Low Margin (<20%)', value: kpis.lowMarginCount, icon: AlertTriangle, color: c.warning },
          { label: 'Selling Below Cost', value: kpis.lossCount, icon: TrendingDown, color: c.danger },
          { label: 'Unsaved Edits', value: pendingEdits.length, icon: Edit3, color: pendingEdits.length > 0 ? c.warning : c.muted },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border p-3 md:p-4" style={{ background: c.card, borderColor: c.border }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: `${k.color}18`, color: k.color }}>
                  <Icon size={14} />
                </div>
                <p className="text-xs" style={{ color: c.muted }}>{k.label}</p>
              </div>
              <p className="text-xl font-black font-display" style={{ color: c.text }}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ background: c.card, borderColor: c.border }}>
        {/* Search + filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, generic, brand, supplier..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: c.muted }}>
                <X size={12} />
              </button>
            )}
          </div>
          {/* Category filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATS.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: catFilter === cat ? c.primary : c.inputBg,
                  color: catFilter === cat ? '#fff' : c.muted,
                  border: `1px solid ${catFilter === cat ? c.primary : c.border}`,
                }}>
                {cat}
              </button>
            ))}
          </div>
          {/* Supplier filter */}
          <div className="relative min-w-48">
            <Truck size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.muted }} />
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-bold focus:outline-none appearance-none"
              style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
            >
              <option value="ALL">All suppliers</option>
              {supplierOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowLowMargin(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: showLowMargin ? `${c.danger}15` : c.inputBg,
              color: showLowMargin ? c.danger : c.muted,
              border: `1px solid ${showLowMargin ? c.danger : c.border}`,
            }}>
            <AlertTriangle size={12} /> Low Margin Only
          </button>
        </div>

        {/* Bulk edit bar */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: c.border }}>
            <p className="text-[11px] font-bold" style={{ color: c.muted }}>
              Bulk Apply{selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ` (current page: ${pageProducts.length})`}:
            </p>
            {(['sell', 'cost', 'markup'] as const).map(mode => (
              <button key={mode} onClick={() => setBulkMode(bulkMode === mode ? 'none' : mode)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: bulkMode === mode ? `${c.primary}20` : c.inputBg,
                  color: bulkMode === mode ? c.primary : c.muted,
                  border: `1px solid ${bulkMode === mode ? c.primary : c.border}`,
                }}>
                {mode === 'sell' ? '↑ Selling Price %' : mode === 'cost' ? '↑ Cost Price %' : '= Set Markup %'}
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l" style={{ borderColor: c.border }}>
              <Calculator size={12} style={{ color: c.muted }} />
              <div className="flex items-center rounded-lg overflow-hidden"
                style={{ border: `1px solid ${c.border}`, background: c.inputBg }}>
                <input type="number" step="0.1" value={targetMarkup}
                  onChange={e => setTargetMarkup(e.target.value)}
                  placeholder="Target %"
                  className="w-20 px-2 py-1.5 text-xs font-bold focus:outline-none bg-transparent"
                  style={{ color: c.text }}
                  onKeyDown={e => e.key === 'Enter' && applyTargetMarkup()} />
                <span className="pr-2 text-xs" style={{ color: c.muted }}>%</span>
              </div>
              <button onClick={applyTargetMarkup}
                className="px-2 py-1.5 rounded-lg text-[10px] font-black transition-all"
                style={{ background: c.accent, color: '#fff' }}>
                Set Sell
              </button>
            </div>
            {bulkMode !== 'none' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${c.primary}`, background: c.inputBg }}>
                  <input type="number" step="0.1" value={bulkPct}
                    onChange={e => setBulkPct(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-20 px-3 py-1.5 text-sm font-bold focus:outline-none bg-transparent"
                    style={{ color: c.text }}
                    onKeyDown={e => e.key === 'Enter' && applyBulkPercent()} />
                  <span className="pr-2.5 text-sm" style={{ color: c.primary }}>%</span>
                </div>
                <button onClick={applyBulkPercent}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all"
                  style={{ background: c.primary }}>
                  Apply
                </button>
                <button onClick={() => { setBulkMode('none'); setBulkPct(''); }}
                  className="px-2 py-1.5 rounded-xl text-xs" style={{ color: c.muted }}>
                  <X size={12} />
                </button>
              </div>
            )}
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: c.inputBg, color: c.muted, border: `1px solid ${c.border}` }}>
                Clear Selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Save Error banner ─────────────────────────────────────────────── */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: `${c.danger}12`, color: c.danger, border: `1px solid ${c.danger}30` }}>
          <AlertTriangle size={14} /> {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: `${c.success}12`, color: c.success, border: `1px solid ${c.success}30` }}>
          <CheckCheck size={14} /> Prices saved and synced across all modules successfully.
        </div>
      )}

      {/* ── Info box ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
        style={{ background: `${c.primary}08`, color: c.muted, border: `1px solid ${c.primary}20` }}>
        <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: c.primary }} />
        <span>
          Price changes are applied to the product master record and take effect immediately at POS, invoices, and ledger entries.
          <strong style={{ color: c.text }}> Existing sales are not retroactively changed.</strong>
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: c.card, borderColor: c.border }}>
        {/* Table header */}
        <div className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: c.border, background: c.headerBg }}>
          <div className="flex items-center gap-3">
            {canEdit && (
              <input type="checkbox" checked={pageProducts.length > 0 && pageProducts.every(p => selectedIds.has(p.id))}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-orange-500 cursor-pointer" />
            )}
            <p className="font-bold text-sm" style={{ color: c.text }}>
              Products
              <span className="ml-2 text-xs font-normal" style={{ color: c.muted }}>
                {filtered.length} shown
                {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && selectedIds.size > 0 && selectedIds.size < filtered.length && (
              <button onClick={selectAllFiltered}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{ background: `${c.primary}12`, color: c.primary, border: `1px solid ${c.primary}30` }}>
                Select all {filtered.length} filtered
              </button>
            )}
            {loadingProducts && <Loader2 size={14} className="animate-spin" style={{ color: c.muted }} />}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid px-5 py-2 text-[10px] font-black uppercase tracking-widest"
          style={{
            background: c.headerBg, color: c.muted, borderBottom: `1px solid ${c.border}`,
            gridTemplateColumns: canEdit ? '40px 1.6fr 80px 120px 120px 90px 90px 70px' : '1.6fr 80px 120px 120px 90px 90px 70px',
          }}>
          {canEdit && <span />}
          <button className="flex items-center gap-1 text-left" onClick={() => toggleSort('name')}>
            Product <SortIcon field="name" />
          </button>
          <span>Stock</span>
          <button className="flex items-center gap-1 justify-end" onClick={() => toggleSort('sellingPrice')}>
            Selling <SortIcon field="sellingPrice" />
          </button>
          <button className="flex items-center gap-1 justify-end" onClick={() => toggleSort('costPrice')}>
            Cost <SortIcon field="costPrice" />
          </button>
          <button className="flex items-center gap-1 justify-center" onClick={() => toggleSort('markup')}>
            Markup <SortIcon field="markup" />
          </button>
          <span className="text-center">New</span>
          <span className="text-center">Actions</span>
        </div>

        {/* Rows */}
        {loadingProducts && filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: c.muted }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={36} style={{ color: c.muted, opacity: 0.3 }} />
            <p style={{ color: c.muted }}>No products match filters</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: c.border }}>
            {pageProducts.map((p, i) => {
              const edit = getEdit(p);
              const costChanged = edit.costPrice !== edit.originalCost;
              const sellChanged = edit.sellingPrice !== edit.originalSell;
              const isEdited = costChanged || sellChanged;
              const isEditingSell = editingCell?.productId === p.id && editingCell?.field === 'sellingPrice';
              const isEditingCost = editingCell?.productId === p.id && editingCell?.field === 'costPrice';
              const newMarkup = markupOf(edit.costPrice, edit.sellingPrice);
              const currentHealth = markupOf(p.costPrice, p.sellingPrice);
              const isLoss = currentHealth < 0;
              const rowBg = isEdited
                ? isDark ? 'rgba(249,115,22,0.05)' : 'rgba(249,115,22,0.03)'
                : i % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)';

              return (
                <div key={p.id}
                  className="grid items-center px-5 py-3 gap-3 transition-colors group"
                  style={{
                    background: rowBg,
                    gridTemplateColumns: canEdit ? '40px 1.6fr 80px 120px 120px 90px 90px 70px' : '1.6fr 80px 120px 120px 90px 90px 70px',
                    borderLeft: isEdited ? `3px solid ${c.primary}` : isLoss ? `3px solid ${c.danger}` : '3px solid transparent',
                  }}>

                  {/* Checkbox */}
                  {canEdit && (
                    <input type="checkbox" checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded accent-orange-500 cursor-pointer" />
                  )}

                  {/* Product info */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: c.text }}>{p.name}</p>
                    <p className="text-[10px] truncate" style={{ color: c.muted }}>
                      {p.genericName ? `${p.genericName} · ` : ''}{p.category}{p.strength ? ` · ${p.strength}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: c.muted }}>
                      {p.supplier?.name && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ background: `${c.accent}12`, color: c.accent }}>
                          <Truck size={9} /> {p.supplier.name}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Clock size={9} /> {relativeDate(p.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Stock */}
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{
                        background: p.stockQuantity === 0 ? `${c.danger}15` : p.stockQuantity <= 10 ? `${c.warning}15` : `${c.success}15`,
                        color: p.stockQuantity === 0 ? c.danger : p.stockQuantity <= 10 ? c.warning : c.success,
                      }}>
                      {p.stockQuantity}
                    </span>
                  </div>

                  {/* Selling price click-to-edit */}
                  <div className="flex justify-end">
                    <PriceCell
                      value={edit.sellingPrice}
                      original={edit.originalSell}
                      prefix="GH₵"
                      accent={c.primary}
                      isEditing={isEditingSell}
                      readOnly={!canEdit}
                      onStart={() => setEditingCell({ productId: p.id, field: 'sellingPrice' })}
                      onChange={v => setPrice(p.id, 'sellingPrice', v)}
                      onCommit={() => setEditingCell(null)}
                      onKeyDown={e => handleCellKey(e, p.id, 'sellingPrice')}
                    />
                  </div>

                  {/* Cost price click-to-edit */}
                  <div className="flex justify-end">
                    <PriceCell
                      value={edit.costPrice}
                      original={edit.originalCost}
                      prefix="GH₵"
                      accent={c.accent}
                      isEditing={isEditingCost}
                      readOnly={!canEdit}
                      onStart={() => setEditingCell({ productId: p.id, field: 'costPrice' })}
                      onChange={v => setPrice(p.id, 'costPrice', v)}
                      onCommit={() => setEditingCell(null)}
                      onKeyDown={e => handleCellKey(e, p.id, 'costPrice')}
                    />
                  </div>

                  {/* Current markup */}
                  <div className="flex justify-center">
                    <MarkupBadge cost={p.costPrice} sell={p.sellingPrice} c={c} />
                  </div>

                  {/* New markup */}
                  <div className="flex justify-center">
                    {isEdited
                      ? <MarkupBadge cost={edit.costPrice} sell={edit.sellingPrice} c={c} />
                      : <span style={{ color: c.muted }} className="text-[10px]">—</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    {canEdit && (
                      <>
                        {isEdited && (
                          <button onClick={() => revertProduct(p.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: c.danger }}
                            title="Revert this product">
                            <RotateCcw size={13} />
                          </button>
                        )}
                        {!isEdited && (
                          <Edit3 size={13} style={{ color: c.muted, opacity: 0.5 }} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t flex flex-col md:flex-row md:items-center justify-between gap-3"
            style={{ borderColor: c.border, background: c.headerBg }}>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold" style={{ color: c.muted }}>
                Showing {pagination.startIndex}-{pagination.endIndex} of {pagination.totalItems}
              </p>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg text-xs font-bold focus:outline-none"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={pagination.prevPage}
                disabled={pagination.currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              >
                <ChevronLeft size={13} /> Previous
              </button>
              <span className="text-xs font-black" style={{ color: c.text }}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={pagination.nextPage}
                disabled={pagination.currentPage === pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Footer summary + preview */}
        {pendingEdits.length > 0 && (
          <div className="border-t" style={{ borderColor: c.border, background: `${c.primary}08` }}>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold" style={{ color: c.primary }}>
                  {pendingEdits.length} product{pendingEdits.length !== 1 ? 's' : ''} with unsaved price changes
                </p>
                <button onClick={() => setShowPreview(v => !v)}
                  className="flex items-center gap-1 text-[10px] font-bold"
                  style={{ color: c.accent }}>
                  <Eye size={10} /> {showPreview ? 'Hide' : 'Show'} Preview
                  {showPreview ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              </div>
              <button onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
                style={{ background: c.primary }}>
                {isSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save All Changes</>}
              </button>
            </div>

            {showPreview && (
              <div className="px-5 py-4 border-t space-y-4" style={{ borderColor: c.border, background: c.card }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3" style={{ borderColor: c.border }}>
                    <p className="text-[10px] font-bold" style={{ color: c.muted }}>Total Cost Impact</p>
                    <p className="text-lg font-black" style={{ color: totalImpact.cost >= 0 ? c.success : c.danger }}>
                      {totalImpact.cost >= 0 ? '+' : ''}{totalImpact.cost.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: c.border }}>
                    <p className="text-[10px] font-bold" style={{ color: c.muted }}>Total Selling Impact</p>
                    <p className="text-lg font-black" style={{ color: totalImpact.sell >= 0 ? c.success : c.danger }}>
                      {totalImpact.sell >= 0 ? '+' : ''}{totalImpact.sell.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: c.border }}>
                    <p className="text-[10px] font-bold" style={{ color: c.muted }}>Avg New Markup</p>
                    <p className="text-lg font-black" style={{ color: c.text }}>
                      {(pendingEdits.reduce((s, e) => s + markupOf(e.costPrice, e.sellingPrice), 0) / pendingEdits.length).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: c.border }}>
                    <p className="text-[10px] font-bold" style={{ color: c.muted }}>Below Cost After Save</p>
                    <p className="text-lg font-black" style={{ color: pendingEdits.some(e => e.sellingPrice < e.costPrice) ? c.danger : c.text }}>
                      {pendingEdits.filter(e => e.sellingPrice < e.costPrice).length}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden" style={{ borderColor: c.border }}>
                  <div className="grid px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ background: c.headerBg, color: c.muted, gridTemplateColumns: '1.5fr 120px 120px 100px 80px' }}>
                    <span>Product</span>
                    <span className="text-right">Old Sell</span>
                    <span className="text-right">New Sell</span>
                    <span className="text-right">Old Cost</span>
                    <span className="text-center">New Markup</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: c.border }}>
                    {pendingEdits.map(e => {
                      const product = products.find(p => p.id === e.productId);
                      return (
                        <div key={e.productId} className="grid px-4 py-2 text-xs items-center"
                          style={{ gridTemplateColumns: '1.5fr 120px 120px 100px 80px', color: c.text }}>
                          <span className="font-bold truncate">{product?.name || e.productId.slice(0, 8)}</span>
                          <span className="text-right" style={{ color: c.muted }}>GH₵ {e.originalSell.toFixed(2)}</span>
                          <span className="text-right font-black" style={{ color: e.sellingPrice !== e.originalSell ? c.primary : c.text }}>
                            GH₵ {e.sellingPrice.toFixed(2)}
                          </span>
                          <span className="text-right" style={{ color: c.muted }}>GH₵ {e.originalCost.toFixed(2)}</span>
                          <span className="flex justify-center">
                            <MarkupBadge cost={e.costPrice} sell={e.sellingPrice} c={c} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
