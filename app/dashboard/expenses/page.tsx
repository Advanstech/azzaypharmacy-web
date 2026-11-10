'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { 
  DollarSign, Plus, Search, CreditCard, Wallet, Landmark,
  CheckCircle, XCircle, Upload, ExternalLink, X, FileText, Trash2
} from 'lucide-react';
import { useCustomAuth } from '@/lib/custom-auth';
import { useStore } from '@/lib/store';
import { gql } from '@/lib/gql';
import { Q_AUTHORIZATIONS_EXPENSE, M_UPDATE_EXPENSE_STATUS } from '@/lib/gql';
import { getPendingSales } from '@/lib/offline';
import { onSyncEvent } from '@/lib/tauri-sync';
import { isTauri, nativeListQueue } from '@/lib/tauri-native';
import { useBranch, useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';
import { Portal } from '@/components/portal';
import {
  validateExpenseAttachment,
  isSafeExpenseAttachmentUrl,
  type ExpenseAttachmentFiles,
  type ExpenseAttachmentKind,
  type QueuedExpenseAttachment,
} from '@/lib/expense-attachments';

type ExpenseRecord = {
  id: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  branchId?: string;
  category?: { id: string; name: string };
  requestedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
  receiptUrl?: string;
  invoiceUrl?: string;
  paymentReceiptUrl?: string;
  queued?: boolean;
};

function expenseDescriptionSuggestions(category: string): string[] {
  const name = category.toLowerCase();
  if (/devops/.test(name)) return ['Infrastructure monitoring subscription', 'Deployment and CI/CD tools', 'Database backup service'];
  if (/server|hosting|subscription/.test(name)) return ['Monthly application hosting', 'Domain name renewal', 'Cloud database subscription'];
  if (/water|electric|utility|utilities/.test(name)) return ['Electricity bill for the pharmacy', 'Water bill for the pharmacy', 'Internet service payment'];
  if (/transport|delivery|logistic|fuel/.test(name)) return ['Supplier delivery transport', 'Fuel for stock collection', 'Courier delivery charges'];
  if (/staff|perk|food|lunch|allowance/.test(name)) return ['Staff lunch allowance', 'Staff transport allowance', 'Overtime meal expenses'];
  if (/maintenance|repair/.test(name)) return ['Equipment repair and servicing', 'Pharmacy premises maintenance', 'Printer maintenance'];
  return ['Cleaning supplies for the pharmacy', 'Drinking water for staff', 'Office stationery purchase', 'Minor operational supplies'];
}

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

function buildQueuedExpense(
  id: string,
  variables: Record<string, unknown>,
  user: { id?: string; name?: string } | null | undefined,
  categories: { id: string; name: string }[],
): ExpenseRecord | null {
  if (
    typeof variables.amount !== 'number'
    || typeof variables.description !== 'string'
    || typeof variables.date !== 'string'
  ) return null;

  const localFiles = variables._offlineAttachments as
    | Partial<Record<ExpenseAttachmentKind, QueuedExpenseAttachment>>
    | undefined;
  const categoryId = typeof variables.categoryId === 'string' ? variables.categoryId : '';
  return {
    id,
    amount: variables.amount,
    description: variables.description,
    date: variables.date,
    branchId: typeof variables.branchId === 'string' ? variables.branchId : undefined,
    category: categories.find(category => category.id === categoryId),
    requestedBy: { id: user?.id || '', name: user?.name || 'Unknown' },
    receiptUrl: typeof variables.receiptUrl === 'string'
      ? variables.receiptUrl
      : localFiles?.receiptUrl?.dataUrl,
    invoiceUrl: typeof variables.invoiceUrl === 'string'
      ? variables.invoiceUrl
      : localFiles?.invoiceUrl?.dataUrl,
    paymentReceiptUrl: typeof variables.paymentReceiptUrl === 'string'
      ? variables.paymentReceiptUrl
      : localFiles?.paymentReceiptUrl?.dataUrl,
    status: 'PENDING',
    queued: true,
  };
}

export default function ExpensesPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user } = useCustomAuth();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { me, expenses: storeExpenses, expenseCategories, refetchExpenseCategories, requestExpense } = useStore();
  const role = me?.role || user?.role || user?.user_metadata?.role;
  const isManager = ['SE_ADMIN', 'ROOT', 'OWNER', 'MANAGER'].includes(role || '');
  const canApproveAcrossBranches = ['SE_ADMIN', 'ROOT', 'OWNER'].includes(role || '');

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  };

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const branchFilter = useBranchFilter();
  const { activeBranchId } = useBranch();
  const [pageSelection, setPageSelection] = useState({ branchId: activeBranchId, page: 1 });
  const page = pageSelection.branchId === activeBranchId ? pageSelection.page : 1;
  const [totalPages, setTotalPages] = useState(1);
  const [syncVersion, setSyncVersion] = useState(0);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [newExp, setNewExp] = useState({
    amount: '',
    desc: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
  });
  const [attachments, setAttachments] = useState<ExpenseAttachmentFiles>({});
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    let allExp: ExpenseRecord[] = storeExpenses;
    try {
      const data = await gql<{ expenses?: { items: ExpenseRecord[]; totalPages?: number } }>(
        Q_AUTHORIZATIONS_EXPENSE,
        { page, limit, branchId: isManager ? (activeBranchId ?? undefined) : undefined },
      );
      const response = data.expenses;
      allExp = response?.items || [];
      setTotalPages(response?.totalPages || 1);
    } catch (err) {
      console.error(err);
    }

    const queuedExpenses: ExpenseRecord[] = [];
    try {
      const queuedRows = await getPendingSales();
      for (const row of queuedRows) {
        if (row.cashier_id !== me?.id || !/RequestExpense|CreateExpense/.test(row.op?.mutation || '')) continue;
        const queued = buildQueuedExpense(row.id, row.op?.variables ?? {}, me, expenseCategories);
        if (queued) queuedExpenses.push(queued);
      }
      if (isTauri()) {
        const nativeRows = await nativeListQueue('pending');
        for (const row of nativeRows) {
          if (!/RequestExpense|CreateExpense/.test(row.mutation || '')) continue;
          try {
            const variables = JSON.parse(row.variables) as Record<string, unknown>;
            if (variables._syncOwnerId === me?.id) {
              const queued = buildQueuedExpense(row.id, variables, me, expenseCategories);
              if (queued) queuedExpenses.push(queued);
            }
          } catch (error) {
            console.error(`[expenses] Could not restore queued request ${row.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[expenses] Could not restore queued requests:', error);
    } finally {
      if (!isManager) allExp = allExp.filter(expense => expense.requestedBy?.id === me?.id);
      const seenIds = new Set(allExp.map(expense => expense.id));
      setExpenses([...queuedExpenses.filter(expense => !seenIds.has(expense.id)), ...allExp]);
    }
  }, [activeBranchId, expenseCategories, isManager, limit, me, page, storeExpenses]);

  useEffect(() => {
    if (expenseCategories.length === 0) refetchExpenseCategories();
  }, [expenseCategories.length, refetchExpenseCategories]);

  useEffect(() => {
    // This starts an asynchronous API/cache refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchExpenses();
  }, [fetchExpenses, syncVersion]);

  useEffect(() => onSyncEvent(event => {
    if (event.type === 'sync:complete') setSyncVersion(version => version + 1);
  }), []);

  const handleUpdateStatus = async (id: string, status: string) => {
    setProcessingId(id);
    try {
      await gql(M_UPDATE_EXPENSE_STATUS, { id, status });
      fetchExpenses(); // Re-fetch to update status and approver name
    } catch (err) {
      console.error('Failed to update status', err);
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestExpense = async () => {
    setSubmitting(true);
    try {
      const created = await requestExpense({
        branchId: canApproveAcrossBranches ? (activeBranchId || me?.branchId || undefined) : (me?.branchId || undefined),
        categoryId: newExp.categoryId || expenseCategories[0]?.id || '',
        amount: Number(newExp.amount),
        description: newExp.desc.trim(),
        date: new Date(`${newExp.date}T12:00:00`).toISOString(),
        attachments,
      });
      setExpenses(current => [created, ...current]);
      setShowModal(false);
      setNewExp({
        amount: '',
        desc: '',
        date: new Date().toISOString().split('T')[0],
        categoryId: expenseCategories[0]?.id || '',
      });
      setAttachments({});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not submit the expense request.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayExpenses = branchFilter(expenses).filter(e => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (e.description || '').toLowerCase().includes(q) ||
      (e.category?.name || '').toLowerCase().includes(q) ||
      (e.requestedBy?.name || '').toLowerCase().includes(q) ||
      (e.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BranchBanner />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Operational Expenses</h1>
          <p className="text-sm" style={{ color: c.muted }}>Track utility, logistics, and miscellaneous pharmacy costs</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
          style={{ background: c.primary, color: isDark ? '#060B14' : '#fff' }}>
          <Plus size={18} />
          Request Expense
        </button>
      </div>

      {isManager && (() => {
        // Calculate real KPIs from branch-filtered store expenses
        const branchExpenses = branchFilter(storeExpenses);
        const now = new Date();
        const thisMonthExp = branchExpenses.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status === 'APPROVED';
        });
        
        const totalMonth = thisMonthExp.reduce((sum, e) => sum + Number(e.amount), 0);
        
        const getCatSum = (keywords: string[]) => thisMonthExp
          .filter(e => keywords.some(k => (e.category?.name || '').toLowerCase().includes(k) || (e.description || '').toLowerCase().includes(k)))
          .reduce((sum, e) => sum + Number(e.amount), 0);
          
        const utilities = getCatSum(['util', 'water', 'electric']);
        const logistics = getCatSum(['logistic', 'delivery', 'transport', 'fuel']);
        const staffPerks = getCatSum(['staff', 'perk', 'lunch', 'food', 'allowance']);

        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Month', value: `GH₵ ${totalMonth.toFixed(2)}`, sub: 'Approved expenses', icon: DollarSign, color: '#EF4444' },
            { label: 'Utilities', value: `GH₵ ${utilities.toFixed(2)}`, sub: 'Electricity & Water', icon: Landmark, color: '#0EA5E9' },
            { label: 'Logistics', value: `GH₵ ${logistics.toFixed(2)}`, sub: 'Supplier deliveries & Fuel', icon: CreditCard, color: '#F59E0B' },
            { label: 'Staff Perks', value: `GH₵ ${staffPerks.toFixed(2)}`, sub: 'Lunch & Allowances', icon: Wallet, color: '#10B981' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: `${k.color}15`, color: k.color }}><k.icon size={18} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.muted }}>{k.label}</p>
                  <p className="text-lg font-black" style={{ color: c.text }}>{k.value}</p>
                  <p className="text-[10px]" style={{ color: c.muted }}>{k.sub}</p>
                </div>
              </div>
            </div>
          ))}
          </div>
        );
      })()}

      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
          <h3 className="font-display text-sm font-bold" style={{ color: c.text }}>Expense Requests</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: c.muted }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="pl-9 pr-4 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }}
              />
            </div>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: c.border }}>
          {displayExpenses.map((e) => (
            <div key={e.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
              <div className="flex items-center gap-4">
                <div className="text-xs font-mono" style={{ color: c.muted }}>{new Date(e.date).toLocaleDateString()}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: c.text }}>{e.description}</p>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase"
                      style={{ 
                        background: e.status === 'APPROVED' ? `${c.success}20` : e.status === 'REJECTED' ? `${c.danger}20` : `${c.warning}20`,
                        color: e.status === 'APPROVED' ? c.success : e.status === 'REJECTED' ? c.danger : c.warning
                      }}>
                      {e.status}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                    {e.category?.name || 'General'} • Requested by <span className="text-emerald-400">{e.requestedBy?.name || 'Unknown'}</span>
                    {e.approvedBy && (
                      <span className="ml-2 border-l pl-2" style={{ borderColor: c.border }}>
                        {e.status === 'APPROVED' ? 'Approved' : 'Rejected'} by{' '}
                        <span style={{ color: c.primary }}>{e.approvedBy.name}</span>
                      </span>
                    )}
                    {e.queued && <span className="ml-2 border-l pl-2 text-amber-500" style={{ borderColor: c.border }}>Queued for sync</span>}
                  </p>
                  {(e.receiptUrl || e.invoiceUrl || e.paymentReceiptUrl) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {([
                        ['Receipt', e.receiptUrl],
                        ['Invoice', e.invoiceUrl],
                        ['Payment receipt', e.paymentReceiptUrl],
                      ] as [string, string | undefined][]).filter(([, url]) => (
                        typeof url === 'string' && isSafeExpenseAttachmentUrl(url, Boolean(e.queued))
                      )).map(([label, url]) => (
                        <a
                          key={label}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold"
                          style={{ borderColor: c.border, color: c.primary }}
                        >
                          <ExternalLink size={11} />
                          {label}{e.queued ? ' (queued)' : ''}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: c.danger }}>- GH₵ {Number(e.amount).toFixed(2)}</p>
                </div>
                {isManager
                  && e.status === 'PENDING'
                  && e.requestedBy?.id !== me?.id
                  && (canApproveAcrossBranches || e.branchId === me?.branchId)
                  && (
                  <div className="flex gap-2">
                    <button disabled={processingId === e.id} onClick={() => handleUpdateStatus(e.id, 'APPROVED')} aria-label="Approve expense" className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500 transition-colors disabled:opacity-50">
                      <CheckCircle size={18} />
                    </button>
                    <button disabled={processingId === e.id} onClick={() => handleUpdateStatus(e.id, 'REJECTED')} aria-label="Reject expense" className="p-1 rounded-md hover:bg-rose-500/20 text-rose-500 transition-colors disabled:opacity-50">
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
          <button 
            disabled={page <= 1}
          onClick={() => setPageSelection({ branchId: activeBranchId, page: Math.max(1, page - 1) })}
            className="text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={{ color: c.primary }}>
            Previous
          </button>
          <span className="text-xs font-bold" style={{ color: c.muted }}>Page {page} of {totalPages}</span>
          <button 
            disabled={page >= totalPages || totalPages === 0}
            onClick={() => setPageSelection({ branchId: activeBranchId, page: page + 1 })}
            className="text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={{ color: c.primary }}>
            Next
          </button>
        </div>
      </div>
      {/* Request Modal */}
      {showModal && (
        <Portal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            style={{ background: 'rgba(2, 6, 23, 0.72)', backdropFilter: 'blur(12px)' }}
            onClick={() => !submitting && setShowModal(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(148,163,184,0.18)' : '#E2E8F0',
              }}
            >
              {/* Modal Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between shrink-0"
                style={{
                  borderColor: isDark ? 'rgba(148,163,184,0.14)' : '#E2E8F0',
                  background: isDark ? 'rgba(30,41,59,0.55)' : '#F8FAFC',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${c.primary}20`, color: c.primary }}
                  >
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold leading-tight" style={{ color: c.text }}>
                      Request Expense
                    </h3>
                    <p className="text-[11px]" style={{ color: c.muted }}>
                      Log an operational expense for branch review & approval
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.muted }}>
                      Category *
                    </label>
                    <select
                      value={newExp.categoryId || expenseCategories[0]?.id || ''}
                      onChange={e => setNewExp({ ...newExp, categoryId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                      style={{
                        background: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(148,163,184,0.2)' : '#CBD5E1',
                        color: c.text,
                      }}
                      required
                    >
                      <option value="" disabled>Select a category</option>
                      {expenseCategories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.muted }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newExp.date}
                      onChange={e => setNewExp({ ...newExp, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                      style={{
                        background: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(148,163,184,0.2)' : '#CBD5E1',
                        color: c.text,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.muted }}>
                    Amount (GH₵) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newExp.amount}
                    onChange={e => setNewExp({ ...newExp, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                    style={{
                      background: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(148,163,184,0.2)' : '#CBD5E1',
                      color: c.text,
                    }}
                    placeholder="e.g. 50.00"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.muted }}>
                    Description *
                  </label>
                  <textarea
                    id="expense-description"
                    aria-label="Expense description"
                    aria-describedby="expense-description-help"
                    rows={3}
                    value={newExp.desc}
                    onFocus={() => setShowDescriptionSuggestions(true)}
                    onClick={() => setShowDescriptionSuggestions(true)}
                    onChange={e => setNewExp({ ...newExp, desc: e.target.value })}
                    className="w-full min-h-24 resize-y px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                    style={{
                      background: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(148,163,184,0.2)' : '#CBD5E1',
                      color: c.text,
                    }}
                    placeholder="Describe the expense, purpose, and any relevant details…"
                  />
                  <p id="expense-description-help" className="mt-1 text-[11px]" style={{ color: c.muted }}>
                    Write your own description or choose a suggestion and customise it. Drag the bottom corner to expand.
                  </p>
                  {showDescriptionSuggestions && (
                    <div className="mt-2 rounded-xl border p-3" style={{ borderColor: c.border }}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold" style={{ color: c.muted }}>Suggested descriptions</p>
                        <button type="button" onClick={() => setShowDescriptionSuggestions(false)} className="text-xs font-semibold" style={{ color: c.primary }}>
                          Hide
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {expenseDescriptionSuggestions(expenseCategories.find(category => category.id === (newExp.categoryId || expenseCategories[0]?.id))?.name || '').map(suggestion => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setNewExp(current => ({ ...current, desc: suggestion }));
                              document.getElementById('expense-description')?.focus();
                            }}
                            className="rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:bg-sky-500/10 focus-visible:outline-2 focus-visible:outline-sky-500"
                            style={{ borderColor: c.border, color: c.text }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Supporting Documents */}
                <div
                  className="rounded-xl border p-3.5 space-y-2.5"
                  style={{
                    borderColor: isDark ? 'rgba(148,163,184,0.18)' : '#E2E8F0',
                    background: isDark ? 'rgba(30,41,59,0.4)' : '#F8FAFC',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: c.text }}>
                      Supporting documents <span className="font-normal" style={{ color: c.muted }}>(optional)</span>
                    </p>
                    <span className="text-[10px]" style={{ color: c.muted }}>Max 5 MB each</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {([
                      ['receiptUrl', 'Receipt'],
                      ['invoiceUrl', 'Invoice'],
                      ['paymentReceiptUrl', 'Payment receipt'],
                    ] as [ExpenseAttachmentKind, string][]).map(([kind, label]) => {
                      const selectedFile = attachments[kind];
                      const inputId = `expense-file-${kind}`;
                      return (
                        <div
                          key={kind}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                          style={{
                            borderColor: selectedFile ? `${c.primary}60` : (isDark ? 'rgba(148,163,184,0.16)' : '#CBD5E1'),
                            background: isDark ? '#0F172A' : '#FFFFFF',
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText size={14} style={{ color: selectedFile ? c.primary : c.muted }} className="shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold leading-tight" style={{ color: c.text }}>{label}</p>
                              <p className="text-[10px] truncate" style={{ color: selectedFile ? c.primary : c.muted }}>
                                {selectedFile
                                  ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)`
                                  : 'No file chosen'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedFile && (
                              <button
                                type="button"
                                onClick={() => setAttachments(current => {
                                  const next = { ...current };
                                  delete next[kind];
                                  return next;
                                })}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                title="Remove file"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <label
                              htmlFor={inputId}
                              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors hover:opacity-85"
                              style={{
                                borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#CBD5E1',
                                background: isDark ? '#1E293B' : '#F1F5F9',
                                color: c.text,
                              }}
                            >
                              <Upload size={12} />
                              {selectedFile ? 'Change' : 'Choose'}
                            </label>
                            <input
                              id={inputId}
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              onChange={event => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                try {
                                  validateExpenseAttachment(file);
                                  setAttachments(current => ({ ...current, [kind]: file }));
                                } catch (error) {
                                  event.target.value = '';
                                  alert(error instanceof Error ? error.message : 'Invalid attachment.');
                                }
                              }}
                              className="hidden"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] leading-relaxed" style={{ color: c.muted }}>
                    PDF, JPEG, PNG, or WebP. Uploaded securely when online or queued with the request while offline.
                  </p>
                </div>
              </div>

              {/* Sticky Footer */}
              <div
                className="px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0"
                style={{
                  borderColor: isDark ? 'rgba(148,163,184,0.14)' : '#E2E8F0',
                  background: isDark ? 'rgba(30,41,59,0.55)' : '#F8FAFC',
                }}
              >
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{
                    borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#CBD5E1',
                    color: c.text,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestExpense}
                  disabled={submitting || !(activeBranchId || me?.branchId) || !(newExp.categoryId || expenseCategories[0]?.id) || !newExp.amount || Number(newExp.amount) <= 0 || !newExp.desc.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50"
                  style={{ background: c.primary, color: isDark ? '#060B14' : '#FFFFFF' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
