'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  DollarSign, Receipt, TrendingDown, Calendar, Plus, Search, 
  Filter, ArrowDownRight, CreditCard, Wallet, Smartphone, Landmark,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { gql } from '@/lib/gql';
import { Q_AUTHORIZATIONS_EXPENSE, M_REQUEST_EXPENSE } from '@/lib/gql';

export default function ExpensesPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const { me } = useStore();
  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

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

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newExp, setNewExp] = useState({ amount: '', desc: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [me]);

  const fetchExpenses = async () => {
    try {
      const data = await gql<any>(Q_AUTHORIZATIONS_EXPENSE);
      // Pharmacists only see their own, managers see all (already handled mostly, but we'll filter here for pharmacists if backend doesn't)
      let allExp = data.allExpenses || [];
      if (!isManager) {
        allExp = allExp.filter((e: any) => e.requestedBy?.id === me?.id);
      }
      setExpenses(allExp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExpense = async () => {
    setSubmitting(true);
    try {
      const branchId = me?.branchId || me?.branch?.id || '';
      // We assume a generic category ID for now if we don't fetch them, but backend requires a categoryId.
      // We will hardcode a dummy one or fetch the first category.
      const res = await gql<any>(`
        query { expenseCategories { id } }
      `);
      const catId = res.expenseCategories[0]?.id || 'dummy_cat_id';

      const created = await gql<any>(M_REQUEST_EXPENSE, {
        branchId,
        categoryId: catId,
        amount: parseFloat(newExp.amount),
        description: newExp.desc,
        date: new Date(newExp.date).toISOString(),
      });
      setExpenses([created.requestExpense, ...expenses]);
      setShowModal(false);
      setNewExp({ amount: '', desc: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      alert('Error requesting expense. Please ensure categories exist in DB.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
          Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Month', value: 'GH₵ 8,240', sub: 'vs 7.5k last month', icon: DollarSign, color: '#EF4444' },
          { label: 'Utilities', value: 'GH₵ 1,200', sub: 'Electricity & Water', icon: Landmark, color: '#0EA5E9' },
          { label: 'Logistics', value: 'GH₵ 2,450', sub: 'Supplier deliveries', icon: CreditCard, color: '#F59E0B' },
          { label: 'Staff Perks', value: 'GH₵ 850', sub: 'Lunch & Transport', icon: Wallet, color: '#10B981' },
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
          {expenses.map((e) => (
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
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: c.danger }}>- GH₵ {Number(e.amount).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
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
                <label className="text-xs font-bold block mb-2" style={{ color: c.text }}>Amount (GH₵)</label>
                <input 
                  type="number"
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

              <button 
                onClick={handleRequestExpense}
                disabled={submitting || !newExp.amount || !newExp.desc}
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
