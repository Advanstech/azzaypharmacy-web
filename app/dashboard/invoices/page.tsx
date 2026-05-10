'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, DollarSign, Calendar, AlertCircle, CheckCircle,
  Clock, TrendingUp, TrendingDown, Plus, Search, Filter, Download,
  Eye, Edit, Trash2, CreditCard, Building2, ChevronRight, X,
  Save, Loader2, Receipt, BarChart3, PieChart, ArrowUpRight,
  ArrowDownRight, Bell, Settings, RefreshCw
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { usePagination } from '@/hooks/use-pagination';

const INVOICE_STATUS = {
  DRAFT: { label: 'Draft', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
  PENDING: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  APPROVED: { label: 'Approved', color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
  PAID: { label: 'Paid', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  OVERDUE: { label: 'Overdue', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  CANCELLED: { label: 'Cancelled', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
};

const PAYMENT_STATUS = {
  UNPAID: { label: 'Unpaid', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  PARTIAL: { label: 'Partial', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  PAID: { label: 'Paid', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
};

export default function InvoicesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { suppliers, purchases } = useStore();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'upload' | 'analytics'>('invoices');

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    supplierId: '',
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    totalAmount: 0,
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  // Invoice Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  // Mock invoice data with balance tracking
  const invoices = [
    {
      id: 'INV-001',
      supplier: 'Danadams Pharmaceuticals',
      invoiceNumber: 'DAN-2026-089',
      issueDate: '2026-05-01',
      dueDate: '2026-05-15',
      totalAmount: 4500.00,
      paidAmount: 2000.00,
      balance: 2500.00,
      status: 'PENDING',
      paymentStatus: 'PARTIAL',
      category: 'Inventory',
      fileUrl: '/invoices/dan-2026-089.pdf',
      payments: [
        { date: '2026-05-03', amount: 1000.00, method: 'BANK_TRANSFER', reference: 'TXN-001' },
        { date: '2026-05-05', amount: 1000.00, method: 'CASH', reference: 'TXN-002' },
      ],
    },
    {
      id: 'INV-002',
      supplier: 'Ernest Chemists Ltd',
      invoiceNumber: 'ERN-2026-056',
      issueDate: '2026-04-28',
      dueDate: '2026-05-12',
      totalAmount: 3200.00,
      paidAmount: 3200.00,
      balance: 0.00,
      status: 'PAID',
      paymentStatus: 'PAID',
      category: 'Inventory',
      fileUrl: '/invoices/ern-2026-056.pdf',
      payments: [
        { date: '2026-05-01', amount: 3200.00, method: 'BANK_TRANSFER', reference: 'TXN-003' },
      ],
    },
    {
      id: 'INV-003',
      supplier: 'ADD Pharma Limited',
      invoiceNumber: 'ADD-2026-089',
      issueDate: '2026-04-25',
      dueDate: '2026-05-09',
      totalAmount: 1800.00,
      paidAmount: 0.00,
      balance: 1800.00,
      status: 'OVERDUE',
      paymentStatus: 'UNPAID',
      category: 'Equipment',
      fileUrl: '/invoices/add-2026-089.pdf',
      payments: [],
    },
  ];

  const filteredInvoices = invoices.filter(invoice => {
    const matchSearch = !search || 
      invoice.supplier.toLowerCase().includes(search.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchDateFrom = !dateFrom || invoice.issueDate >= dateFrom;
    const matchDateTo = !dateTo || invoice.issueDate <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedInvoices,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredInvoices,
    itemsPerPage: 10,
  });

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);
  const overdueCount = invoices.filter(inv => inv.status === 'OVERDUE').length;
  const overdueAmount = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.balance, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData({ ...uploadData, file });
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadData.file || !uploadData.supplierId) return;
    
    setIsUploading(true);
    try {
      // Upload file and create invoice
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('supplierId', uploadData.supplierId);
      formData.append('invoiceNumber', uploadData.invoiceNumber);
      formData.append('issueDate', uploadData.issueDate);
      formData.append('dueDate', uploadData.dueDate);
      formData.append('totalAmount', uploadData.totalAmount.toString());

      // await uploadInvoiceFile(formData);
      console.log('Invoice upload disabled - enhanced modules not yet enabled');
      setShowUploadModal(false);
      setUploadData({
        supplierId: '',
        invoiceNumber: '',
        issueDate: '',
        dueDate: '',
        totalAmount: 0,
        file: null,
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || paymentAmount <= 0) return;

    try {
      const newPayment = {
        invoiceId: selectedInvoice.id,
        amount: paymentAmount,
        method: paymentMethod,
        note: paymentNote,
        date: new Date().toISOString().split('T')[0],
      };

      // await updateInvoice({
      //   id: selectedInvoice.id,
      //   paidAmount: selectedInvoice.paidAmount + paymentAmount,
      //   balance: selectedInvoice.balance - paymentAmount,
      //   status: selectedInvoice.balance - paymentAmount <= 0 ? 'PAID' : 'PENDING',
      //   paymentStatus: selectedInvoice.balance - paymentAmount <= 0 ? 'PAID' : 'PARTIAL',
      // });
      console.log('Invoice payment disabled - enhanced modules not yet enabled');

      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentNote('');
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Invoice Management</h1>
          <p className="text-sm" style={{ color: card.muted }}>Upload, track, and manage supplier invoices with balance tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: isDark ? '#060B14' : '#fff', boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)' }}>
            <Upload size={18} />
            Upload Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', value: totalInvoices, sub: 'All time', icon: FileText, color: '#0EA5E9' },
          { label: 'Total Amount', value: `GH₵ ${(totalAmount/1000).toFixed(1)}k`, sub: 'Invoice value', icon: DollarSign, color: '#8B5CF6' },
          { label: 'Paid Amount', value: `GH₵ ${(totalPaid/1000).toFixed(1)}k`, sub: 'Settled', icon: TrendingUp, color: '#10B981' },
          { label: 'Outstanding', value: `GH₵ ${(totalBalance/1000).toFixed(1)}k`, sub: 'Due balance', icon: Clock, color: '#F59E0B' },
          { label: 'Overdue', value: `${overdueCount} (${overdueAmount > 0 ? `GH₵${(overdueAmount/1000).toFixed(1)}k` : '0'})`, sub: 'Past due', icon: AlertCircle, color: '#EF4444' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                  <Icon size={16} />
                </div>
                <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
              </div>
              <p className="font-display text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: card.muted }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
        {[
          { id: 'invoices', label: 'Invoices', icon: FileText, count: totalInvoices },
          { id: 'upload', label: 'Upload', icon: Upload },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab === tab.id ? (isDark ? 'rgba(0,217,255,0.1)' : '#fff') : 'transparent', color: activeTab === tab.id ? card.primary : card.muted }}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === tab.id ? card.primary : 'rgba(148,163,184,0.2)', color: activeTab === tab.id ? (isDark ? '#060B14' : '#fff') : card.muted }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          {/* Filters */}
          <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
            <div className="flex gap-3 flex-1">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                <option value="all">All Status</option>
                {Object.entries(INVOICE_STATUS).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Download size={14} />
              Export
            </button>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${card.border}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                  {['Supplier', 'Invoice #', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((invoice, i) => {
                  const statusConfig = INVOICE_STATUS[invoice.status as keyof typeof INVOICE_STATUS];
                  const paymentConfig = PAYMENT_STATUS[invoice.paymentStatus as keyof typeof PAYMENT_STATUS];
                  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.balance > 0;
                  
                  return (
                    <tr key={invoice.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" style={{ borderBottom: i < paginatedInvoices.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.primaryBg }}>
                            <Building2 size={16} style={{ color: card.primary }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: card.text }}>{invoice.supplier}</p>
                            <p className="text-[10px]" style={{ color: card.subtle }}>{invoice.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-medium" style={{ color: card.primary }}>{invoice.invoiceNumber}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm" style={{ color: card.text }}>{invoice.issueDate}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm" style={{ color: isOverdue ? card.danger : card.text }}>{invoice.dueDate}</p>
                        {isOverdue && <p className="text-[10px]" style={{ color: card.danger }}>Overdue</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-bold" style={{ color: card.text }}>GH₵ {invoice.totalAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-medium" style={{ color: card.success }}>GH₵ {invoice.paidAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-bold" style={{ color: invoice.balance > 0 ? card.warning : card.success }}>
                          GH₵ {invoice.balance.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg text-center" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                            {statusConfig.label}
                          </span>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded text-center" style={{ background: paymentConfig.bg, color: paymentConfig.color }}>
                            {paymentConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelectedInvoice(invoice); setShowDetailsModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500" title="View Details">
                            <Eye size={14} />
                          </button>
                          {invoice.balance > 0 && (
                            <button onClick={() => { setSelectedInvoice(invoice); setShowPaymentModal(true); setPaymentAmount(invoice.balance); }} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500" title="Make Payment">
                              <CreditCard size={14} />
                            </button>
                          )}
                          <button onClick={() => window.open(invoice.fileUrl, '_blank')} className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-500" title="Download Invoice">
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
            <p className="text-xs" style={{ color: card.muted }}>
              Showing <span className="font-bold" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold" style={{ color: card.text }}>{totalItems}</span> invoices
            </p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={prevPage} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                Previous
              </button>
              <button disabled={currentPage === totalPages} onClick={nextPage} className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" style={{ background: card.primary, color: '#fff' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-2xl rounded-2xl border overflow-hidden" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Upload Invoice</h2>
                  <p className="text-xs" style={{ color: card.muted }}>Add supplier invoice with balance tracking</p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Supplier</label>
                  <select value={uploadData.supplierId} onChange={e => setUploadData({ ...uploadData, supplierId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Invoice Number</label>
                  <input type="text" value={uploadData.invoiceNumber} onChange={e => setUploadData({ ...uploadData, invoiceNumber: e.target.value })} placeholder="INV-2026-001" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Issue Date</label>
                  <input type="date" value={uploadData.issueDate} onChange={e => setUploadData({ ...uploadData, issueDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Due Date</label>
                  <input type="date" value={uploadData.dueDate} onChange={e => setUploadData({ ...uploadData, dueDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Total Amount (GH₵)</label>
                  <input type="number" value={uploadData.totalAmount} onChange={e => setUploadData({ ...uploadData, totalAmount: parseFloat(e.target.value) })} placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Invoice File</label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: card.border }}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" id="invoice-file" />
                  <label htmlFor="invoice-file" className="cursor-pointer">
                    {uploadData.file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText size={24} style={{ color: card.primary }} />
                        <span style={{ color: card.text }}>{uploadData.file.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} className="mx-auto mb-2" style={{ color: card.subtle }} />
                        <p className="text-sm" style={{ color: card.text }}>Click to upload invoice file</p>
                        <p className="text-xs" style={{ color: card.subtle }}>PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: card.border }}>
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>
                Cancel
              </button>
              <button onClick={handleUploadSubmit} disabled={!uploadData.file || !uploadData.supplierId || isUploading} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2" style={{ background: card.primary, opacity: (!uploadData.file || !uploadData.supplierId || isUploading) ? 0.5 : 1 }}>
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {isUploading ? 'Uploading...' : 'Upload Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-2xl border overflow-hidden" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.success, color: '#fff' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Make Payment</h2>
                  <p className="text-xs" style={{ color: card.muted }}>{selectedInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl" style={{ background: card.inputBg }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: card.muted }}>Total Amount:</span>
                  <span className="font-mono text-sm font-bold" style={{ color: card.text }}>GH₵ {selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: card.muted }}>Already Paid:</span>
                  <span className="font-mono text-sm font-medium" style={{ color: card.success }}>GH₵ {selectedInvoice.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: card.border }}>
                  <span className="text-sm font-medium" style={{ color: card.text }}>Remaining Balance:</span>
                  <span className="font-mono text-lg font-bold" style={{ color: card.primary }}>GH₵ {selectedInvoice.balance.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Payment Amount (GH₵)</label>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))} max={selectedInvoice.balance} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Payment Note (Optional)</label>
                <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none resize-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: card.border }}>
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>
                Cancel
              </button>
              <button onClick={handlePayment} disabled={paymentAmount <= 0 || paymentAmount > selectedInvoice.balance} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: card.success, opacity: (paymentAmount <= 0 || paymentAmount > selectedInvoice.balance) ? 0.5 : 1 }}>
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
