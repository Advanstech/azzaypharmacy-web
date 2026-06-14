'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import {
  Tags, Search, X, Check, AlertTriangle, Loader2, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, Package, Filter,
  ChevronUp, ChevronDown, Save, RotateCcw, Percent,
  ArrowUpRight, ArrowDownRight, Info, CheckCheck, Edit3,
  SortAsc, SortDesc,
} from 'lucide-react';
import { useStore, type Product } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceEdit {
  productId: string;
  costPrice: number;
  sellingPrice: number;
  originalCost: number;
  originalSell: number;
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
  const markup = ((sell - cost) / cost) * 100;
  const isGood = markup >= 20;
  const isOk = markup >= 10;
  const color = isGood ? c.success : isOk ? c.warning : c.danger;
  return (
    <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}>
      {markup.toFixed(1)}%
    </span>
  );
}

// ─── Price delta indicator ────────────────────────────────────────────────────

function Delta({ original, current, c }: { original: number; current: number; c: any }) {
  if (original === current) return null;
  const diff = current - original;
  const pct = Math.abs((diff / original) * 100).toFixed(1);
  const up = diff > 0;
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold"
      style={{ color: up ? c.success : c.danger }}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {up ? '+' : ''}{diff.toFixed(2)} ({pct}%)
    </span>
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

  const { products, loadingProducts, refetchProducts, bulkUpdateProductPrices, me } = useStore();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [showLowMargin, setShowLowMargin] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'sellingPrice' | 'markup' | 'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Price edits ───────────────────────────────────────────────────────────
  const [edits, setEdits] = useState<Record<string, PriceEdit>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Inline edit mode ──────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Bulk % apply ──────────────────────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState<'none' | 'markup' | 'cost' | 'sell'>('none');
  const [bulkPct, setBulkPct] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canEdit = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER'].includes(me?.role || '');

  // ── Filtered + sorted products ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products.filter(p => {
      if (catFilter !== 'ALL' && !p.category?.toUpperCase().includes(catFilter)) return false;
      if (search) {
        const hay = `${p.name} ${p.genericName || ''} ${p.brand || ''} ${p.category}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (showLowMargin && p.costPrice > 0) {
        const m = ((p.sellingPrice - p.costPrice) / p.costPrice) * 100;
        if (m >= 20) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'name') { va = a.name; vb = b.name; }
      else if (sortField === 'sellingPrice') { va = a.sellingPrice; vb = b.sellingPrice; }
      else if (sortField === 'stock') { va = a.stockQuantity; vb = b.stockQuantity; }
      else {
        va = a.costPrice > 0 ? ((a.sellingPrice - a.costPrice) / a.costPrice) * 100 : 0;
        vb = b.costPrice > 0 ? ((b.sellingPrice - b.costPrice) / b.costPrice) * 100 : 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [products, search, catFilter, showLowMargin, sortField, sortDir]);

  const pendingEdits = useMemo(() => Object.values(edits).filter(e =>
    e.costPrice !== e.originalCost || e.sellingPrice !== e.originalSell
  ), [edits]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const avgMarkup = products.length
      ? products.reduce((s, p) => s + (p.costPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.costPrice) * 100 : 0), 0) / products.length
      : 0;
    const lowMarginCount = products.filter(p => p.costPrice > 0 && ((p.sellingPrice - p.costPrice) / p.costPrice) * 100 < 20).length;
    const edited = Object.keys(edits).length;
    return { avgMarkup, lowMarginCount, edited, total: products.length };
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

  const setPrice = useCallback((productId: string, field: 'costPrice' | 'sellingPrice', val: number, originalCost: number, originalSell: number) => {
    setEdits(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? { productId, originalCost, originalSell, costPrice: originalCost, sellingPrice: originalSell }),
        [field]: val,
      }
    }));
  }, []);

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
  }, []);

  const applyBulkPercent = useCallback(() => {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct)) return;
    const targets = selectedIds.size > 0 ? filtered.filter(p => selectedIds.has(p.id)) : filtered;
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
  }, [bulkPct, bulkMode, filtered, selectedIds]);

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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save prices');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  if (!mounted) return null;

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <SortAsc size={11} style={{ color: c.muted, opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <SortAsc size={11} style={{ color: c.primary }} />
      : <SortDesc size={11} style={{ color: c.primary }} />;
  };

  return (
    <div className="min-h-screen p-6 space-y-5" style={{ background: c.bg }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-black flex items-center gap-2" style={{ color: c.text }}>
            <Tags size={22} style={{ color: c.primary }} /> Price Control
          </h1>
          <p className="text-sm mt-0.5" style={{ color: c.muted }}>
            Manage cost & selling prices across all products — changes sync to POS, invoices, and ledger instantly
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
              <button onClick={revertAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: `${c.danger}12`, color: c.danger, border: `1px solid ${c.danger}30` }}>
                <RotateCcw size={13} /> Revert All ({pendingEdits.length})
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: kpis.total, icon: Package, color: c.accent },
          { label: 'Avg Markup', value: `${kpis.avgMarkup.toFixed(1)}%`, icon: Percent, color: c.primary },
          { label: 'Low Margin (<20%)', value: kpis.lowMarginCount, icon: AlertTriangle, color: c.danger },
          { label: 'Unsaved Edits', value: pendingEdits.length, icon: Edit3, color: pendingEdits.length > 0 ? c.warning : c.muted },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border p-4" style={{ background: c.card, borderColor: c.border }}>
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
              placeholder="Search by name, generic, brand..."
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
              Bulk Apply{selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ` (all ${filtered.length} visible)`}:
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
              <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
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
          {loadingProducts && <Loader2 size={14} className="animate-spin" style={{ color: c.muted }} />}
        </div>

        {/* Column headers */}
        <div className="grid px-5 py-2 text-[10px] font-black uppercase tracking-widest"
          style={{
            background: c.headerBg, color: c.muted, borderBottom: `1px solid ${c.border}`,
            gridTemplateColumns: canEdit ? '40px 1fr 100px 140px 140px 120px 80px 80px' : '1fr 100px 140px 140px 120px 80px 80px',
          }}>
          {canEdit && <span />}
          <button className="flex items-center gap-1 text-left" onClick={() => toggleSort('name')}>
            Product <SortIcon field="name" />
          </button>
          <span>Stock</span>
          <button className="flex items-center gap-1 justify-center" onClick={() => toggleSort('sellingPrice')}>
            Selling Price <SortIcon field="sellingPrice" />
          </button>
          <span className="text-center">Cost Price</span>
          <button className="flex items-center gap-1 justify-center" onClick={() => toggleSort('markup')}>
            Markup <SortIcon field="markup" />
          </button>
          <span className="text-center">New Markup</span>
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
            {filtered.map((p, i) => {
              const edit = getEdit(p);
              const costChanged = edit.costPrice !== edit.originalCost;
              const sellChanged = edit.sellingPrice !== edit.originalSell;
              const isEdited = costChanged || sellChanged;
              const isEditing = editingId === p.id;
              const newMarkup = edit.costPrice > 0 ? ((edit.sellingPrice - edit.costPrice) / edit.costPrice) * 100 : 0;
              const rowBg = isEdited
                ? isDark ? 'rgba(249,115,22,0.05)' : 'rgba(249,115,22,0.03)'
                : i % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)';

              return (
                <div key={p.id}
                  className="grid items-center px-5 py-3 gap-3 transition-colors group"
                  style={{
                    background: rowBg,
                    gridTemplateColumns: canEdit ? '40px 1fr 100px 140px 140px 120px 80px 80px' : '1fr 100px 140px 140px 120px 80px 80px',
                    borderLeft: isEdited ? `3px solid ${c.primary}` : '3px solid transparent',
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
                  </div>

                  {/* Stock */}
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{
                        background: p.stockQuantity === 0 ? `${c.danger}15` : p.stockQuantity <= 10 ? `${c.warning}15` : `${c.success}15`,
                        color: p.stockQuantity === 0 ? c.danger : p.stockQuantity <= 10 ? c.warning : c.success,
                      }}>
                      {p.stockQuantity} units
                    </span>
                  </div>

                  {/* Selling price edit */}
                  <div className="flex flex-col gap-0.5">
                    {canEdit && isEditing ? (
                      <div className="flex items-center gap-1 rounded-lg overflow-hidden"
                        style={{ border: `1px solid ${sellChanged ? c.primary : c.border}`, background: c.inputBg }}>
                        <span className="pl-2 text-xs flex-shrink-0" style={{ color: c.muted }}>GH₵</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={edit.sellingPrice}
                          onChange={e => setPrice(p.id, 'sellingPrice', parseFloat(e.target.value) || 0, p.costPrice, p.sellingPrice)}
                          className="flex-1 py-1.5 pr-2 text-sm font-bold text-right focus:outline-none bg-transparent"
                          style={{ color: sellChanged ? c.primary : c.text, width: '80px' }}
                          autoFocus={false}
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-black" style={{ color: sellChanged ? c.primary : c.text }}>
                        GH₵ {edit.sellingPrice.toFixed(2)}
                      </span>
                    )}
                    {sellChanged && <Delta original={edit.originalSell} current={edit.sellingPrice} c={c} />}
                  </div>

                  {/* Cost price edit */}
                  <div className="flex flex-col gap-0.5">
                    {canEdit && isEditing ? (
                      <div className="flex items-center gap-1 rounded-lg overflow-hidden"
                        style={{ border: `1px solid ${costChanged ? c.accent : c.border}`, background: c.inputBg }}>
                        <span className="pl-2 text-xs flex-shrink-0" style={{ color: c.muted }}>GH₵</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={edit.costPrice}
                          onChange={e => setPrice(p.id, 'costPrice', parseFloat(e.target.value) || 0, p.costPrice, p.sellingPrice)}
                          className="flex-1 py-1.5 pr-2 text-sm font-bold text-right focus:outline-none bg-transparent"
                          style={{ color: costChanged ? c.accent : c.text, width: '80px' }}
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-bold" style={{ color: costChanged ? c.accent : c.muted }}>
                        GH₵ {edit.costPrice.toFixed(2)}
                      </span>
                    )}
                    {costChanged && <Delta original={edit.originalCost} current={edit.costPrice} c={c} />}
                  </div>

                  {/* Original markup */}
                  <div className="flex justify-center">
                    <MarkupBadge cost={p.costPrice} sell={p.sellingPrice} c={c} />
                  </div>

                  {/* New markup (if edited) */}
                  <div className="flex justify-center">
                    {isEdited
                      ? <MarkupBadge cost={edit.costPrice} sell={edit.sellingPrice} c={c} />
                      : <span style={{ color: c.muted }} className="text-[10px]">—</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setEditingId(isEditing ? null : p.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ background: isEditing ? `${c.primary}20` : 'transparent', color: isEditing ? c.primary : c.muted }}
                          title={isEditing ? 'Done editing' : 'Edit prices'}>
                          {isEditing ? <Check size={13} /> : <Edit3 size={13} />}
                        </button>
                        {isEdited && (
                          <button onClick={() => revertProduct(p.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: c.danger }}
                            title="Revert this product">
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer summary */}
        {pendingEdits.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: c.border, background: `${c.primary}08` }}>
            <p className="text-xs font-bold" style={{ color: c.primary }}>
              {pendingEdits.length} product{pendingEdits.length !== 1 ? 's' : ''} with unsaved price changes
            </p>
            <button onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
              style={{ background: c.primary }}>
              {isSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save All Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
