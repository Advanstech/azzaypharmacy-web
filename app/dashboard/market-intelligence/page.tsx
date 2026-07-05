'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle, ShieldAlert,
  RefreshCw, Clock, ArrowUpRight, Newspaper,
  GraduationCap, ChevronRight, Search, BrainCircuit,
  Pill, BookOpen, CheckCircle, XCircle, Info,
  MapPin, CalendarDays, BarChart2, ShoppingCart, Flame,
  AlertCircle, CircleCheck, BadgeAlert, ChevronDown,
} from 'lucide-react';
import { mockIntelligenceData } from '@/lib/intelligence-data';
import { useStore } from '@/lib/store';
import { gql, M_ASK_NEXUS_AI } from '@/lib/gql';

export default function MarketIntelligencePage() {
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [data] = useState<any>(mockIntelligenceData);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceCategory, setPriceCategory] = useState('All');
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [aiMonographs, setAiMonographs] = useState<any[]>([]);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const { products } = useStore();

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.95)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    dim: isDark ? '#475569' : '#94A3B8',
    primary: '#0EA5E9',
    accent: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cardBg: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(248,250,252,0.9)',
    headerBg: isDark ? 'rgba(15,23,42,0.9)' : '#F1F5F9',
  };

  // ── Inventory-aware computations ──────────────────────────────────────────
  const lowStockProducts = useMemo(() =>
    products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10)
      .sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 8),
    [products]
  );
  const outOfStockProducts = useMemo(() =>
    products.filter(p => p.stockQuantity === 0).slice(0, 8),
    [products]
  );

  // Match market price items to products in inventory
  const pricedProducts = useMemo(() => {
    return (data?.marketPrices || []).map((mp: any) => {
      const match = products.find(p =>
        p.name.toLowerCase().includes(mp.name.toLowerCase().split(' ')[0]) ||
        mp.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
      );
      return { ...mp, inventoryProduct: match || null };
    });
  }, [data, products]);

  const filteredPrices = useMemo(() => {
    if (priceCategory === 'All') return pricedProducts;
    return pricedProducts.filter((p: any) => p.category === priceCategory);
  }, [pricedProducts, priceCategory]);

  // ── AI Monograph handler ──────────────────────────────────────────────────
  const handleSearchAi = async (query: string) => {
    if (!query || query.trim().length < 2) return;
    setIsSearchingAi(true);
    try {
      const prompt = `You are a clinical pharmacist. Generate a professional drug monograph for: "${query.trim()}".
Return ONLY a valid JSON object with EXACTLY these keys (no extra text, no markdown):
{"product":"${query.trim().toUpperCase()}","indications":"...","dosage":"...","interactions":"...","counseling":"...","contraindications":"...","sideEffects":"...","storage":"..."}`;
      const result = await gql<{ askNexusAi: string }>(M_ASK_NEXUS_AI, { prompt });
      const raw = result.askNexusAi;
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s !== -1 && e !== -1) {
        const parsed = JSON.parse(raw.slice(s, e + 1));
        setAiMonographs(prev => [parsed, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      console.error('Monograph generation failed:', err);
    } finally {
      setIsSearchingAi(false);
    }
  };

  // ── Overview KPIs ─────────────────────────────────────────────────────────
  const overviewKpis = [
    { label: 'Active Outbreaks', value: '3', sub: 'Malaria · Cholera · Typhoid', color: c.danger, icon: AlertTriangle },
    { label: 'Supply Risk', value: 'HIGH', sub: 'Paracetamol API shortage', color: c.warning, icon: BadgeAlert },
    { label: 'NHIS Turnaround', value: '45d', sub: 'Improved by 12 days', color: c.accent, icon: Clock },
    { label: 'FDA Alerts', value: '2', sub: 'Counterfeit antimalarials', color: c.purple, icon: ShieldAlert },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2, color: c.primary },
    { id: 'market', label: 'Market Prices', icon: TrendingUp, color: '#F97316' },
    { id: 'disease', label: 'Disease Alerts', icon: AlertTriangle, color: c.danger },
    { id: 'drug', label: 'Drug Intelligence', icon: BrainCircuit, color: '#00D9FF' },
    { id: 'learning', label: 'Staff Learning', icon: GraduationCap, color: c.purple },
    { id: 'news', label: 'Market News', icon: Newspaper, color: c.primary },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-5 pb-20">

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl border overflow-x-auto" style={{ background: c.headerBg, borderColor: c.border }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: active ? c.bg : 'transparent',
                color: active ? tab.color : c.muted,
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                borderColor: active ? `${tab.color}30` : 'transparent',
                border: active ? `1px solid ${tab.color}25` : '1px solid transparent',
              }}>
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'disease' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewKpis.map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="p-4 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ background: `${k.color}18`, color: k.color }}>
                      <Icon size={14} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>{k.label}</p>
                  </div>
                  <p className="text-2xl font-black font-display mb-1" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[11px]" style={{ color: c.dim }}>{k.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Stock Warnings + Disease Alerts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Low Stock Alert */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: c.border, background: `${c.warning}0A` }}>
                <div className="flex items-center gap-2">
                  <Flame size={15} style={{ color: c.warning }} />
                  <p className="font-bold text-sm" style={{ color: c.text }}>Low Stock — Action Required</p>
                </div>
                <div className="flex items-center gap-2">
                  {outOfStockProducts.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.danger}20`, color: c.danger }}>{outOfStockProducts.length} out</span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.warning}20`, color: c.warning }}>{lowStockProducts.length} low</span>
                </div>
              </div>
              {lowStockProducts.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <CircleCheck size={28} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-500">All critical items stocked</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: c.border }}>
                  {lowStockProducts.map(p => (
                    <div key={p.id}
                      className="flex items-center justify-between px-5 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => router.push('/dashboard/inventory')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: p.stockQuantity <= 3 ? `${c.danger}18` : `${c.warning}18` }}>
                          <Pill size={14} style={{ color: p.stockQuantity <= 3 ? c.danger : c.warning }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: c.text }}>{p.name}</p>
                          <p className="text-[10px]" style={{ color: c.dim }}>{p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-black" style={{ color: p.stockQuantity <= 3 ? c.danger : c.warning }}>{p.stockQuantity} left</span>
                        <ChevronRight size={12} style={{ color: c.dim }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {lowStockProducts.length > 0 && (
                <div className="px-5 py-3 border-t" style={{ borderColor: c.border }}>
                  <button onClick={() => router.push('/dashboard/inventory')}
                    className="text-xs font-bold flex items-center gap-1" style={{ color: c.warning }}>
                    View all in Inventory <ArrowUpRight size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Disease Alerts Summary */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: c.border, background: `${c.danger}0A` }}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} style={{ color: c.danger }} />
                  <p className="font-bold text-sm" style={{ color: c.text }}>Active Disease Alerts</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: `${c.danger}20`, color: c.danger }}>Live</span>
              </div>
              <div className="divide-y" style={{ borderColor: c.border }}>
                {(data?.diseaseAlerts || []).map((alert: any) => (
                  <div key={alert.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-bold text-sm" style={{ color: c.text }}>{alert.disease}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: alert.level === 'WARNING' ? `${c.warning}20` : `${c.primary}20`, color: alert.level === 'WARNING' ? c.warning : c.primary }}>
                        {alert.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] mb-2" style={{ color: c.dim }}>
                      <span className="flex items-center gap-1"><MapPin size={10} />{alert.locations}</span>
                      <span className="flex items-center gap-1"><CalendarDays size={10} />{alert.date}</span>
                    </div>
                    <div className="p-2.5 rounded-lg text-[11px]" style={{ background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', color: c.warning }}>
                      <span className="font-bold">Action: </span>{alert.action}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t" style={{ borderColor: c.border }}>
                <button onClick={() => setActiveTab('disease')} className="text-xs font-bold flex items-center gap-1" style={{ color: c.danger }}>
                  View full alerts <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Regulatory Signals */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: c.border }}>
              <p className="font-bold text-sm flex items-center gap-2" style={{ color: c.text }}>
                <ShieldAlert size={15} style={{ color: c.purple }} /> Priority Regulatory & Industry Signals
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: c.border }}>
              {(data?.healthPulse?.signals || []).map((sig: any) => (
                <div key={sig.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: sig.type === 'Regulatory' ? `${c.purple}18` : sig.type === 'Epidemiological' ? `${c.danger}18` : `${c.primary}18`,
                      color: sig.type === 'Regulatory' ? c.purple : sig.type === 'Epidemiological' ? c.danger : c.primary }}>
                    {sig.type === 'Regulatory' ? <ShieldAlert size={14} /> : sig.type === 'Epidemiological' ? <Activity size={14} /> : <BookOpen size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.dim }}>{sig.source} · {sig.date}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${c.purple}18`, color: c.purple }}>{sig.type}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: c.text }}>{sig.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MARKET PRICES TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'market' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ background: `rgba(249,115,22,0.06)`, borderColor: `rgba(249,115,22,0.2)` }}>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 text-orange-500">
                <TrendingUp size={17} /> Ghana Pharma Market Intelligence
              </h3>
              <p className="text-xs mt-1" style={{ color: c.muted }}>Demand trends, pricing signals, and stock action for Ghana's pharmacy market.</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500">Updated Daily</span>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['All', 'Antimalarials', 'Antibiotics', 'Antidiabetics', 'Analgesics', 'Antihypertensives'].map(cat => (
              <button key={cat} onClick={() => setPriceCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: priceCategory === cat ? '#F97316' : c.cardBg,
                  color: priceCategory === cat ? '#fff' : c.muted,
                  border: `1px solid ${priceCategory === cat ? '#F97316' : c.border}`,
                }}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrices.map((p: any) => {
              const hasStock = !!p.inventoryProduct;
              const stockQty = p.inventoryProduct?.stockQuantity ?? 0;
              const stockStatus = !hasStock ? 'not-in-inventory' : stockQty === 0 ? 'out' : stockQty <= 10 ? 'low' : 'ok';
              return (
                <div key={p.id} className="p-5 rounded-2xl border transition-all hover:shadow-md" style={{ background: c.cardBg, borderColor: c.border }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-sm truncate" style={{ color: c.text }}>{p.name}</p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: c.dim }}>{p.category}</p>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: p.trend === 'Rising' ? `${c.danger}18` : p.trend === 'Falling' ? `${c.accent}18` : `${c.warning}18`,
                        color: p.trend === 'Rising' ? c.danger : p.trend === 'Falling' ? c.accent : c.warning,
                      }}>
                      {p.trend === 'Rising' ? <TrendingUp size={10} /> : p.trend === 'Falling' ? <TrendingDown size={10} /> : <Activity size={10} />}
                      {p.trend}
                    </span>
                  </div>

                  {/* Price Range */}
                  {p.prices && (
                    <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                      <BarChart2 size={12} style={{ color: c.muted }} />
                      <div className="flex gap-3 text-[10px] font-bold">
                        <span style={{ color: c.accent }}>Min: GH₵{p.prices.min}</span>
                        <span style={{ color: c.warning }}>Avg: GH₵{p.prices.avg}</span>
                        <span style={{ color: c.danger }}>Max: GH₵{p.prices.max}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs mb-3 leading-relaxed" style={{ color: c.muted }}>{p.description}</p>

                  {/* Inventory Link */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      {stockStatus === 'ok' && <><CircleCheck size={11} className="text-emerald-500" /><span className="text-emerald-500">In stock ({stockQty})</span></>}
                      {stockStatus === 'low' && <><AlertCircle size={11} style={{ color: c.warning }} /><span style={{ color: c.warning }}>Low stock ({stockQty})</span></>}
                      {stockStatus === 'out' && <><XCircle size={11} style={{ color: c.danger }} /><span style={{ color: c.danger }}>Out of stock</span></>}
                      {stockStatus === 'not-in-inventory' && <><Info size={11} style={{ color: c.dim }} /><span style={{ color: c.dim }}>Not in inventory</span></>}
                    </div>
                    {hasStock && (
                      <button onClick={() => router.push('/dashboard/inventory')}
                        className="text-[10px] font-bold flex items-center gap-1" style={{ color: c.primary }}>
                        View <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: c.dim }}>
                    <ArrowUpRight size={10} className="text-emerald-500" />
                    <span className="text-emerald-500">{p.source}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DISEASE ALERTS TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'disease' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ background: `${c.danger}08`, borderColor: `${c.danger}30` }}>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 text-red-500">
                <AlertTriangle size={17} /> Disease Outbreak Alerts — Ghana & West Africa
              </h3>
              <p className="text-xs mt-1" style={{ color: c.muted }}>Real-time surveillance from WHO, Ghana Health Service, and Ministry of Health.</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse bg-red-500/10 text-red-500">Live</span>
          </div>

          {/* Health Pulse KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(data?.healthPulse?.metrics || []).map((m: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.muted }}>{m.title}</p>
                <p className="text-xl font-black font-display mb-1" style={{ color: c.text }}>{m.value}</p>
                <p className="text-[10px] flex items-center gap-1" style={{ color: c.dim }}>
                  {m.trend === 'up' ? <TrendingUp size={10} className="text-red-500" /> : m.trend === 'down' ? <TrendingDown size={10} className="text-emerald-500" /> : <Activity size={10} style={{ color: c.warning }} />}
                  {m.description}
                </p>
              </div>
            ))}
          </div>

          {/* Alert Cards */}
          <div className="space-y-4">
            {(data?.diseaseAlerts || []).map((alert: any) => (
              <div key={alert.id} className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
                {/* Alert Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b"
                  style={{ borderColor: alert.level === 'WARNING' ? `${c.warning}30` : `${c.primary}30`, background: alert.level === 'WARNING' ? `${c.warning}08` : `${c.primary}08` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: alert.level === 'WARNING' ? `${c.warning}20` : `${c.primary}20`, color: alert.level === 'WARNING' ? c.warning : c.primary }}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: c.text }}>{alert.disease}</p>
                      <div className="flex items-center gap-3 text-[10px] mt-0.5" style={{ color: c.dim }}>
                        <span className="flex items-center gap-1"><MapPin size={9} />{alert.locations}</span>
                        <span className="flex items-center gap-1"><CalendarDays size={9} />{alert.date}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: alert.level === 'WARNING' ? `${c.warning}20` : `${c.primary}20`, color: alert.level === 'WARNING' ? c.warning : c.primary }}>
                    {alert.level}
                  </span>
                </div>
                {/* Alert Body */}
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm leading-relaxed" style={{ color: c.text }}>{alert.description}</p>
                  <div className="p-3.5 rounded-xl flex items-start gap-3" style={{ background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', border: `1px solid ${c.warning}25` }}>
                    <ShoppingCart size={15} style={{ color: c.warning, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: c.warning }}>Pharmacy Action Required</p>
                      <p className="text-xs leading-relaxed" style={{ color: c.text }}>{alert.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: c.dim }}>
                    <ArrowUpRight size={10} className="text-emerald-500" />
                    <span className="text-emerald-500 font-bold">{alert.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DRUG INTELLIGENCE TAB                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'drug' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Search */}
          <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: `rgba(0,217,255,0.2)` }}>
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit size={20} style={{ color: '#00D9FF' }} />
              <div>
                <h3 className="font-bold text-sm" style={{ color: c.text }}>AI Drug Intelligence</h3>
                <p className="text-[10px]" style={{ color: c.muted }}>Look up any drug — clinical monographs powered by Gemini AI</p>
              </div>
            </div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: c.muted }} />
                <input type="text" placeholder="e.g. Metformin, Amoxicillin, Artemether..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchAi(searchQuery); }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
                  style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', color: c.text, border: `1px solid ${c.border}` }} />
              </div>
              <button onClick={() => handleSearchAi(searchQuery)} disabled={isSearchingAi || searchQuery.length < 2}
                className="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                style={{ background: '#00D9FF', color: '#0F172A' }}>
                {isSearchingAi ? <><RefreshCw size={14} className="animate-spin" /> Analyzing...</> : <><BrainCircuit size={14} /> Search AI</>}
              </button>
            </div>
          </div>

          {/* AI Loading */}
          {isSearchingAi && (
            <div className="p-10 rounded-2xl border border-[#00D9FF]/20 text-center" style={{ background: 'rgba(0,217,255,0.04)' }}>
              <BrainCircuit size={36} className="text-[#00D9FF] mx-auto mb-3 animate-pulse" />
              <p className="font-bold text-sm text-[#00D9FF] mb-1">Compiling Clinical Monograph...</p>
              <p className="text-xs" style={{ color: c.muted }}>Parsing clinical studies, dosing guidelines, and contraindications</p>
            </div>
          )}

          {/* AI Results */}
          {aiMonographs.map((drug: any, i: number) => {
            const matchProd = products.find(p =>
              p.name.toLowerCase().includes(drug.product.toLowerCase().split(' ')[0]) ||
              (p.genericName || '').toLowerCase().includes(drug.product.toLowerCase().split(' ')[0])
            );
            return (
              <div key={i} className="rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500"
                style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
                  <div>
                    <span className="font-bold text-base text-emerald-400">{drug.product}</span>
                    {matchProd && (
                      <button onClick={() => router.push('/dashboard/inventory')}
                        className="ml-3 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.primary}18`, color: c.primary }}>
                        In your inventory ({matchProd.stockQuantity} units)
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI Monograph</span>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Indications', value: drug.indications, color: c.primary },
                    { label: 'Standard Dosage', value: drug.dosage, color: c.accent },
                    { label: 'Drug Interactions', value: drug.interactions, color: c.warning },
                    { label: 'Patient Counseling', value: drug.counseling, color: '#8B5CF6' },
                    { label: 'Contraindications', value: drug.contraindications, color: c.danger },
                    { label: 'Side Effects', value: drug.sideEffects, color: '#F97316' },
                    { label: 'Storage', value: drug.storage, color: c.primary },
                  ].filter(f => f.value).map((field, fi) => (
                    <div key={fi} className="p-3.5 rounded-xl" style={{ background: `${field.color}09`, border: `1px solid ${field.color}20` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: field.color }}>{field.label}</p>
                      <p className="text-xs leading-relaxed" style={{ color: c.text }}>{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Static monographs */}
          {!isSearchingAi && aiMonographs.length === 0 && (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: c.muted }}>Pre-loaded Monographs</p>
              {(data?.drugIntelligence || []).map((drug: any, i: number) => {
                const matchProd = products.find(p =>
                  p.name.toLowerCase().includes(drug.product.toLowerCase().split(' ')[0])
                );
                return (
                  <div key={i} className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: c.border }}>
                      <div>
                        <span className="font-bold text-sm" style={{ color: '#00D9FF' }}>{drug.product}</span>
                        {matchProd && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.accent}18`, color: c.accent }}>
                            {matchProd.stockQuantity} in stock
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#00D9FF]/10 text-[#00D9FF] font-bold">Static Monograph</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: 'Indications', value: drug.indications, color: c.primary },
                        { label: 'Dosage', value: drug.dosage, color: c.accent },
                        { label: 'Patient Counseling', value: drug.counseling, color: c.purple },
                        { label: 'Contraindications', value: drug.contraindications, color: c.danger },
                      ].map((f, fi) => (
                        <div key={fi} className="p-3 rounded-xl" style={{ background: `${f.color}09`, border: `1px solid ${f.color}20` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: f.color }}>{f.label}</p>
                          <p className="text-xs leading-relaxed" style={{ color: c.text }}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isSearchingAi && aiMonographs.length === 0 && searchQuery.length > 1 && (
            <div className="p-8 rounded-2xl border text-center" style={{ background: c.cardBg, borderColor: c.border }}>
              <p className="font-bold text-sm mb-1" style={{ color: c.text }}>No pre-loaded monograph for "{searchQuery}"</p>
              <p className="text-xs mb-4" style={{ color: c.muted }}>Click Search AI to generate one instantly with Gemini</p>
              <button onClick={() => handleSearchAi(searchQuery)} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#00D9FF', color: '#0F172A' }}>
                Generate AI Monograph
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STAFF LEARNING TAB                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'learning' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ background: `${c.purple}08`, borderColor: `${c.purple}25` }}>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: c.purple }}>
                <GraduationCap size={17} /> Staff Learning Centre
              </h3>
              <p className="text-xs mt-1" style={{ color: c.muted }}>Clinical drug education modules for pharmacy staff. Track your progress.</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black" style={{ color: c.purple }}>{completedLessons.size}/{data?.staffLearning?.length ?? 4}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.muted }}>completed</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${data?.staffLearning?.length ? (completedLessons.size / data.staffLearning.length) * 100 : 0}%`, background: `linear-gradient(90deg, ${c.purple}, #EC4899)` }} />
          </div>

          <div className="space-y-3">
            {(data?.staffLearning || []).map((module: any) => {
              const isExpanded = expandedLesson === module.id;
              const isDone = completedLessons.has(module.id);
              return (
                <div key={module.id} className="rounded-2xl border overflow-hidden transition-all"
                  style={{ background: c.cardBg, borderColor: isDone ? `${c.accent}30` : c.border }}>
                  <button className="w-full px-5 py-4 flex items-center gap-4 text-left"
                    onClick={() => setExpandedLesson(isExpanded ? null : module.id)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isDone ? `${c.accent}20` : `${c.purple}18`, color: isDone ? c.accent : c.purple }}>
                      {isDone ? <CheckCircle size={18} /> : <GraduationCap size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-sm" style={{ color: c.text }}>{module.title}</p>
                        {isDone && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-500">✓ Done</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: c.dim }}>
                        <span className="font-bold" style={{ color: c.purple }}>{module.level}</span>
                        <span className="flex items-center gap-1"><Clock size={9} />{module.duration}</span>
                        <span>{module.category}</span>
                      </div>
                    </div>
                    <ChevronDown size={16} style={{ color: c.muted, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t" style={{ borderColor: c.border }}>
                      <p className="text-sm leading-relaxed mt-4 mb-4" style={{ color: c.text }}>{module.description}</p>
                      <div className="flex gap-3">
                        <button onClick={() => setCompletedLessons(prev => { const n = new Set(prev); n.has(module.id) ? n.delete(module.id) : n.add(module.id); return n; })}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                          style={{ background: isDone ? `${c.muted}20` : `${c.purple}15`, color: isDone ? c.muted : c.purple, border: `1px solid ${isDone ? c.border : `${c.purple}30`}` }}>
                          {isDone ? 'Mark as Not Done' : 'Mark as Complete'}
                        </button>
                        <button onClick={() => { setActiveTab('drug'); setSearchQuery(module.title.split(' ')[0]); }}
                          className="px-4 py-2.5 rounded-xl text-sm font-bold"
                          style={{ background: '#00D9FF', color: '#0F172A' }}>
                          <BrainCircuit size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MARKET NEWS TAB                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'news' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ background: `${c.primary}08`, borderColor: `${c.primary}25` }}>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: c.primary }}>
                <Newspaper size={17} /> Ghana & Global Pharma News
              </h3>
              <p className="text-xs mt-1" style={{ color: c.muted }}>WHO directives, FDA announcements, supply chain shifts and NHIS updates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.news || []).map((n: any) => (
              <div key={n.id} className="p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer group"
                style={{ background: c.cardBg, borderColor: n.urgency === 'critical' ? `${c.danger}25` : c.border }}>
                {n.urgency === 'critical' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 mb-3 px-2.5 py-1.5 rounded-lg w-fit" style={{ background: `${c.danger}10` }}>
                    <Flame size={10} /> CRITICAL ALERT
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${c.primary}15`, color: c.primary }}>{n.source}</span>
                  <span className="text-[10px]" style={{ color: c.dim }}>{n.time}</span>
                </div>
                <p className="font-bold text-sm leading-snug mb-3" style={{ color: c.text }}>{n.title}</p>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: c.border }}>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ background: n.urgency === 'critical' ? `${c.danger}15` : n.urgency === 'high' ? `${c.warning}15` : `${c.accent}15`,
                      color: n.urgency === 'critical' ? c.danger : n.urgency === 'high' ? c.warning : c.accent }}>
                    {n.urgency === 'critical' ? '⚠ Critical' : n.urgency === 'high' ? '↑ High Priority' : '· Normal'}
                  </span>
                  <ArrowUpRight size={14} style={{ color: c.dim }} className="group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
