'use client';

import { motion } from 'framer-motion';
import { Truck, FileText, CheckCircle, Clock, AlertCircle, Trash2, DollarSign, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';

export default function SupplierInvoicesPage() {
  const { invoices, suppliers, recordSupplierPayment, deleteInvoice } = useStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const pendingInvoices = useMemo(() => invoices.filter(inv => inv.paymentStatus !== 'PAID'), [invoices]);
  const overdueInvoices = useMemo(() => pendingInvoices.filter(inv => inv.dueDate && new Date(inv.dueDate) < new Date()), [pendingInvoices]);
  const clearedInvoices = useMemo(() => invoices.filter(inv => inv.paymentStatus === 'PAID'), [invoices]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !paymentAmount) return;
    
    try {
      await recordSupplierPayment(selectedInvoiceId, parseFloat(paymentAmount), paymentMethod);
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setSelectedInvoiceId(null);
    } catch (err) {
      console.error('Failed to record payment', err);
      alert('Failed to record payment');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice? This will also remove associated ledger liability entries.')) {
      try {
        await deleteInvoice(invoiceId);
      } catch (err) {
        console.error('Failed to delete invoice', err);
        alert('Failed to delete invoice');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>Supplier Invoices</h1>
        <p className="text-sm font-medium mt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          Manage, track, and clear invoices from pharmaceutical suppliers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm flex items-center gap-4" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Pending Invoices</p>
            <p className="text-3xl font-display font-black" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{pendingInvoices.length}</p>
          </div>
        </motion.div>
        
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm flex items-center gap-4" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Overdue Invoices</p>
            <p className="text-3xl font-display font-black" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{overdueInvoices.length}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm flex items-center gap-4" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Cleared</p>
            <p className="text-3xl font-display font-black" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{clearedInvoices.length}</p>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 rounded-3xl border overflow-hidden shadow-sm" style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
        <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0', background: isDark ? '#0F172A' : '#F8FAFC' }}>
          <h2 className="font-display font-bold text-lg" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>Invoice Ledger</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}` }}>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Invoice Info</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Supplier</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Amount / Balance</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <motion.tr 
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  style={{ borderBottom: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-base" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{invoice.invoiceNo}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                      {invoice.supplier?.name || 'Unknown Supplier'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
                        Total: GH₵ {invoice.total.toFixed(2)}
                      </span>
                      {invoice.balance > 0 && (
                        <span className="text-xs font-bold text-red-500">
                          Bal: GH₵ {invoice.balance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      invoice.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                      invoice.paymentStatus === 'PARTIAL' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {invoice.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {invoice.balance > 0 && (
                        <button 
                          onClick={() => {
                            setSelectedInvoiceId(invoice.id);
                            setPaymentAmount(invoice.balance.toString());
                            setPaymentModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                          title="Record Payment"
                        >
                          <DollarSign size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Invoice"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No supplier invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentModalOpen && selectedInvoiceId && (
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
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
                <button 
                  type="button" 
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 p-3 rounded-xl font-bold transition-colors"
                  style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#E2E8F0' : '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
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
