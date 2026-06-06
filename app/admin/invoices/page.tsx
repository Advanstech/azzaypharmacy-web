'use client';

import { motion } from 'framer-motion';
import { Truck, FileText, CheckCircle, Clock, AlertCircle, Trash2, DollarSign, Eye, ThumbsUp, ThumbsDown, PauseCircle, ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { gql, M_UPDATE_INVOICE_APPROVAL_STATUS } from '@/lib/gql';
import { useToast } from '@/components/pharma-toast';

const APPROVAL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Pending',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  APPROVED: { label: 'Approved', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  HOLD:     { label: 'On Hold',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

export default function SupplierInvoicesPage() {
  const { invoices, suppliers, recordSupplierPayment, deleteInvoice, me, refetchInvoices } = useStore() as any;
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  const { addToast } = useToast();

  const canApprove = ['OWNER', 'ROOT', 'SE_ADMIN'].includes(me?.role || '');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const pendingInvoices = useMemo(() => invoices.filter((inv: any) => inv.paymentStatus !== 'PAID'), [invoices]);
  const overdueInvoices = useMemo(() => pendingInvoices.filter((inv: any) => inv.dueDate && new Date(inv.dueDate) < new Date()), [pendingInvoices]);
  const clearedInvoices = useMemo(() => invoices.filter((inv: any) => inv.paymentStatus === 'PAID'), [invoices]);

  const totalPages = Math.ceil(invoices.length / pageSize);
  const paginatedInvoices = useMemo(() => {
    return invoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [invoices, currentPage]);

  // Reset page if invoices change and current page is now empty
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
      addToast({ type: 'error', title: 'Payment Failed', message: 'Could not record payment.', duration: 5000 });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice? This will also remove associated ledger liability entries.')) {
      try {
        await deleteInvoice(invoiceId);
      } catch (err) {
        console.error('Failed to delete invoice', err);
        addToast({ type: 'error', title: 'Delete Failed', message: 'Could not delete invoice.', duration: 5000 });
      }
    }
  };

  const handleApprovalAction = async (invoiceId: string, status: 'APPROVED' | 'REJECTED' | 'HOLD' | 'PENDING') => {
    setApprovingId(invoiceId);
    try {
      await gql(M_UPDATE_INVOICE_APPROVAL_STATUS, { invoiceId, status });
      addToast({
        type: status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'info',
        title: `Invoice ${APPROVAL_CONFIG[status].label}`,
        message: `Invoice status updated to ${APPROVAL_CONFIG[status].label}.`,
        duration: 4000,
      });
      // Refetch invoices if available
      if (typeof refetchInvoices === 'function') await refetchInvoices();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err?.message || 'Could not update approval status.', duration: 5000 });
    } finally {
      setApprovingId(null);
    }
  };

  const cardBg = isDark ? '#0F172A' : '#FFFFFF';
  const borderC = isDark ? '#1E293B' : '#E2E8F0';
  const textC = isDark ? '#E2E8F0' : '#0F172A';
  const mutedC = isDark ? '#94A3B8' : '#64748B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <div>
        <h1 className="text-3xl font-display font-black tracking-tight" style={{ color: textC }}>Supplier Invoices</h1>
        <p className="text-sm font-medium mt-1" style={{ color: mutedC }}>
          Manage, track, and clear invoices from pharmaceutical suppliers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm flex items-center gap-4" style={{ background: cardBg, borderColor: borderC }}>
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: mutedC }}>Pending Invoices</p>
            <p className="text-3xl font-display font-black" style={{ color: textC }}>{pendingInvoices.length}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm flex items-center gap-4" style={{ background: cardBg, borderColor: borderC }}>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: mutedC }}>Overdue Invoices</p>
            <p className="text-3xl font-display font-black" style={{ color: textC }}>{overdueInvoices.length}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm flex items-center gap-4" style={{ background: cardBg, borderColor: borderC }}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: mutedC }}>Cleared</p>
            <p className="text-3xl font-display font-black" style={{ color: textC }}>{clearedInvoices.length}</p>
          </div>
        </motion.div>
      </div>

      {/* Table */}
      <div className="mt-8 rounded-3xl border overflow-hidden shadow-sm" style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: borderC }}>
        <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: borderC, background: isDark ? '#0F172A' : '#F8FAFC' }}>
          <h2 className="font-display font-bold text-lg" style={{ color: textC }}>Invoice Ledger</h2>
          {canApprove && (
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
              <ShieldCheck size={14} />
              Approval Authority Active
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {/* Mobile View (Cards) */}
          <div className="md:hidden divide-y" style={{ borderColor: borderC }}>
            {paginatedInvoices.map((invoice: any, index: number) => {
              const approvalCfg = APPROVAL_CONFIG[invoice.approvalStatus || 'PENDING'];
              const isActioning = approvingId === invoice.id;
              return (
                <div key={invoice.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <Link href={`/admin/invoices/${invoice.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#94A3B8' : '#64748B' }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: textC }}>{invoice.invoiceNo}</p>
                        <p className="text-xs font-medium" style={{ color: mutedC }}>Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </Link>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: approvalCfg.bg, color: approvalCfg.color }}>
                      {approvalCfg.label}
                    </span>
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm" style={{ color: textC }}>{invoice.supplier?.name || 'Unknown Supplier'}</p>
                    <div className="flex justify-between mt-2 text-sm font-bold">
                      <span style={{ color: textC }}>Total: GH₵ {invoice.total.toFixed(2)}</span>
                      {invoice.balance > 0 && <span className="text-red-500">Bal: GH₵ {invoice.balance.toFixed(2)}</span>}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: borderC }}>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      invoice.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                      invoice.paymentStatus === 'PARTIAL' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {invoice.paymentStatus}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {invoice.balance > 0 && (
                        <button onClick={() => { setSelectedInvoiceId(invoice.id); setPaymentAmount(invoice.balance.toString()); setPaymentModalOpen(true); }} className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                          <DollarSign size={14} />
                        </button>
                      )}
                      {canApprove && invoice.approvalStatus !== 'APPROVED' && (
                        <button onClick={() => handleApprovalAction(invoice.id, 'APPROVED')} disabled={isActioning} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                          <ThumbsUp size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteInvoice(invoice.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && (
              <div className="p-8 text-center text-sm" style={{ color: mutedC }}>No supplier invoices found.</div>
            )}
          </div>

          {/* Desktop View (Table) */}
          <table className="w-full text-left border-collapse hidden md:table min-w-[800px]">
            <thead>
              <tr style={{ background: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${borderC}` }}>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: mutedC }}>Invoice Info</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: mutedC }}>Supplier</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: mutedC }}>Amount / Balance</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: mutedC }}>Payment</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: mutedC }}>Approval</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right whitespace-nowrap" style={{ color: mutedC }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((invoice: any, index: number) => {
                const approvalCfg = APPROVAL_CONFIG[invoice.approvalStatus || 'PENDING'];
                const isActioning = approvingId === invoice.id;
                return (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    style={{ borderBottom: `1px solid ${borderC}` }}
                  >
                    {/* Invoice Info — clickable to detail */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/invoices/${invoice.id}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-blue-500/10" style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#94A3B8' : '#64748B' }}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm group-hover:text-blue-500 transition-colors" style={{ color: textC }}>{invoice.invoiceNo}</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: mutedC }}>
                            Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                          </p>
                          {invoice.uploadedBy && (
                            <p className="text-[10px] font-bold mt-0.5" style={{ color: mutedC }}>
                              By: {invoice.uploadedBy.name}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Supplier */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm line-clamp-2" style={{ color: textC }}>{invoice.supplier?.name || 'Unknown Supplier'}</p>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm" style={{ color: textC }}>Total: GH₵ {invoice.total.toFixed(2)}</span>
                        {invoice.balance > 0 && (
                          <span className="text-xs font-bold text-red-500">Bal: GH₵ {invoice.balance.toFixed(2)}</span>
                        )}
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg ${
                        invoice.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                        invoice.paymentStatus === 'PARTIAL' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {invoice.paymentStatus}
                      </span>
                    </td>

                    {/* Approval Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg inline-block"
                          style={{ background: approvalCfg.bg, color: approvalCfg.color }}
                        >
                          {approvalCfg.label}
                        </span>
                        {invoice.approvedBy && (
                          <span className="text-[10px] font-medium" style={{ color: mutedC }}>
                            by {invoice.approvedBy.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* View Details */}
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="p-2 rounded-xl transition-colors"
                          style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#94A3B8' : '#64748B' }}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </Link>

                        {/* Record Payment */}
                        {invoice.balance > 0 && (
                          <button
                            onClick={() => { setSelectedInvoiceId(invoice.id); setPaymentAmount(invoice.balance.toString()); setPaymentModalOpen(true); }}
                            className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                            title="Record Payment"
                          >
                            <DollarSign size={15} />
                          </button>
                        )}

                        {/* Approval Buttons — OWNER / ROOT / SE_ADMIN only */}
                        {canApprove && (
                          <>
                            {invoice.approvalStatus !== 'APPROVED' && (
                              <button
                                onClick={() => handleApprovalAction(invoice.id, 'APPROVED')}
                                disabled={isActioning}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-40"
                                title="Approve Invoice"
                              >
                                <ThumbsUp size={15} />
                              </button>
                            )}
                            {invoice.approvalStatus !== 'HOLD' && (
                              <button
                                onClick={() => handleApprovalAction(invoice.id, 'HOLD')}
                                disabled={isActioning}
                                className="p-2 rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-40"
                                title="Put on Hold"
                              >
                                <PauseCircle size={15} />
                              </button>
                            )}
                            {invoice.approvalStatus !== 'REJECTED' && (
                              <button
                                onClick={() => handleApprovalAction(invoice.id, 'REJECTED')}
                                disabled={isActioning}
                                className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-40"
                                title="Reject Invoice"
                              >
                                <ThumbsDown size={15} />
                              </button>
                            )}
                          </>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center" style={{ color: mutedC }}>
                    No supplier invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: borderC }}>
            <span className="text-xs font-medium text-center sm:text-left" style={{ color: mutedC }}>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, invoices.length)} of {invoices.length} invoices
            </span>
            <div className="flex gap-2 justify-center sm:justify-end">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors hover:opacity-80"
                style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: textC }}
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors hover:opacity-80"
                style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: textC }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && selectedInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border"
            style={{ background: cardBg, borderColor: borderC }}
          >
            <h2 className="text-xl font-display font-bold mb-4" style={{ color: textC }}>Record Payment</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: mutedC }}>Amount (GH₵)</label>
                <input
                  type="number" step="0.01" min="0" required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border text-base outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: textC }}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: mutedC }}>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full p-3 rounded-xl border text-base outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: textC }}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile Money (MoMo)</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: borderC }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 p-3 rounded-xl font-bold transition-colors"
                  style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#E2E8F0' : '#475569' }}
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors">
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
