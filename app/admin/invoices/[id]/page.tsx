'use client';

import { useStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, FileText, CheckCircle, Clock, AlertCircle, 
  DollarSign, Truck, Calendar, Receipt, ChevronRight 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { invoices, recordSupplierPayment } = useStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const invoice = useMemo(() => invoices.find(inv => inv.id === id), [invoices, id]);
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(invoice?.balance.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle size={48} className="text-red-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Invoice Not Found</h2>
        <button onClick={() => router.push('/admin/invoices')} className="text-blue-500 font-bold hover:underline">
          Return to Invoices
        </button>
      </div>
    );
  }

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;
    setPaymentError(null);
    try {
      await recordSupplierPayment(invoice.id, parseFloat(paymentAmount), paymentMethod);
      setPaymentModalOpen(false);
      setPaymentAmount('');
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      console.error('Failed to record payment', err);
      setPaymentError(msg);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'PAID') return 'bg-emerald-500/10 text-emerald-500';
    if (status === 'PARTIAL') return 'bg-orange-500/10 text-orange-500';
    return 'bg-red-500/10 text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => router.push('/admin/invoices')}
          className="p-2 rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0', color: isDark ? '#E2E8F0' : '#0F172A' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          <Link href="/admin/invoices" className="hover:text-blue-500 transition-colors">Supplier Invoices</Link>
          <ChevronRight size={14} />
          <span style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{invoice.invoiceNo}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight flex items-center gap-3" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
            <FileText size={32} className="text-blue-500" />
            Invoice {invoice.invoiceNo}
          </h1>
          <p className="text-sm font-medium mt-1 flex items-center gap-2" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            <Truck size={16} /> 
            {invoice.supplier?.name || 'Unknown Supplier'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-black px-4 py-2 rounded-xl uppercase tracking-wider ${getStatusColor(invoice.paymentStatus)}`}>
            {invoice.paymentStatus}
          </span>
          {invoice.balance > 0 && (
            <button 
              onClick={() => {
                setPaymentAmount(invoice.balance.toString());
                setPaymentModalOpen(true);
              }}
              className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <DollarSign size={18} />
              Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl border shadow-sm" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Total Amount</p>
          <p className="text-2xl font-display font-black" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>GH₵ {invoice.total.toFixed(2)}</p>
        </div>
        <div className="p-6 rounded-3xl border shadow-sm" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Amount Paid</p>
          <p className="text-2xl font-display font-black text-emerald-500">GH₵ {invoice.paidAmount.toFixed(2)}</p>
        </div>
        <div className="p-6 rounded-3xl border shadow-sm" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Balance Due</p>
          <p className={`text-2xl font-display font-black ${invoice.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            GH₵ {invoice.balance.toFixed(2)}
          </p>
        </div>
        <div className="p-6 rounded-3xl border shadow-sm" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Important Dates</p>
          <div className="text-sm font-medium mt-1" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
            <div className="flex justify-between mb-1">
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Issued:</span>
              <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Due:</span>
              <span className={invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.balance > 0 ? 'text-red-500 font-bold' : ''}>
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
        <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0', background: isDark ? '#0F172A' : '#F8FAFC' }}>
          <h2 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
            <Receipt size={20} className="text-blue-500" />
            Purchased Products
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}` }}>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Product Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Quantity</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Unit Cost</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Selling Price</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Cost Price</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {invoice.purchase?.items && invoice.purchase.items.length > 0 ? (
                invoice.purchase.items.map((item, index) => (
                  <tr 
                    key={item.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    style={{ borderBottom: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}` }}
                  >
                    <td className="px-6 py-4 font-bold text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                      {item.product?.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                      GH₵ {item.unitCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm text-green-500">
                      {item.sellingPrice ? `GH₵ ${Number(item.sellingPrice).toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm text-blue-500">
                      {item.product?.costPrice ? `GH₵ ${Number(item.product.costPrice).toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                      GH₵ {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No products found for this invoice.
                  </td>
                </tr>
              )}
            </tbody>
            {invoice.purchase?.items && invoice.purchase.items.length > 0 && (
              <tfoot>
                <tr style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
                  <td colSpan={5} className="px-6 py-4 text-right font-bold text-sm uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Subtotal
                  </td>
                  <td className="px-6 py-4 text-right font-black text-base" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                    GH₵ {invoice.purchase.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="rounded-3xl border overflow-hidden shadow-sm mt-8" style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0', background: isDark ? '#0F172A' : '#F8FAFC' }}>
            <h2 className="font-display font-bold text-lg" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>Payment History</h2>
          </div>
          <div className="p-6 space-y-4">
            {invoice.payments.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0', background: isDark ? '#0F172A' : '#F8FAFC' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{payment.method} Payment</p>
                    <p className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                <p className="font-display font-black text-emerald-500 text-lg">GH₵ {payment.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border"
            style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}
          >
            <h2 className="text-xl font-display font-bold mb-4" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>Record Payment</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Amount (GH₵)</label>
                <input 
                  type="number" step="0.01" min="0" required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border text-base outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#E2E8F0' : '#0F172A' }}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Payment Method</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-3 rounded-xl border text-base outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#E2E8F0' : '#0F172A' }}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile Money (MoMo)</option>
                  <option value="CARD">Card / POS</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
              
              {paymentError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-xs font-bold text-red-500">Payment Failed</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{paymentError}</p>
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
                <button 
                  type="button" 
                  onClick={() => { setPaymentModalOpen(false); setPaymentError(null); }}
                  className="flex-1 p-3 rounded-xl font-bold transition-colors"
                  style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#E2E8F0' : '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors disabled:opacity-50"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
