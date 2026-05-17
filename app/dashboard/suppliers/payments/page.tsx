'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  DollarSign, Receipt, Clock, AlertCircle, ChevronRight, 
  Filter, Search, Download, CreditCard, Wallet, ArrowUpRight,
  Calendar, Building, User, FileText, CheckCircle2, History, X,
  ArrowRight, Loader2, Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { gql, Q_INVOICES, M_RECORD_SUPPLIER_PAYMENT } from '@/lib/gql';
import { useToast } from '@/components/pharma-toast';

export default function SupplierPaymentsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { suppliers, me } = useStore();
  const { addToast } = useToast();
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, UNPAID, PARTIAL, PAID
  const [search, setSearch] = useState('');
  
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRef, setPayRef] = useState('');
  
  useEffect(() => {
    setMounted(true);
    fetchInvoices();
  }, [me]);

  const fetchInvoices = async () => {
    if (!me?.branchId) return;
    try {
      const data = await gql<{ invoices: any[] }>(Q_INVOICES, { branchId: me.branchId });
      setInvoices(data.invoices);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !payAmount) return;
    setIsPaying(true);
    try {
      await gql(M_RECORD_SUPPLIER_PAYMENT, {
        invoiceId: selectedInvoice.id,
        amount: parseFloat(payAmount),
        method: payMethod,
        reference: payRef
      });
      setSelectedInvoice(null);
      setPayAmount('');
      setPayRef('');
      await fetchInvoices();
      addToast({
        type: 'success',
        title: 'Payment Recorded',
        message: 'Settlement has been successfully applied to the ledger.',
        duration: 5000,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Payment Failed',
        message: err.message || 'Could not record payment.',
        duration: 6000,
      });
    } finally {
      setIsPaying(false);
    }
  };

  const distribution = useMemo(() => {
    const paid = invoices.filter(i => i.paymentStatus === 'PAID').reduce((acc, inv) => acc + Number(inv.paidAmount), 0);
    const partial = invoices.filter(i => i.paymentStatus === 'PARTIAL').reduce((acc, inv) => acc + Number(inv.balance), 0);
    const unpaid = invoices.filter(i => i.paymentStatus === 'UNPAID').reduce((acc, inv) => acc + Number(inv.balance), 0);
    const total = (paid + partial + unpaid) || 1;
    return {
      paidPct: (paid / total) * 100,
      partialPct: (partial / total) * 100,
      unpaidPct: (unpaid / total) * 100,
      paid, partial, unpaid, total
    };
  }, [invoices]);

  if (!mounted) return null;

  const isDark = theme === 'dark';
  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    inputBg: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) || 
                         inv.supplier?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || inv.paymentStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const totalOutstanding = invoices.reduce((acc, inv) => acc + Number(inv.balance), 0);
  const overdueInvoices = invoices.filter(inv => inv.paymentStatus !== 'PAID' && inv.dueDate && new Date(inv.dueDate) < new Date());

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt size={24} />
            </div>
            <h1 className="font-display text-3xl font-black tracking-tight" style={{ color: card.text }}>Accounts Payable Nexus</h1>
          </div>
          <p className="text-sm opacity-60" style={{ color: card.text }}>Liability tracking, aging reports, and supplier settlement intelligence</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-6 py-4 rounded-[24px] border backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border }}>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Outstanding</p>
             <p className="text-2xl font-display font-black text-red-500">GH₵ {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="px-6 py-4 rounded-[24px] border backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border }}>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Overdue Invoices</p>
             <p className="text-2xl font-display font-black text-amber-500">{overdueInvoices.length}</p>
          </div>
        </div>
      </div>

      {/* 3D KPI & Pictograph Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 p-8 rounded-[32px] border relative overflow-hidden flex flex-col justify-between" style={{ background: isDark ? 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(0,0,0,0.9))' : 'linear-gradient(135deg, #ffffff, #f1f5f9)', borderColor: card.border }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: card.text }}>Liability Distribution Pipeline</p>
            <div className="h-12 w-full rounded-2xl flex overflow-hidden mt-6 relative shadow-inner" style={{ background: isDark ? '#000' : '#e2e8f0', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.2)' }}>
               <motion.div 
                 initial={{ width: 0 }} animate={{ width: `${distribution.paidPct}%` }}
                 className="h-full bg-emerald-500 relative"
                 style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.4), 0 0 20px rgba(16,185,129,0.5)' }}
               />
               <motion.div 
                 initial={{ width: 0 }} animate={{ width: `${distribution.partialPct}%` }}
                 className="h-full bg-amber-500 relative"
                 style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.4), 0 0 20px rgba(245,158,11,0.5)' }}
               />
               <motion.div 
                 initial={{ width: 0 }} animate={{ width: `${distribution.unpaidPct}%` }}
                 className="h-full bg-red-500 relative"
                 style={{ boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.2), 0 0 20px rgba(239,68,68,0.5)' }}
               />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t" style={{ borderColor: card.border }}>
             <div>
               <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /><span className="text-[10px] font-bold opacity-50 uppercase tracking-widest" style={{ color: card.text }}>Cleared</span></div>
               <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {distribution.paid.toLocaleString()}</p>
             </div>
             <div>
               <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /><span className="text-[10px] font-bold opacity-50 uppercase tracking-widest" style={{ color: card.text }}>Partial</span></div>
               <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {distribution.partial.toLocaleString()}</p>
             </div>
             <div>
               <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" /><span className="text-[10px] font-bold opacity-50 uppercase tracking-widest" style={{ color: card.text }}>Critical</span></div>
               <p className="font-display text-lg font-black" style={{ color: card.text }}>GH₵ {distribution.unpaid.toLocaleString()}</p>
             </div>
          </div>
        </div>
        <div className="col-span-1 rounded-[32px] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
          <div>
            <Sparkles size={40} className="mb-4 text-indigo-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            <h3 className="font-display font-black text-2xl mb-2 leading-tight">Intelligence</h3>
            <p className="text-xs leading-relaxed opacity-80">AI models monitor aging liabilities. Settlement allocations synchronize with real-time branch ledgers for accurate P&L mapping.</p>
          </div>
          <button className="w-full mt-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-xs font-black uppercase tracking-widest transition-all">
            Generate Aging Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border p-6 space-y-6" style={{ background: card.bg, borderColor: card.border }}>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Filter by Status</label>
              <div className="space-y-2">
                {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setFilter(s)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${filter === s ? 'shadow-lg' : 'hover:bg-primary/5'}`}
                    style={{ 
                      background: filter === s ? card.primary : 'transparent',
                      color: filter === s ? '#fff' : card.text,
                      boxShadow: filter === s ? `0 8px 20px ${card.primary}40` : 'none'
                    }}
                  >
                    {s}
                    <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
                      {s === 'ALL' ? invoices.length : invoices.filter(i => i.paymentStatus === s).length}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Suppliers</label>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {suppliers.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-500/5 cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold group-hover:bg-primary group-hover:text-white transition-all">
                      {s.name[0]}
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: card.text }}>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="rounded-3xl border p-6" style={{ background: card.bg, borderColor: card.border }}>
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4" style={{ color: card.text }}>Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: card.muted }}>Total Invoices</span>
                <span className="font-display font-bold text-sm" style={{ color: card.primary }}>{invoices.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: card.muted }}>Outstanding</span>
                <span className="font-display font-bold text-sm text-red-500">GH₵ {totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: card.muted }}>Overdue</span>
                <span className="font-display font-bold text-sm text-amber-500">{overdueInvoices.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl border overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
             <div className="p-6 border-b flex items-center justify-between gap-4" style={{ borderColor: card.border }}>
                <div className="relative flex-1">
                   <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" style={{ color: card.text }} />
                   <input 
                     type="text" 
                     placeholder="Search by invoice number or supplier..." 
                     className="w-full pl-12 pr-4 py-3 rounded-2xl text-sm focus:outline-none"
                     style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', color: card.text }}
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                   />
                </div>
                <button className="p-3 rounded-2xl border hover:bg-slate-500/5 transition-all" style={{ borderColor: card.border, color: card.text }}>
                   <Download size={20} />
                </button>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                      <tr>
                        {['Invoice / Supplier', 'Date / Due', 'Total Amount', 'Balance', 'Status', ''].map(h => (
                          <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: card.text }}>{h}</th>
                        ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y" style={{ borderColor: card.border }}>
                      {loading ? (
                        <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto opacity-20" size={40} /></td></tr>
                      ) : filteredInvoices.length === 0 ? (
                        <tr><td colSpan={6} className="py-20 text-center opacity-30 font-bold">No matching invoices found</td></tr>
                      ) : filteredInvoices.map(inv => (
                        <tr key={inv.id} className="group hover:bg-primary/5 transition-all">
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-500/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                   <FileText size={20} />
                                </div>
                                <div>
                                   <p className="text-sm font-black tracking-tight" style={{ color: card.text }}>{inv.invoiceNo}</p>
                                   <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{inv.supplier?.name}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: card.muted }}>
                                   <Calendar size={12} /> {new Date(inv.issueDate).toLocaleDateString()}
                                </div>
                                {inv.dueDate && (
                                  <div className={`flex items-center gap-2 text-[10px] font-black ${new Date(inv.dueDate) < new Date() && inv.paymentStatus !== 'PAID' ? 'text-red-500' : 'opacity-40'}`}>
                                     <Clock size={12} /> Due: {new Date(inv.dueDate).toLocaleDateString()}
                                  </div>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-5 font-mono text-sm font-bold" style={{ color: card.text }}>
                             GH₵ {Number(inv.total).toLocaleString()}
                          </td>
                          <td className="px-6 py-5">
                             <p className={`font-mono text-sm font-black ${inv.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                               GH₵ {Number(inv.balance).toLocaleString()}
                             </p>
                             <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(inv.paidAmount / inv.total) * 100}%` }}
                                  className="h-full bg-emerald-500"
                                />
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                               inv.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                               inv.paymentStatus === 'PARTIAL' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                               'bg-red-500/10 text-red-500 border-red-500/20'
                             }`}>
                                {inv.paymentStatus}
                             </span>
                          </td>
                          <td className="px-6 py-5">
                             <button 
                               disabled={inv.paymentStatus === 'PAID'}
                               onClick={() => setSelectedInvoice(inv)}
                               className="p-3 rounded-2xl hover:bg-primary hover:text-white transition-all disabled:opacity-0"
                               style={{ color: card.primary, border: `1px solid ${card.border}` }}
                             >
                                <ArrowUpRight size={18} />
                             </button>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}>
             <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="w-full max-w-xl rounded-[40px] border shadow-2xl p-10 flex flex-col gap-8"
               style={{ background: isDark ? '#0A0E1A' : '#fff', borderColor: card.border }}
             >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                         <CreditCard size={28} />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black tracking-tight" style={{ color: card.text }}>Settle Liability</h2>
                         <p className="text-xs opacity-50 font-bold uppercase tracking-widest" style={{ color: card.text }}>INV: {selectedInvoice.invoiceNo}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedInvoice(null)} className="w-10 h-10 rounded-full hover:bg-red-500/10 text-red-500 flex items-center justify-center transition-colors">
                      <X size={24} />
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 rounded-[24px] border bg-slate-50 dark:bg-slate-900/40" style={{ borderColor: card.border }}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Outstanding Balance</p>
                      <p className="text-xl font-display font-black text-red-500">GH₵ {selectedInvoice.balance.toLocaleString()}</p>
                   </div>
                   <div className="p-6 rounded-[24px] border bg-slate-50 dark:bg-slate-900/40" style={{ borderColor: card.border }}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Supplier</p>
                      <p className="text-xl font-display font-black" style={{ color: card.text }}>{selectedInvoice.supplier?.name}</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest mb-3 block opacity-40" style={{ color: card.text }}>Settlement Amount (GH₵)</label>
                      <div className="relative">
                         <DollarSign size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" />
                         <input 
                           type="number" 
                           placeholder="0.00" 
                           className="w-full pl-14 pr-6 py-6 rounded-[28px] text-2xl font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                           style={{ background: card.inputBg || (isDark ? 'rgba(0,0,0,0.3)' : '#F8FAFC'), color: card.text, border: `2px solid ${card.border}` }}
                           value={payAmount}
                           onChange={e => setPayAmount(e.target.value)}
                         />
                         <button 
                           onClick={() => setPayAmount(selectedInvoice.balance.toString())}
                           className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest"
                         >
                           Pay Full
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-3 block opacity-40" style={{ color: card.text }}>Payment Method</label>
                        <select 
                          className="w-full px-6 py-4 rounded-2xl text-sm font-bold"
                          style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#F8FAFC', border: `2px solid ${card.border}`, color: card.text }}
                          value={payMethod}
                          onChange={e => setPayMethod(e.target.value)}
                        >
                           <option value="CASH">Cash</option>
                           <option value="MOMO">Mobile Money</option>
                           <option value="CARD">Bank Transfer / Card</option>
                           <option value="CREDIT">Supplier Credit</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-3 block opacity-40" style={{ color: card.text }}>Reference / Cheque No.</label>
                        <input 
                          type="text" 
                          placeholder="TXN-XXXX" 
                          className="w-full px-6 py-4 rounded-2xl text-sm font-bold"
                          style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#F8FAFC', border: `2px solid ${card.border}`, color: card.text }}
                          value={payRef}
                          onChange={e => setPayRef(e.target.value)}
                        />
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => setSelectedInvoice(null)}
                     className="flex-1 py-5 rounded-[28px] text-sm font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                     style={{ color: card.text }}
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleRecordPayment}
                     disabled={isPaying || !payAmount}
                     className="flex-[2] py-5 rounded-[28px] text-sm font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                     style={{ background: '#10B981', color: '#fff' }}
                   >
                     {isPaying ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                     {isPaying ? 'Processing...' : 'Confirm Settlement'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
