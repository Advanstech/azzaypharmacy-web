'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  ArrowLeft, Download, Receipt, Search, ChevronLeft, ChevronRight,
  CheckCircle, Clock, XCircle, TrendingDown, Tag, Calendar,
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

const STATUS_META: Record<string, { color: string; icon: typeof CheckCircle }> = {
  APPROVED: { color: '#10B981', icon: CheckCircle },
  PENDING:  { color: '#F59E0B', icon: Clock },
  REJECTED: { color: '#EF4444', icon: XCircle },
};

export default function ExpenseReportPage() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { expenses, refetchExpenses } = useStore();

  useEffect(() => {
    if (expenses.length === 0) refetchExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setCurrentPage(1);
  };

  const uniqueCategories = useMemo(() => {
    const s = new Set(expenses.map(e => e.category?.name || 'Uncategorized'));
    return ['All', ...Array.from(s).sort()];
  }, [expenses]);

  const uniqueStatuses = useMemo(() => {
    const s = new Set(expenses.map(e => e.status));
    return ['All', ...Array.from(s)];
  }, [expenses]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : 0;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;

    let list = expenses.filter(e => {
      const t = new Date(e.date || e.createdAt).getTime();
      return t >= from && t <= to;
    });

    if (statusFilter !== 'All') list = list.filter(e => e.status === statusFilter);
    if (categoryFilter !== 'All') list = list.filter(e => (e.category?.name || 'Uncategorized') === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.category?.name || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
      else if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount);
      else if (sortField === 'category') cmp = (a.category?.name || '').localeCompare(b.category?.name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [expenses, dateFrom, dateTo, statusFilter, categoryFilter, search, sortField, sortDir]);

  // KPIs
  const kpis = useMemo(() => {
    const approved = filtered.filter(e => e.status === 'APPROVED');
    const total = approved.reduce((s, e) => s + Number(e.amount), 0);
    const pending = filtered.filter(e => e.status === 'PENDING').reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    approved.forEach(e => {
      const cat = e.category?.name || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
    });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return { total, pending, count: filtered.length, approvedCount: approved.length, topCategory };
  }, [filtered]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginated = filtered.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    const left = Math.max(2, safeCurrentPage - 1);
    const right = Math.min(totalPages - 1, safeCurrentPage + 1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  const handleExport = () => {
    const rows: (string | number | boolean | null | undefined)[][] = [
      ['EXPENSE REPORT'],
      ['Period:', `${dateFrom} to ${dateTo}`],
      ['Generated:', new Date().toLocaleString('en-GB')],
      [''],
      ['Date', 'Category', 'Description', 'Amount (GH₵)', 'Status'],
      ...filtered.map(e => [
        new Date(e.date || e.createdAt).toLocaleDateString('en-GB'),
        e.category?.name || 'Uncategorized',
        e.description || '',
        Number(e.amount).toFixed(2),
        e.status,
      ]),
      [''],
      ['APPROVED TOTAL', kpis.total.toFixed(2)],
      ['PENDING TOTAL', kpis.pending.toFixed(2)],
    ];
    downloadCSV(`expense-report-${dateFrom}-to-${dateTo}.csv`, rows);
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
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  if (!mounted) return null;

  const SortBtn = ({ field, label }: { field: typeof sortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 select-none hover:opacity-70"
      style={{ color: sortField === field ? card.primary : card.subtle }}>
      {label}
      {sortField === field
        ? <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>
        : <span className="text-[10px] opacity-30">↕</span>}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/reports')}
            className="p-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
            <ArrowLeft size={20} style={{ color: card.text }} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: card.text }}>
              <Receipt size={22} style={{ color: '#F97316' }} />
              Expense Report
            </h1>
            <p className="text-sm" style={{ color: card.muted }}>
              {kpis.approvedCount} approved · GH₵ {kpis.total.toFixed(2)} total
            </p>
          </div>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primary}30` }}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Approved Total', value: `GH₵ ${kpis.total.toFixed(2)}`, icon: TrendingDown, color: card.danger },
          { label: 'Pending Amount', value: `GH₵ ${kpis.pending.toFixed(2)}`, icon: Clock, color: card.warning },
          { label: 'Total Entries', value: String(kpis.count), icon: Receipt, color: '#F97316' },
          { label: 'Top Category', value: kpis.topCategory?.[0] || 'N/A', icon: Tag, color: '#A855F7' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl border p-3" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: card.subtle }}>{k.label}</span>
            </div>
            <p className="font-display text-lg font-bold truncate" style={{ color: k.color }}>{k.value}</p>
            {k.label === 'Top Category' && kpis.topCategory && (
              <p className="text-[10px] mt-0.5" style={{ color: card.muted }}>GH₵ {kpis.topCategory[1].toFixed(2)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Date + Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl border" style={{ background: card.bg, borderColor: card.border }}>
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: card.primary }} />
          <label className="text-xs" style={{ color: card.muted }}>From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none"
            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: card.muted }}>To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none"
            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
        </div>
        <div className="flex gap-1.5">
          {[
            { l: 'This Month', fn: () => { setDateFrom(firstOfMonth); setDateTo(todayStr); } },
            { l: 'All Time', fn: () => { setDateFrom(''); setDateTo(''); } },
          ].map(q => (
            <button key={q.l} onClick={() => { q.fn(); setCurrentPage(1); }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: card.primaryBg, color: card.primary }}>
              {q.l}
            </button>
          ))}
        </div>
        <div className="w-px self-stretch" style={{ background: card.border }} />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: card.muted }} />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search description or category…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm border outline-none"
            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 rounded-lg text-sm border outline-none"
          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 rounded-lg text-sm border outline-none"
          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: card.border, color: card.text }}>
          {uniqueCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
        </select>
        <span className="flex items-center text-xs font-bold px-3 py-1.5 rounded-lg self-center"
          style={{ background: `${card.primary}15`, color: card.primary }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Category Summary Bar */}
      {filtered.filter(e => e.status === 'APPROVED').length > 0 && (() => {
        const byCategory: Record<string, number> = {};
        filtered.filter(e => e.status === 'APPROVED').forEach(e => {
          const cat = e.category?.name || 'Uncategorized';
          byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
        });
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        const max = sorted[0][1];
        const colors = ['#F97316', '#A855F7', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
        return (
          <div className="rounded-xl border p-4 space-y-3" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Approved Spend by Category</h3>
            <div className="space-y-2">
              {sorted.map(([cat, amt], i) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs w-32 truncate shrink-0" style={{ color: card.text }}>{cat}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(amt / max) * 100}%`, background: colors[i % colors.length] }} />
                  </div>
                  <span className="text-xs font-mono font-bold shrink-0" style={{ color: colors[i % colors.length] }}>
                    GH₵ {amt.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        {/* Header */}
        <div className="grid grid-cols-[120px_160px_1fr_120px_100px] gap-3 px-4 py-3 border-b text-xs font-bold uppercase tracking-wider"
          style={{ background: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC', borderColor: card.border }}>
          <SortBtn field="date" label="Date" />
          <SortBtn field="category" label="Category" />
          <span style={{ color: card.subtle }}>Description</span>
          <SortBtn field="amount" label="Amount" />
          <span style={{ color: card.subtle }}>Status</span>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center" style={{ color: card.muted }}>
            <Receipt size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No expenses found</p>
            <p className="text-xs mt-1">Try adjusting filters or date range</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: card.border }}>
            {paginated.map(e => {
              const meta = STATUS_META[e.status] || { color: card.muted, icon: Clock };
              const StatusIcon = meta.icon;
              return (
                <div key={e.id} className="grid grid-cols-[120px_160px_1fr_120px_100px] gap-3 px-4 py-3 items-center hover:bg-white/5 transition-colors">
                  <span className="text-xs font-mono" style={{ color: card.muted }}>
                    {new Date(e.date || e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full w-fit"
                    style={{ background: '#A855F715', color: '#A855F7' }}>
                    {e.category?.name || 'Uncategorized'}
                  </span>
                  <span className="text-sm truncate" style={{ color: card.text }}>
                    {e.description || <span style={{ color: card.subtle }}>—</span>}
                  </span>
                  <span className="text-sm font-bold font-mono text-right" style={{ color: card.danger }}>
                    -GH₵ {Number(e.amount).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={13} style={{ color: meta.color }} />
                    <span className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>{e.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t"
          style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: card.muted }}>
              {filtered.length === 0
                ? 'No results'
                : `Showing ${(safeCurrentPage - 1) * itemsPerPage + 1}–${Math.min(safeCurrentPage * itemsPerPage, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: card.muted }}>Per page:</span>
              <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 rounded-lg text-xs border outline-none"
                style={{ background: card.bg, borderColor: card.border, color: card.text }}>
                {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronLeft size={15} style={{ color: card.text }} />
              </button>
              {pageNumbers.map((pg, idx) =>
                pg === '...'
                  ? <span key={`e${idx}`} className="px-1 text-sm" style={{ color: card.subtle }}>…</span>
                  : <button key={pg} onClick={() => setCurrentPage(pg as number)}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: safeCurrentPage === pg ? card.primary : card.bg,
                        color: safeCurrentPage === pg ? (isDark ? '#060B14' : '#fff') : card.text,
                        border: `1px solid ${safeCurrentPage === pg ? card.primary : card.border}`,
                      }}>
                      {pg}
                    </button>
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <ChevronRight size={15} style={{ color: card.text }} />
              </button>
            </div>
          )}
          <span className="text-xs font-bold" style={{ color: card.danger }}>
            Approved total: GH₵ {filtered.filter(e => e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
