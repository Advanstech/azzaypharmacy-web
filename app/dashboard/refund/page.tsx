'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  RotateCcw, Search, Filter, AlertCircle, Clock, CheckCircle, 
  ArrowLeft, Receipt, DollarSign, Package, XCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';

export default function RefundPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const { sales, me } = useStore();
  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

  const [receiptSearch, setReceiptSearch] = useState('');
  const [foundSale, setFoundSale] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');

  const lookupReceipt = () => {
    const q = receiptSearch.trim().toLowerCase();
    const match = sales.find(s =>
      s.id.toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q)
    );
    setFoundSale(match || null);
  };

  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    warning: '#F59E0B',
    danger: '#EF4444',
    success: '#10B981',
  };

  const [refunds, setRefunds] = useState([
    { id: 1, receipt: 'AZY-171483001', date: '2026-05-04', item: 'Amoxiclav 625mg', amount: 110, reason: 'Wrong dosage dispensed', status: 'PENDING', requestedBy: 'Cashier Kwame' },
    { id: 2, receipt: 'AZY-171483055', date: '2026-05-03', item: 'Paracetamol 500mg', amount: 5, reason: 'Duplicate purchase', status: 'APPROVED', requestedBy: 'Pharmacist Dery' },
  ]);

  const handleAction = (id: number, status: string) => {
    setRefunds(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Sales Refunds</h1>
          <p className="text-sm" style={{ color: c.muted }}>Process returns and manage credit notes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[32px] border p-8 text-center backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
            <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={32} style={{ color: c.muted }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: c.text }}>Initiate a Refund</h3>
            <div className="max-w-md mx-auto relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: c.muted }} />
              <input
                type="text"
                value={receiptSearch}
                onChange={e => setReceiptSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupReceipt()}
                placeholder="Enter receipt ID or customer name..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border outline-none font-mono text-sm"
                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: c.border, color: c.text }}
              />
              <button
                onClick={lookupReceipt}
                className="absolute right-2 top-1.5 bottom-1.5 px-4 rounded-xl font-bold text-[10px] bg-blue-500 text-white hover:bg-blue-600 transition-all">
                FIND
              </button>
            </div>
            {foundSale && (
              <div className="max-w-md mx-auto mt-4 p-4 rounded-2xl border" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: c.border }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-xs font-bold" style={{ color: c.primary }}>{foundSale.id}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: c.success }}>Found</span>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: c.text }}>{foundSale.customerName || 'Walk-in Customer'}</p>
                <p className="text-xs mb-3" style={{ color: c.muted }}>{foundSale.items.length} items · GH₵ {foundSale.totalAmount.toFixed(2)} · {foundSale.paymentMethod}</p>
                <div className="space-y-2">
                  <textarea
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    placeholder="Reason for refund..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }}
                  />
                  <button
                    onClick={() => {
                      if (!refundReason.trim()) return;
                      setRefunds(prev => [{
                        id: prev.length + 1,
                        receipt: foundSale.id,
                        date: new Date().toISOString().split('T')[0],
                        item: foundSale.items[0]?.product?.name || 'Multiple items',
                        amount: foundSale.totalAmount,
                        reason: refundReason,
                        status: 'PENDING',
                        requestedBy: me?.name || user?.email || 'Staff',
                      }, ...prev]);
                      setFoundSale(null);
                      setReceiptSearch('');
                      setRefundReason('');
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-sm"
                    style={{ background: c.primary, color: isDark ? '#060B14' : '#fff' }}>
                    Submit Refund Request
                  </button>
                </div>
              </div>
            )}
            {receiptSearch && !foundSale && (
              <p className="text-xs mt-3 text-center" style={{ color: c.muted }}>No sale found. Try the full receipt ID.</p>
            )}
          </div>

          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
              <h3 className="font-display text-sm font-bold" style={{ color: c.text }}>Pending Approvals</h3>
            </div>
            <div className="divide-y" style={{ borderColor: c.border }}>
              {refunds.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                      <Receipt size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold" style={{ color: c.text }}>{r.receipt}</p>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase"
                          style={{ 
                            background: r.status === 'APPROVED' ? `${c.success}20` : `${c.warning}20`,
                            color: r.status === 'APPROVED' ? c.success : c.warning
                          }}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                        {r.item} • GH₵ {r.amount.toFixed(2)} • Requested by <span className="text-emerald-400">{r.requestedBy}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 italic">"{r.reason}"</p>
                    </div>
                  </div>
                  
                  {isManager && r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAction(r.id, 'APPROVED')}
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                        title="Approve"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleAction(r.id, 'REJECTED')}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        title="Reject"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border p-6" style={{ background: c.bg, borderColor: c.border }}>
            <h4 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: c.muted }}>Policy Reminder</h4>
            <ul className="space-y-3 text-xs" style={{ color: c.muted }}>
              <li className="flex items-start gap-2"><AlertCircle size={14} className="shrink-0" /> Cold-chain items are not eligible for return.</li>
              <li className="flex items-start gap-2"><AlertCircle size={14} className="shrink-0" /> Full refund only if packaging is untampered.</li>
              <li className="flex items-start gap-2"><AlertCircle size={14} className="shrink-0" /> Credit notes expire in 90 days.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
