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

  const { sales, me, requestRefund, approveRefund, rejectRefund, refundRequests } = useStore();
  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

  const [receiptSearch, setReceiptSearch] = useState('');
  const [foundSale, setFoundSale] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

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

  const submitRequest = async () => {
    if (!foundSale || !refundReason.trim()) return;
    setProcessing(true);
    try {
      await requestRefund(foundSale.id, refundReason);
      setFoundSale(null);
      setReceiptSearch('');
      setRefundReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(true);
    try {
      await approveRefund(requestId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(true);
    try {
      await rejectRefund(requestId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const recentRefunds = sales.filter(s => (s as any).status === 'REFUNDED').slice(0, 10);

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>Sales Refunds</h1>
          <p className="text-sm" style={{ color: c.muted }}>
            {isManager ? 'Process returns and authorize refunds' : 'Initiate return requests for manager approval'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Initiation Section */}
          <div className="rounded-[32px] border p-8 text-center backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
            <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={32} style={{ color: c.muted }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: c.text }}>Find Sale to Refund</h3>
            <div className="max-w-md mx-auto relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: c.muted }} />
              <input
                type="text"
                value={receiptSearch}
                onChange={e => setReceiptSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupReceipt()}
                placeholder="Receipt ID or customer name..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border outline-none font-mono text-sm"
                style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: c.border, color: c.text }}
              />
              <button
                onClick={lookupReceipt}
                className="absolute right-2 top-1.5 bottom-1.5 px-4 rounded-xl font-bold text-[10px] bg-blue-500 text-white hover:bg-blue-600 transition-all uppercase tracking-widest">
                Search
              </button>
            </div>

            {foundSale && (
              <div className="max-w-md mx-auto mt-6 p-6 rounded-[24px] border text-left animate-in zoom-in-95 duration-300" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: c.border }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest" style={{ color: c.primary }}>{foundSale.id}</p>
                    <p className="text-xs font-bold" style={{ color: c.muted }}>{new Date(foundSale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest" style={{ background: 'rgba(16,185,129,0.1)', color: c.success }}>ELIGIBLE</span>
                </div>
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm font-bold" style={{ color: c.text }}>{foundSale.customerName || 'Walk-in Customer'}</p>
                  <p className="text-xs" style={{ color: c.muted }}>{foundSale.items?.length || 0} items · GH₵ {Number(foundSale.totalAmount).toFixed(2)} · {foundSale.paymentMethod}</p>
                </div>

                {foundSale.status === 'REFUNDED' ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={14} /> This sale has already been refunded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reason for Refund</label>
                    <textarea
                      value={refundReason}
                      onChange={e => setRefundReason(e.target.value)}
                      placeholder="e.g. Expired product, Customer changed mind..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${c.border}`, color: c.text }}
                    />
                    <button
                      onClick={submitRequest}
                      disabled={!refundReason.trim() || processing}
                      className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                      style={{ background: c.primary, color: isDark ? '#060B14' : '#fff' }}>
                      {processing ? 'Processing...' : 'Request Refund Approval'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Requests (For Managers) */}
          {isManager && refundRequests.length > 0 && (
            <div className="rounded-[32px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
              <div className="p-6 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
                <h3 className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c.text }}>Pending Authorizations</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">{refundRequests.length}</span>
              </div>
              <div className="divide-y" style={{ borderColor: c.border }}>
                {refundRequests.map((r) => (
                  <div key={r.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Receipt size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: c.text }}>{r.saleId}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                            r.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                            r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                          GH₵ {Number(r.sale?.totalAmount || 0).toFixed(2)} • Requested by <span className="text-blue-400">{r.requestedBy?.name || 'Staff'}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 italic">"{r.reason}"</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(r.id)}
                        disabled={processing || r.status !== 'PENDING'}
                        className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                        title="Authorize Refund"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleReject(r.id)}
                        disabled={processing || r.status !== 'PENDING'}
                        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                        title="Reject Request"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Refund History */}
          <div className="rounded-[32px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
              <h3 className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c.text }}>Processed Refunds</h3>
            </div>
            <div className="divide-y" style={{ borderColor: c.border }}>
              {recentRefunds.length === 0 ? (
                <div className="p-12 text-center text-sm" style={{ color: c.muted }}>No recently processed refunds</div>
              ) : (
                recentRefunds.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        <RotateCcw size={18} style={{ color: c.muted }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{r.id}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500">REFUNDED · GH₵ {Number(r.totalAmount).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold" style={{ color: c.muted }}>{new Date((r as any).refundedAt || (r as any).updatedAt || r.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] italic" style={{ color: c.muted }}>{(r as any).refundReason || 'No reason'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Policies */}
        <div className="space-y-6">
          <div className="rounded-[32px] border p-8 backdrop-blur-xl bg-amber-500/5 border-dashed" style={{ borderColor: c.warning + '40' }}>
            <h4 className="text-xs font-black uppercase tracking-widest mb-6" style={{ color: c.warning }}>Azzay Return Policy</h4>
            <ul className="space-y-4 text-xs font-medium" style={{ color: c.muted }}>
              <li className="flex items-start gap-3">
                <AlertCircle size={16} className="shrink-0 text-amber-500" /> 
                <span>Cold-chain medications (Insulin, Vaccines) are <b>non-returnable</b> once they leave the pharmacy.</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle size={16} className="shrink-0 text-amber-500" /> 
                <span>Controlled substances require a manager's signature and regulatory log entry for return.</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle size={16} className="shrink-0 text-amber-500" /> 
                <span>Full refund is only applicable within 48 hours and with untampered packaging.</span>
              </li>
            </ul>
          </div>
          
          <div className="rounded-[32px] border p-8 backdrop-blur-xl bg-blue-500/5" style={{ borderColor: c.primary + '30' }}>
            <h4 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: c.primary }}>Compliance Note</h4>
            <p className="text-[10px] leading-relaxed" style={{ color: c.muted }}>
              All refunds are automatically broadcast to the Ledger, Sales reports, and Stock Inventory. Restoring stock will update the branch inventory levels in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
