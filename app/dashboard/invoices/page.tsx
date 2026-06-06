'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  Upload, FileText, DollarSign, Calendar, AlertCircle, CheckCircle,
  Clock, TrendingUp, TrendingDown, Plus, Search, Filter, Download,
  Eye, Edit, Trash2, CreditCard, Building2, ChevronRight, X,
  Save, Loader2, Receipt, BarChart3, PieChart, ArrowUpRight,
  ArrowDownRight, Bell, Settings, RefreshCw, Sparkles, User
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePagination } from '@/hooks/use-pagination';
import { gql, M_RECEIVE_INVOICE, Q_INVOICES } from '@/lib/gql';
import { useToast } from '@/components/pharma-toast';

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
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { suppliers, products, me, refetchPurchases, createSupplier, createProduct } = useStore();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'upload' | 'analytics'>('invoices');
  const [invoiceRecords, setInvoiceRecords] = useState<any[]>([]);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  // Manual Ledger
  const [showManualLedger, setShowManualLedger] = useState(false);
  const [manualData, setManualData] = useState({
    supplierId: '',
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
  });
  const [manualSupplierDraft, setManualSupplierDraft] = useState('');
  const [manualCreateSupplierOnSubmit, setManualCreateSupplierOnSubmit] = useState(false);
  const [manualLineItems, setManualLineItems] = useState<any[]>([]);
  const [isProcessingManual, setIsProcessingManual] = useState(false);

  // Invoice Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!me?.branchId) return;
      try {
        const data = await gql<{ invoices: any[] }>(Q_INVOICES, { branchId: me.branchId });
        setInvoiceRecords(data.invoices ?? []);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      }
    };

    fetchInvoices();
  }, [me?.branchId]);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

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
    success: isDark ? '#10B981' : '#10B981',
    successBg: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.1)',
    warning: isDark ? '#F59E0B' : '#F59E0B',
    danger: isDark ? '#EF4444' : '#EF4444',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
  };

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/graphql', '') || 'http://localhost:4000';
  const invoiceAnalyzeEndpoints = [
    `${apiBaseUrl}/api/invoice/analyze`,
    'http://127.0.0.1:4000/api/invoice/analyze',
    'http://localhost:4000/api/invoice/analyze',
  ];

  const toDateText = (value?: string) => {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
  };

  const toIsoDateOrFallback = (dateText?: string) => {
    if (!dateText) return new Date().toISOString();
    const dt = new Date(dateText);
    return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
  };

  const getSupplierMatchByName = (supplierName: string) => {
    const normalized = supplierName.trim().toLowerCase();
    if (!normalized) return undefined;
    return suppliers.find(s => {
      const n = s.name.toLowerCase();
      return n.includes(normalized) || normalized.includes(n);
    });
  };

  const manualQueuedProducts = manualLineItems.filter((item: any) =>
    !item.productId &&
    Boolean(item.createProductOnSubmit) &&
    Boolean((item.productName || '').trim())
  );

  const manualResolvedSupplierLabel = manualData.supplierId
    ? suppliers.find(s => s.id === manualData.supplierId)?.name || 'Selected supplier'
    : (manualSupplierDraft.trim() || 'Not set');

  const manualWillCreateSupplier = !manualData.supplierId && Boolean(manualCreateSupplierOnSubmit && manualSupplierDraft.trim());

  const uploadFileSizeMb = uploadData.file
    ? `${(uploadData.file.size / (1024 * 1024)).toFixed(2)} MB`
    : 'N/A';

  const uploadHasBranch = Boolean(me?.branchId);

  const invoices = useMemo(() => {
    return invoiceRecords.map((invoice: any) => {
      const totalAmount = Number(invoice.total || 0);
      const paidAmount = Number(invoice.paidAmount || 0);
      const balance = Number(invoice.balance ?? Math.max(0, totalAmount - paidAmount));
      const paymentStatus = (invoice.paymentStatus || 'UNPAID').toUpperCase();
      const dueDate = toDateText(invoice.dueDate);
      const isOverdue = Boolean(dueDate) && new Date(dueDate) < new Date() && balance > 0;

      const derivedStatus = paymentStatus === 'PAID'
        ? 'PAID'
        : (isOverdue ? 'OVERDUE' : 'PENDING');

      const safeStatus = INVOICE_STATUS[derivedStatus as keyof typeof INVOICE_STATUS] ? derivedStatus : 'PENDING';
      return {
        id: invoice.id,
        supplier: invoice.supplier?.name || 'Unknown Supplier',
        invoiceNumber: invoice.invoiceNo || `INV-${invoice.id.slice(-6).toUpperCase()}`,
        issueDate: toDateText(invoice.issueDate),
        dueDate,
        totalAmount,
        paidAmount,
        balance,
        status: safeStatus,
        paymentStatus,
        category: invoice.type || 'PURCHASE',
        fileUrl: '',
        payments: invoice.payments || [],
        uploadedBy: invoice.uploadedBy,
      };
    });
  }, [invoiceRecords]);

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
    if (!uploadData.file) {
      addToast({
        type: 'warning',
        title: 'File Required',
        message: 'Please select a file to upload.',
        duration: 5000,
      });
      return;
    }

    const branchId = me?.branchId || '';
    if (!branchId) {
      addToast({
        type: 'error',
        title: 'Branch Missing',
        message: 'No branch is assigned to your account. Please re-login or contact admin.',
        duration: 6000,
      });
      return;
    }
    
    setIsUploading(true);
    try {
      // Analyze the invoice using AI
      let items: any[] = [];
      let extractedSupplierId = '';
      let extractedSupplierName = '';
      let extractedInvoiceNumber = '';
      let extractedIssueDate = new Date().toISOString().split('T')[0];
      let extractedTotal = 0;

      console.log('🚀 [AI_UPLOAD] Starting AI analysis...');
      const formData = new FormData();
      formData.append('file', uploadData.file);

      let data: any = null;
      let lastFetchError: unknown = null;

      for (const endpoint of invoiceAnalyzeEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            lastFetchError = new Error(`AI analysis failed (${response.status})`);
            continue;
          }

          data = await response.json();
          break;
        } catch (error) {
          lastFetchError = error;
        }
      }

      if (!data) {
        throw lastFetchError || new Error('AI analysis failed');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ [AI_UPLOAD] AI Analysis result:', data);

      if (data.supplierName) {
        extractedSupplierName = String(data.supplierName || '').trim();
        const match = getSupplierMatchByName(extractedSupplierName);
        if (match) extractedSupplierId = match.id;
      }

      if (data.invoiceNumber) {
        extractedInvoiceNumber = data.invoiceNumber;
      }

      if (data.invoiceDate) {
        extractedIssueDate = data.invoiceDate;
      }

      if (data.total) {
        extractedTotal = Number(data.total) || 0;
      }

      if (data.items && data.items.length > 0) {
        items = data.items.map((i: any) => ({
          productId: products.find((p: any) => p.name.toLowerCase().includes((i.name || '').toLowerCase()))?.id || '',
          name: (i.name || 'Unnamed Item').trim(),
          quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
          unitCost: Math.max(0, Number(i.unitCost) || 0),
          batchNo: i.batchNo || '',
          expiryDate: i.expiryDate || '',
        }));
      }

      setManualData({
        supplierId: extractedSupplierId || '',
        invoiceNumber: extractedInvoiceNumber || `AI-${Date.now()}`,
        issueDate: extractedIssueDate ? toIsoDateOrFallback(extractedIssueDate).split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: '',
      });
      
      if (!extractedSupplierId && extractedSupplierName) {
        setManualSupplierDraft(extractedSupplierName);
        setManualCreateSupplierOnSubmit(true);
      } else {
        setManualSupplierDraft('');
        setManualCreateSupplierOnSubmit(false);
      }

      const newManualItems = items.map((item, index) => {
        let pId = item.productId;
        let createOnSubmit = false;
        let existingSellingPrice = 0;

        if (!pId && item.name) {
          const existingProduct = products.find((p: any) => {
            const n = (p.name || '').toLowerCase();
            const d = item.name.toLowerCase();
            return n.includes(d) || d.includes(n);
          });

          if (existingProduct?.id) {
            pId = existingProduct.id;
            existingSellingPrice = existingProduct.sellingPrice || 0;
          } else {
            createOnSubmit = true;
          }
        } else if (pId) {
           const existingProduct = products.find((p: any) => p.id === pId);
           if (existingProduct) {
             existingSellingPrice = existingProduct.sellingPrice || 0;
           }
        }

        const calculatedSellingPrice = existingSellingPrice > 0 
          ? existingSellingPrice 
          : Math.max(0, Number(item.unitCost) || 0) * 1.3;

        return {
          id: Date.now().toString() + index,
          productId: pId,
          productName: item.name || '',
          createProductOnSubmit: createOnSubmit,
          quantity: item.quantity || 1,
          unitCost: Math.max(0, Number(item.unitCost) || 0),
          sellingPrice: Number(calculatedSellingPrice.toFixed(2)),
          batchNo: item.batchNo || '',
          expiryDate: item.expiryDate ? toIsoDateOrFallback(item.expiryDate).split('T')[0] : '',
        };
      });

      setManualLineItems(newManualItems);

      addToast({
        type: 'success',
        title: 'AI Processing Complete',
        message: 'Please review the extracted items, set selling prices, and submit.',
        duration: 5000,
      });

      setShowUploadModal(false);
      setUploadData({ file: null });
      setShowManualLedger(true);
    } catch (error: any) {
      console.error('❌ [AI_UPLOAD] Upload failed:', error);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: error?.message || 'Unknown error',
        duration: 6000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addManualLineItem = () => {
    setManualLineItems([...manualLineItems, {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      createProductOnSubmit: false,
      quantity: 1,
      unitCost: 0,
      sellingPrice: 0,
      batchNo: '',
      expiryDate: '',
    }]);
  };

  const removeManualLineItem = (id: string) => {
    setManualLineItems(manualLineItems.filter(item => item.id !== id));
  };

  const updateManualLineItem = (id: string, field: string, value: any) => {
    setManualLineItems(manualLineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleManualSubmit = async () => {
    if ((!manualData.supplierId && !(manualCreateSupplierOnSubmit && manualSupplierDraft.trim())) || !manualData.invoiceNumber) {
      addToast({
        type: 'warning',
        title: 'Missing Required Fields',
        message: 'Provide supplier (or new supplier draft) and invoice number.',
        duration: 5000,
      });
      return;
    }

    const branchId = me?.branchId || '';
    if (!branchId) {
      addToast({
        type: 'error',
        title: 'Branch Missing',
        message: 'No branch is assigned to your account. Please re-login or contact admin.',
        duration: 6000,
      });
      return;
    }

    if (manualLineItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Line Items',
        message: 'Please add at least one line item.',
        duration: 5000,
      });
      return;
    }

    setIsProcessingManual(true);
    try {
      let resolvedSupplierId = manualData.supplierId;
      const supplierDraft = manualSupplierDraft.trim();

      if (!resolvedSupplierId && supplierDraft) {
        const existingSupplier = getSupplierMatchByName(supplierDraft);
        if (existingSupplier) {
          resolvedSupplierId = existingSupplier.id;
        } else if (manualCreateSupplierOnSubmit) {
          const createdSupplier = await createSupplier({
            name: supplierDraft,
            categories: ['GENERAL'],
          });
          resolvedSupplierId = createdSupplier.id;
        }
      }

      if (!resolvedSupplierId) {
        addToast({
          type: 'warning',
          title: 'Supplier Required',
          message: 'Select an existing supplier or enable new supplier creation.',
          duration: 5000,
        });
        return;
      }

      const normalizedItems: any[] = [];

      for (const item of manualLineItems) {
        let resolvedProductId = item.productId;
        const draftProductName = (item.productName || '').trim();

        if (!resolvedProductId && item.createProductOnSubmit && draftProductName) {
          const existingProduct = products.find((p: any) => {
            const n = (p.name || '').toLowerCase();
            const d = draftProductName.toLowerCase();
            return n.includes(d) || d.includes(n);
          });
          if (existingProduct?.id) {
            resolvedProductId = existingProduct.id;
          } else {
            const createdProduct = await createProduct({
              name: draftProductName,
              category: 'MISCELLANEOUS',
              costPrice: Math.max(0, Number(item.unitCost) || 0),
              sellingPrice: Math.max(0, Number(item.unitCost) || 0) * 1.3,
              stockQuantity: 0,
              supplierId: resolvedSupplierId,
              dosageForm: 'OTHER',
            });
            resolvedProductId = createdProduct.id;
          }
        }

        if (!resolvedProductId) continue;

        normalizedItems.push({
          productId: resolvedProductId,
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
          unitCost: Math.max(0, Number(item.unitCost) || 0),
          sellingPrice: Math.max(0, Number(item.sellingPrice) || 0),
          batchNo: item.batchNo || `BATCH-${Date.now()}`,
          expiryDate: item.expiryDate ? toIsoDateOrFallback(item.expiryDate) : new Date(Date.now() + 365 * 86400000).toISOString(),
        });
      }

      if (normalizedItems.length === 0) {
        addToast({
          type: 'warning',
          title: 'No Usable Items',
          message: 'Select products or provide new product names with create-on-submit enabled.',
          duration: 6000,
        });
        return;
      }

      const payload = {
        branchId,
        supplierId: resolvedSupplierId,
        invoiceNo: manualData.invoiceNumber,
        invoiceDate: toIsoDateOrFallback(manualData.issueDate),
        dueDate: manualData.dueDate ? toIsoDateOrFallback(manualData.dueDate) : undefined,
        items: normalizedItems,
        tax: 0,
        notes: 'Manual invoice entry',
      };

      console.log('📤 [MANUAL_ENTRY] Creating invoice with payload:', payload);
      
      await gql(M_RECEIVE_INVOICE, payload);
      
      console.log('✅ [MANUAL_ENTRY] Invoice created successfully');
      addToast({
        type: 'success',
        title: 'Invoice Created',
        message: 'Manual invoice has been received and inventory updated.',
        duration: 5000,
      });
      
      if (me?.branchId) {
        const data = await gql<{ invoices: any[] }>(Q_INVOICES, { branchId: me.branchId });
        setInvoiceRecords(data.invoices ?? []);
      }
      await refetchPurchases();
      setShowManualLedger(false);
      setManualData({
        supplierId: '',
        invoiceNumber: '',
        issueDate: '',
        dueDate: '',
      });
      setManualSupplierDraft('');
      setManualCreateSupplierOnSubmit(false);
      setManualLineItems([]);
    } catch (error: any) {
      console.error('❌ [MANUAL_ENTRY] Upload failed:', error);
      addToast({
        type: 'error',
        title: 'Manual Entry Failed',
        message: error?.message || 'Unknown error',
        duration: 6000,
      });
    } finally {
      setIsProcessingManual(false);
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
            <div className="flex gap-2">
              <button onClick={() => setShowManualLedger(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primary, color: '#fff' }}>
                <FileText size={14} />
                Manual Entry
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Download size={14} />
                Export
              </button>
            </div>
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
                        <div className="flex flex-col gap-1">
                          <p className="font-mono text-sm font-medium" style={{ color: card.primary }}>{invoice.invoiceNumber}</p>
                          {invoice.uploadedBy?.name && (
                            <div className="flex items-center gap-1">
                              <User size={10} style={{ color: card.subtle }} />
                              <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: card.subtle }}>
                                By {invoice.uploadedBy.name}
                              </p>
                            </div>
                          )}
                        </div>
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
              <div className="mb-4 p-4 rounded-xl" style={{ background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)', borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)' }}>
                <div className="flex items-start gap-3">
                  <Sparkles size={20} style={{ color: '#8B5CF6' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: card.text }}>AI-Powered Invoice Processing</p>
                    <p className="text-xs" style={{ color: card.muted }}>Upload your invoice document. Our AI will automatically extract the supplier, invoice number, dates, and line items from the document.</p>
                  </div>
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

              <div className="p-4 rounded-xl border" style={{ background: card.inputBg, borderColor: card.border }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: card.primary }}>Processing Preview</p>
                <div className="space-y-1 text-xs font-medium" style={{ color: card.text }}>
                  <p>File: {uploadData.file?.name || 'Not selected'}</p>
                  <p>Size: {uploadFileSizeMb}</p>
                  <p>Supplier Action: Auto-detect and match existing supplier</p>
                  <p>Product Action: Auto-detect and map to existing products</p>
                  <p>{uploadData.file ? 'Mode: AI extraction + auto-submit' : 'Mode: Waiting for file selection'}</p>
                </div>
                {!uploadHasBranch && (
                  <p className="mt-2 text-[11px] font-semibold" style={{ color: card.danger }}>
                    Branch assignment missing. Upload will be blocked until your account has a branch.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: card.border }}>
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>
                Cancel
              </button>
              <button 
                onClick={handleUploadSubmit} 
                disabled={!uploadData.file || isUploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2" 
                style={{ background: card.primary, opacity: (!uploadData.file || isUploading) ? 0.5 : 1 }}
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {isUploading ? 'Processing...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Ledger Modal */}
      {showManualLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-4xl rounded-2xl border overflow-hidden" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Manual Invoice Entry</h2>
                  <p className="text-xs" style={{ color: card.muted }}>Manually enter invoice details</p>
                </div>
              </div>
              <button onClick={() => setShowManualLedger(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Supplier</label>
                  <select value={manualData.supplierId} onChange={e => setManualData({ ...manualData, supplierId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, borderColor: card.border, color: card.text }}>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {!manualData.supplierId && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={manualSupplierDraft}
                        onChange={e => setManualSupplierDraft(e.target.value)}
                        placeholder="Type new supplier name"
                        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: card.inputBg, borderColor: card.border, color: card.text }}
                      />
                      <label className="flex items-center gap-2 text-xs font-medium" style={{ color: card.muted }}>
                        <input
                          type="checkbox"
                          checked={manualCreateSupplierOnSubmit}
                          onChange={(e) => setManualCreateSupplierOnSubmit(e.target.checked)}
                        />
                        Create supplier on submit if it does not exist
                      </label>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Invoice Number</label>
                  <input type="text" value={manualData.invoiceNumber} onChange={e => setManualData({ ...manualData, invoiceNumber: e.target.value })} placeholder="INV-2026-001" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, borderColor: card.border, color: card.text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Issue Date</label>
                  <input type="date" value={manualData.issueDate} onChange={e => setManualData({ ...manualData, issueDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, borderColor: card.border, color: card.text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Due Date</label>
                  <input type="date" value={manualData.dueDate} onChange={e => setManualData({ ...manualData, dueDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, borderColor: card.border, color: card.text }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.muted }}>Line Items</label>
                  <button onClick={addManualLineItem} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: card.primary, color: '#fff' }}>
                    + Add Item
                  </button>
                </div>
                
                {manualLineItems.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: card.border }}>
                    <p className="text-sm" style={{ color: card.subtle }}>No line items added yet</p>
                    <p className="text-xs" style={{ color: card.muted }}>Click "Add Item" to add products</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {manualLineItems.map((item) => (
                      <div key={item.id} className="p-3 rounded-xl border" style={{ background: card.inputBg, borderColor: card.border }}>
                        <div className="grid grid-cols-6 gap-2 mb-2">
                          <div className="col-span-2">
                            <select 
                              value={item.productId} 
                              onChange={e => updateManualLineItem(item.id, 'productId', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none" 
                              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, color: card.text }}
                            >
                              <option value="">Select product...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {!item.productId && (
                              <div className="mt-2 space-y-2">
                                <input
                                  type="text"
                                  value={item.productName || ''}
                                  onChange={e => updateManualLineItem(item.id, 'productName', e.target.value)}
                                  placeholder="Or type new product name"
                                  className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                                  style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, color: card.text }}
                                />
                                <label className="flex items-center gap-2 text-[11px]" style={{ color: card.muted }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.createProductOnSubmit)}
                                    onChange={(e) => updateManualLineItem(item.id, 'createProductOnSubmit', e.target.checked)}
                                  />
                                  Create this product on submit if missing
                                </label>
                              </div>
                            )}
                          </div>
                          <div>
                            <input 
                              type="text" 
                              value={item.batchNo} 
                              onChange={e => updateManualLineItem(item.id, 'batchNo', e.target.value)}
                              placeholder="Batch No" 
                              className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none" 
                              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, color: card.text }} 
                            />
                          </div>
                          <div>
                            <input 
                              type="number" 
                              value={item.quantity} 
                              onChange={e => updateManualLineItem(item.id, 'quantity', parseFloat(e.target.value))}
                              placeholder="Qty" 
                              className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none" 
                              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, color: card.text }} 
                            />
                          </div>
                          <div>
                            <input 
                              type="number" 
                              value={item.unitCost} 
                              onChange={e => updateManualLineItem(item.id, 'unitCost', parseFloat(e.target.value))}
                              placeholder="Unit Cost" 
                              className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none" 
                              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, color: card.text }} 
                            />
                          </div>
                          <div>
                            <input 
                              type="number" 
                              value={item.sellingPrice} 
                              onChange={e => updateManualLineItem(item.id, 'sellingPrice', parseFloat(e.target.value))}
                              placeholder="Sell Price" 
                              className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none" 
                              style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, color: card.text }} 
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => removeManualLineItem(item.id)}
                            className="text-xs px-2 py-1 rounded-lg" 
                            style={{ background: card.danger, color: '#fff' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border" style={{ background: card.inputBg, borderColor: card.border }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: card.primary }}>Submission Preview</p>
                <div className="space-y-1 text-xs font-medium" style={{ color: card.text }}>
                  <p>Supplier: {manualResolvedSupplierLabel}</p>
                  <p>{manualWillCreateSupplier ? 'Supplier Action: Create new supplier on submit' : 'Supplier Action: Use existing supplier'}</p>
                  <p>Line Items: {manualLineItems.length}</p>
                  <p>New Products to Create: {manualQueuedProducts.length}</p>
                </div>
                {manualQueuedProducts.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg border max-h-24 overflow-y-auto" style={{ borderColor: card.border }}>
                    {manualQueuedProducts.slice(0, 6).map((item: any) => (
                      <p key={item.id} className="text-[11px]" style={{ color: card.muted }}>
                        • {item.productName}
                      </p>
                    ))}
                    {manualQueuedProducts.length > 6 && (
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.subtle }}>
                        +{manualQueuedProducts.length - 6} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: card.border }}>
              <button onClick={() => setShowManualLedger(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: card.inputBg, color: card.text }}>
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit} 
                disabled={
                  isProcessingManual ||
                  (!manualData.supplierId && !(manualCreateSupplierOnSubmit && manualSupplierDraft.trim())) ||
                  !manualData.invoiceNumber ||
                  manualLineItems.length === 0
                }
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2" 
                style={{
                  background: card.primary,
                  opacity: (
                    isProcessingManual ||
                    (!manualData.supplierId && !(manualCreateSupplierOnSubmit && manualSupplierDraft.trim())) ||
                    !manualData.invoiceNumber ||
                    manualLineItems.length === 0
                  ) ? 0.5 : 1
                }}
              >
                {isProcessingManual ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isProcessingManual ? 'Processing...' : 'Create Invoice'}
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
                <input 
                  type="number" 
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(parseFloat(e.target.value))} 
                  max={selectedInvoice.balance} 
                  className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" 
                  style={{ background: card.inputBg, borderColor: card.border, color: card.text }} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, borderColor: card.border, color: card.text }}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: card.muted }}>Payment Note (Optional)</label>
                <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none resize-none" style={{ background: card.inputBg, borderColor: card.border, color: card.text }} />
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
