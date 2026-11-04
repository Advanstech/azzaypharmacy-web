'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { 
  DollarSign, Plus, Search, CreditCard, Wallet, Landmark,
  CheckCircle, XCircle, Upload, ExternalLink
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

  const displayExpenses = branchFilter(expenses);

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
              <input type="text" placeholder="Search expenses..." className="pl-9 pr-4 py-1.5 rounded-lg text-xs outline-none" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[32px] border shadow-2xl p-6" style={{ background: c.bg, borderColor: c.border }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl font-bold" style={{ color: c.text }}>Request Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-slate-500/10" style={{ color: c.muted }}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: c.text }}>Category</label>
                <select
                  value={newExp.categoryId || expenseCategories[0]?.id || ''}
                  onChange={e => setNewExp({ ...newExp, categoryId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none"
                  style={{ borderColor: c.border, color: c.text }}
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {expenseCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: c.text }}>Amount (GH₵)</label>
                <input 
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newExp.amount}
                  onChange={e => setNewExp({...newExp, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none"
                  style={{ borderColor: c.border, color: c.text }}
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: c.text }}>Description</label>
                <input 
                  type="text"
                  value={newExp.desc}
                  onChange={e => setNewExp({...newExp, desc: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none"
                  style={{ borderColor: c.border, color: c.text }}
                  placeholder="e.g. Water for the pharmacy"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: c.text }}>Date</label>
                <input 
                  type="date"
                  value={newExp.date}
                  onChange={e => setNewExp({...newExp, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none"
                  style={{ borderColor: c.border, color: c.text }}
                />
              </div>
              <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: c.border }}>
                <p className="text-xs font-bold" style={{ color: c.text }}>Supporting documents (optional)</p>
                {([
                  ['receiptUrl', 'Receipt'],
                  ['invoiceUrl', 'Invoice'],
                  ['paymentReceiptUrl', 'Payment receipt'],
                ] as [ExpenseAttachmentKind, string][]).map(([kind, label]) => (
                  <label key={kind} className="flex items-center justify-between gap-3 text-xs" style={{ color: c.muted }}>
                    <span className="flex min-w-32 items-center gap-2">
                      <Upload size={14} />
                      {label}
                    </span>
                    <input
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
                      className="max-w-[65%] text-[10px]"
                    />
                  </label>
                ))}
                <p className="text-[10px]" style={{ color: c.muted }}>PDF, JPEG, PNG, or WebP; up to 5 MB each. Attachments are securely uploaded when online or queued with the request while offline.</p>
              </div>

              <button 
                onClick={handleRequestExpense}
                disabled={submitting || !(activeBranchId || me?.branchId) || !(newExp.categoryId || expenseCategories[0]?.id) || !newExp.amount || Number(newExp.amount) <= 0 || !newExp.desc.trim()}
                className="w-full py-3 mt-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                style={{ background: c.primary, color: '#fff' }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
