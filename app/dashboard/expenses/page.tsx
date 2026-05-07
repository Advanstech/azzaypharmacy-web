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

  const [expenses, setExpenses] = useState([
    { id: 1, date: '2026-05-04', cat: 'Logistics', desc: 'Bedither Pharma Delivery Fee', amount: 150, method: 'MOMO', status: 'PENDING', requestedBy: 'Cashier Kwame' },
    { id: 2, date: '2026-05-03', cat: 'Utilities', desc: 'ECG Prepaid - Main Meter', amount: 500, method: 'CASH', status: 'APPROVED', requestedBy: 'Pharmacist Dery' },
    { id: 3, date: '2026-05-02', cat: 'Maintenance', desc: 'AC Servicing - POS Area', amount: 300, method: 'CARD', status: 'REJECTED', requestedBy: 'Cashier Kwame' },
  ]);

  const handleAction = (id: number, status: string) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Operational Expenses</h1>
          <p className="text-sm" style={{ color: c.muted }}>Track utility, logistics, and miscellaneous pharmacy costs</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
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
                <div className="text-xs font-mono" style={{ color: c.muted }}>{e.date}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: c.text }}>{e.desc}</p>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase"
                      style={{ 
                        background: e.status === 'APPROVED' ? `${c.success}20` : e.status === 'REJECTED' ? `${c.danger}20` : `${c.warning}20`,
                        color: e.status === 'APPROVED' ? c.success : e.status === 'REJECTED' ? c.danger : c.warning
                      }}>
                      {e.status}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                    {e.cat} • {e.method} • Requested by <span className="text-emerald-400">{e.requestedBy}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: c.danger }}>- GH₵ {e.amount.toFixed(2)}</p>
                  <button className="text-[10px] font-bold text-blue-500">View Receipt</button>
                </div>
                
                {isManager && e.status === 'PENDING' && (
                  <div className="flex gap-2 border-l pl-6" style={{ borderColor: c.border }}>
                    <button 
                      onClick={() => handleAction(e.id, 'APPROVED')}
                      className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                      title="Approve"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button 
                      onClick={() => handleAction(e.id, 'REJECTED')}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      title="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
