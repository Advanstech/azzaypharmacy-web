'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, TrendingUp, TrendingDown, DollarSign, CreditCard,
  ShoppingCart, Users, Calendar, Download, RefreshCw, Eye, Edit,
  Trash2, Plus, BarChart3, PieChart, Clock, CheckCircle, AlertCircle,
  Package, Receipt, Printer, ArrowUpRight, ArrowDownRight, Star,
  Award, Target, Zap, Bell, Settings, MoreVertical, ChevronDown,
  ChevronRight, X, Save, Loader2, Activity, ArrowUp, RotateCcw
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { usePagination } from '@/hooks/use-pagination';
import { PharmaChart, MolecularBg, AnimatedCounter } from '@/components/pharma-chart';
import { useBranchFilter } from '@/lib/branch-context';
import { BranchBanner } from '@/components/BranchBanner';

const PAYMENT_METHODS = {
  CASH: { label: 'Cash', color: '#10B981', icon: '💵' },
  MOMO: { label: 'Mobile Money', color: '#0EA5E9', icon: '📱' },
  CARD: { label: 'Card', color: '#8B5CF6', icon: '💳' },
  NHIS: { label: 'NHIS', color: '#F59E0B', icon: '🏥' },
  CREDIT: { label: 'Credit', color: '#EF4444', icon: '💰' },
};

const SALES_METRICS = {
  DAILY: { label: 'Today', period: 'day' },
  WEEKLY: { label: 'This Week', period: 'week' },
  MONTHLY: { label: 'This Month', period: 'month' },
  YEARLY: { label: 'This Year', period: 'year' },
};

export default function EnhancedSalesPage() {
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { sales, loadingSales, refetchSales, me, products, customers, requestRefund, deleteSale } = useStore();
  const { user } = useAuth();

  const role = me?.role || user?.user_metadata?.role;
  const isManager = ['SE_ADMIN', 'ROOT', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');
  const canDeleteSales = ['ROOT', 'SE_ADMIN', 'OWNER'].includes(role || '');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [metricPeriod, setMetricPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('DAILY');

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [modalItemsPage, setModalItemsPage] = useState(1);

  // Redesigned Detail Modal refund states
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);
  const [showRefundInline, setShowRefundInline] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const handlePrint = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Optimized for 80mm thermal printer with high-contrast black & white clarity
    const itemsHtml = sale.items.map((item: any) => {
      const itemName = item.product?.name || 'Unknown Item';
      const qty = item.quantity;
      const price = item.unitPrice.toFixed(2);
      const total = (item.total || (item.quantity * item.unitPrice)).toFixed(2);
      return `
        <tr>
          <td style="padding: 8px 4px; font-size: 12px; font-weight: 700; color: #000; line-height: 1.3;">${itemName}</td>
          <td style="text-align: center; padding: 8px 4px; font-size: 12px; font-weight: 600; width: 30px;">${qty}</td>
          <td style="text-align: right; padding: 8px 4px; font-size: 12px; font-weight: 600; width: 50px;">${price}</td>
          <td style="text-align: right; padding: 8px 4px; font-size: 12px; font-weight: 800; width: 55px;">${total}</td>
        </tr>
      `;
    }).join('');

    const discountRow = sale.discountAmt > 0 ? `
      <tr style="border-top: 2px solid #000;">
        <td colspan="3" style="padding: 6px 4px; font-size: 12px; font-weight: 700;">Discount:</td>
        <td style="text-align: right; padding: 6px 4px; font-size: 12px; font-weight: 800;">-${Number(sale.discountAmt).toFixed(2)}</td>
      </tr>
    ` : '';

    const taxRow = (sale.vat > 0 || sale.nhil > 0 || sale.getfund > 0) ? `
      <tr>
        <td colspan="3" style="padding: 4px 4px; font-size: 11px; font-weight: 600;">Taxes:</td>
        <td style="text-align: right; padding: 4px 4px; font-size: 11px; font-weight: 600;">${(Number(sale.vat || 0) + Number(sale.nhil || 0) + Number(sale.getfund || 0)).toFixed(2)}</td>
      </tr>
    ` : '';

    const isRefunded = sale.status === 'REFUNDED' || sale.isRefunded;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale.receiptNo || sale.id.slice(-8).toUpperCase()}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif;
              width: 80mm;
              max-width: 80mm;
              padding: 5mm;
              font-size: 12px;
              line-height: 1.5;
              color: #000;
              background: #fff;
              -webkit-font-smoothing: none;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .store-name {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 6px;
              letter-spacing: 2px;
              color: #000;
            }
            .store-info {
              font-size: 11px;
              font-weight: 700;
              margin-bottom: 3px;
              color: #000;
            }
            .divider {
              border-top: 3px solid #000;
              margin: 10px 0;
              height: 0;
            }
            .divider-dashed {
              border-top: 3px dashed #000;
              margin: 10px 0;
              height: 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 700;
              margin: 4px 0;
              color: #000;
            }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            thead th {
              font-size: 11px;
              font-weight: 900;
              text-align: left;
              padding: 8px 4px;
              border-bottom: 3px solid #000;
              color: #000;
              text-transform: uppercase;
            }
            thead th:nth-child(2) { text-align: center; }
            thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
            tbody td { vertical-align: top; border-bottom: 1px solid #000; }
            .totals-section {
              margin-top: 10px;
              border-top: 3px solid #000;
              padding-top: 8px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: 900;
              padding: 8px 0;
              color: #000;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 700;
              padding: 4px 0;
              color: #000;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              font-weight: 700;
              margin-top: 12px;
              padding-top: 10px;
              border-top: 3px dashed #000;
              color: #000;
            }
            .footer p { margin: 4px 0; }
            .barcode {
              font-family: 'Courier New', monospace;
              font-size: 22px;
              font-weight: 900;
              text-align: center;
              margin: 10px 0;
              letter-spacing: 3px;
            }
            .refunded-badge {
              text-align: center;
              background: #000;
              color: #fff;
              font-size: 14px;
              font-weight: 900;
              padding: 6px 16px;
              margin: 10px 0;
              text-transform: uppercase;
            }
            @media print {
              body { width: 80mm; max-width: 80mm; padding: 4mm; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="store-name">AZZAY PHARMACY</div>
            <div class="store-info">Accra, Ghana</div>
            <div class="store-info">Tel: +233 24 000 0000</div>
            <div class="store-info">TIN: C0001234567</div>
          </div>

          <div class="divider"></div>

          <div class="info-row">
            <span>Receipt #:</span>
            <span>${sale.receiptNo || sale.id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(sale.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="info-row">
            <span>Cashier:</span>
            <span>${sale.user?.name || 'Staff'}</span>
          </div>
          <div class="info-row">
            <span>Customer:</span>
            <span>${sale.customerName || 'Walk-in'}</span>
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-section">
            ${discountRow}
            ${taxRow}
            <div class="total-row">
              <span>TOTAL:</span>
              <span>GH₵ ${sale.totalAmount.toFixed(2)}</span>
            </div>
            <div class="payment-row">
              <span>Amount Paid:</span>
              <span>GH₵ ${sale.amountPaid.toFixed(2)}</span>
            </div>
            <div class="payment-row">
              <span>Change:</span>
              <span>GH₵ ${sale.change.toFixed(2)}</span>
            </div>
            <div class="payment-row" style="margin-top: 8px;">
              <span>Method:</span>
              <span>${sale.paymentMethod}</span>
            </div>
          </div>

          ${isRefunded ? `
            <div class="divider"></div>
            <div class="refunded-badge">*** REFUNDED ***</div>
          ` : ''}

          <div class="divider-dashed"></div>

          <div class="footer">
            <p style="font-size: 13px;">Thank you for your patronage!</p>
            <p>Items sold are not returnable unless defective.</p>
            <p>Keep this receipt for returns within 48 hours.</p>
            <div class="barcode">${sale.receiptNo || sale.id.slice(-8)}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 100);
              }, 200);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPdf = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsHtml = sale.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 10px; color: #333;">
          <div style="font-weight: 600;">${item.product?.name || 'Item'}</div>
          <div style="font-size: 11px; color: #777;">Code: ${item.product?.sku || 'N/A'}</div>
        </td>
        <td style="text-align: center; padding: 12px 10px; color: #555;">${item.quantity}</td>
        <td style="text-align: right; padding: 12px 10px; color: #555;">GH₵ ${item.unitPrice.toFixed(2)}</td>
        <td style="text-align: right; padding: 12px 10px; font-weight: 600; color: #111;">GH₵ ${(item.total || (item.quantity * item.unitPrice)).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${sale.receiptNo || sale.id.slice(-8).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; background: #f8fafc; margin: 0; padding: 40px; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 50px; border: 1px solid #eaeaea; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 30px; }
            .brand { display: flex; flex-direction: column; }
            .brand h1 { font-size: 32px; font-weight: 800; color: #0284C7; margin: 0; letter-spacing: -0.5px; }
            .brand p { font-size: 13px; color: #666; margin: 4px 0 0 0; line-height: 1.5; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { font-size: 26px; font-weight: 800; color: #111; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
            .invoice-details p { font-size: 13px; color: #555; margin: 3px 0; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 12px; }
            .info-box { width: 48%; }
            .info-box h3 { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 700; }
            .info-box p { font-size: 14px; color: #0f172a; margin: 0; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px 10px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
            th:nth-child(2) { text-align: center; }
            th:nth-child(3), th:nth-child(4) { text-align: right; }
            .totals { width: 100%; display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-table { width: 350px; border-collapse: collapse; }
            .totals-table td { padding: 10px; border-bottom: 1px solid #f8fafc; font-size: 14px; }
            .totals-table td:first-child { color: #64748b; font-weight: 500; }
            .totals-table td:last-child { text-align: right; font-weight: 600; color: #0f172a; }
            .totals-table tr.grand-total td { font-size: 18px; font-weight: 800; color: #0284C7; border-bottom: none; border-top: 2px solid #e2e8f0; padding-top: 15px; }
            .footer { text-align: center; border-top: 1px solid #eaeaea; padding-top: 30px; font-size: 12px; color: #64748b; line-height: 1.6; }
            .footer p { margin: 4px 0; }
            .status-badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 12px; letter-spacing: 0.5px; }
            .status-paid { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
            .status-refunded { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            @media print {
              body { background: #fff; padding: 0; }
              .invoice-container { box-shadow: none; border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="brand">
                <h1>AZZAY PHARMA PRO</h1>
                <p>123 Health Avenue, Medical District</p>
                <p>Accra, Ghana</p>
                <p>Tel: +233 24 000 0000 | Email: contact@azzaypharma.com</p>
              </div>
              <div class="invoice-details">
                <h2>Tax Invoice</h2>
                <p><strong>Receipt #:</strong> ${sale.receiptNo || sale.id.slice(-8).toUpperCase()}</p>
                <p><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p><strong>Time:</strong> ${new Date(sale.createdAt).toLocaleTimeString()}</p>
                <div class="status-badge ${sale.status === 'REFUNDED' ? 'status-refunded' : 'status-paid'}">
                  ${sale.status === 'REFUNDED' ? 'REFUNDED' : 'PAID'}
                </div>
              </div>
            </div>

            <div class="info-section">
              <div class="info-box">
                <h3>Billed To</h3>
                <p>${sale.customerName || 'Walk-in Customer'}</p>
                ${sale.customer ? `<p style="font-size: 12px; color: #64748b; font-weight: 500; margin-top: 4px;">Loyalty Member</p>` : ''}
              </div>
              <div class="info-box" style="text-align: right;">
                <h3>Cashier</h3>
                <p>${sale.user?.name || 'System Staff'}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals">
              <table class="totals-table">
                <tr>
                  <td>Subtotal</td>
                  <td>GH₵ ${((sale.totalAmount || 0) + (sale.discountAmt || 0)).toFixed(2)}</td>
                </tr>
                ${sale.discountAmt > 0 ? `
                <tr>
                  <td>Discount</td>
                  <td style="color: #ef4444;">-GH₵ ${Number(sale.discountAmt).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${(sale.vat > 0 || sale.nhil > 0 || sale.getfund > 0) ? `
                <tr>
                  <td>Taxes (VAT/NHIL/GETFund)</td>
                  <td>GH₵ ${(Number(sale.vat || 0) + Number(sale.nhil || 0) + Number(sale.getfund || 0)).toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="grand-total">
                  <td>Grand Total</td>
                  <td>GH₵ ${(sale.totalAmount || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Amount Paid</td>
                  <td>GH₵ ${(sale.amountPaid || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Change</td>
                  <td>GH₵ ${(sale.change || 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div class="footer">
              <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Thank you for your business!</p>
              <p>Items returned within 48 hours are subject to our return policies. Valid receipt required.</p>
              <p style="margin-top: 20px; color: #cbd5e1;">System Generated Document &bull; Azzay Pharma Pro</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                // Close after a delay to allow the print dialog to open and close
                setTimeout(() => window.close(), 500);
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExecuteRefund = async (saleId: string) => {
    if (!refundReason.trim()) return;
    setProcessingRefund(true);
    try {
      await requestRefund(saleId, refundReason);
      setRefundReason('');
      setShowRefundInline(false);
      // Update selectedSale locally to reflect the change
      setSelectedSale((prev: any) => prev ? { ...prev, status: 'REFUNDED', isRefunded: true, refundReason } : null);

      await refetchSales();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to execute refund: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleExecuteDelete = async (saleId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this sale? This action is permanent, will restore stock quantities, and remove ledger entries.')) {
      return;
    }
    setProcessingDelete(true);
    try {
      await deleteSale(saleId);
      setShowDetailsModal(false);
      setSelectedSale(null);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete sale: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessingDelete(false);
    }
  };

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

  // Branch filter
  const branchFilter = useBranchFilter();
  const branchSales = useMemo(() => branchFilter(sales), [branchFilter, sales]);

  // Enhanced sales data with analytics
  const enrichedSales = useMemo(() => {
    return branchSales.map(sale => ({
      ...sale,
      profit: sale.totalAmount * 0.3, // Assuming 30% profit margin
      itemsCount: sale.items?.length || 0,
      customerType: (sale as any).customerId ? 'Registered' : 'Walk-in',
      averageItemValue: sale.totalAmount / (sale.items?.length || 1),
      timeOfDay: new Date(sale.createdAt).getHours(),
      dayOfWeek: new Date(sale.createdAt).toLocaleDateString('en-US', { weekday: 'short' }),
    }));
  }, [branchSales]);

  // Filter sales
  const filteredSales = useMemo(() => {
    return enrichedSales.filter(sale => {
      const matchSearch = !search ||
        sale.id.toLowerCase().includes(search.toLowerCase()) ||
        ((sale as any).customerName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        ((sale as any).receiptNo?.toLowerCase() || '').includes(search.toLowerCase()) ||
        ((sale as any).user?.name?.toLowerCase() || '').includes(search.toLowerCase());

      const matchPayment = paymentFilter === 'all' || sale.paymentMethod === paymentFilter;
      const matchStatus = statusFilter === 'all' || (sale as any).status === statusFilter;
      
      const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
      const matchDateFrom = !dateFrom || saleDate >= dateFrom;
      const matchDateTo = !dateTo || saleDate <= dateTo;
      
      return matchSearch && matchPayment && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [enrichedSales, search, paymentFilter, statusFilter, dateFrom, dateTo]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const periodSales = filteredSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const now = new Date();
      
      switch (metricPeriod) {
        case 'DAILY':
          return saleDate.toDateString() === now.toDateString();
        case 'WEEKLY':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        case 'MONTHLY':
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'YEARLY':
          return saleDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });

    const totalRevenue = periodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = periodSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const totalTransactions = periodSales.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Payment method breakdown
    const paymentBreakdown = periodSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    // Top products
    const productSales = periodSales.flatMap(sale => sale.items || []);
    const topProducts = productSales.reduce((acc, item) => {
      const productId = (item as any).productId || item.product?.id;
      const existing = acc.find(p => p.productId === productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += (item as any).total || (item.quantity * item.unitPrice);
      } else {
        const productInfo = products.find(p => p.id === productId);
        acc.push({
          productId: productId,
          productName: item.product?.name || 'Unknown',
          quantity: item.quantity,
          revenue: (item as any).total || (item.quantity * item.unitPrice),
          stock: productInfo?.stockQuantity || 0,
        });
      }
      return acc;
    }, [] as any[]).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Hourly sales pattern
    const hourlySales = Array.from({ length: 24 }, (_, hour) => {
      const hourSales = periodSales.filter(sale => new Date(sale.createdAt).getHours() === hour);
      return {
        hour,
        revenue: hourSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        transactions: hourSales.length,
      };
    });

    // 3D Chart Data preparation (Day by Day)
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayMap: Record<string, number> = {};
    periodSales.forEach(s => {
      const d = new Date(s.createdAt).toLocaleDateString('en-GB', { weekday: 'short' });
      dayMap[d] = (dayMap[d] || 0) + s.totalAmount;
    });
    const trendData = days.map(d => ({ day: d, amount: dayMap[d] || 0 }));

    return {
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageTransaction,
      paymentBreakdown,
      topProducts,
      hourlySales,
      trendData,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }, [filteredSales, metricPeriod]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSales,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredSales,
    itemsPerPage: 5,
  });

  // Pagination for modal items
  const modalItemsPerPage = 5;
  const modalTotalPages = Math.ceil((selectedSale?.items?.length || 0) / modalItemsPerPage);
  const modalPaginatedItems = (selectedSale?.items || []).slice(
    (modalItemsPage - 1) * modalItemsPerPage,
    modalItemsPage * modalItemsPerPage
  );

  // Reset modal items page when sale changes
  useEffect(() => {
    setModalItemsPage(1);
  }, [selectedSale?.id]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BranchBanner />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Sales Analytics</h1>
          <p className="text-sm" style={{ color: card.muted }}>Real-time sales performance and customer insights</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F1F5F9' }}>
            {Object.entries(SALES_METRICS).map(([key, metric]) => (
              <button
                key={key}
                onClick={() => setMetricPeriod(key as any)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: metricPeriod === key ? card.primary : 'transparent',
                  color: metricPeriod === key ? (isDark ? '#060B14' : '#fff') : card.muted,
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {isManager && (
        <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Revenue', 
            value: `GH₵ ${metrics.totalRevenue >= 1000 ? (metrics.totalRevenue/1000).toFixed(1) + 'k' : metrics.totalRevenue.toFixed(2)}`, 
            sub: `${metrics.totalTransactions} transactions`,
            icon: DollarSign, 
            color: '#10B981',
            change: '+12.5%',
            changeType: 'increase' as const
          },
          { 
            label: 'Total Profit', 
            value: `GH₵ ${metrics.totalProfit >= 1000 ? (metrics.totalProfit/1000).toFixed(1) + 'k' : metrics.totalProfit.toFixed(2)}`, 
            sub: `${metrics.profitMargin.toFixed(1)}% margin`,
            icon: TrendingUp, 
            color: '#8B5CF6',
            change: '+8.2%',
            changeType: 'increase' as const
          },
          { 
            label: 'Avg Transaction', 
            value: `GH₵ ${metrics.averageTransaction.toFixed(0)}`, 
            sub: 'Per sale',
            icon: ShoppingCart, 
            color: '#0EA5E9',
            change: '-2.1%',
            changeType: 'decrease' as const
          },
          { 
            label: 'Top Product', 
            value: metrics.topProducts[0]?.productName?.split(' ')[0] || 'N/A', 
            sub: `${metrics.topProducts[0]?.quantity || 0} sold`,
            icon: Star, 
            color: '#F59E0B',
            change: '+5 new',
            changeType: 'increase' as const
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                    <Icon size={16} />
                  </div>
                  <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  {s.changeType === 'increase' ? (
                    <ArrowUpRight size={14} style={{ color: card.success }} />
                  ) : (
                    <ArrowDownRight size={14} style={{ color: card.danger }} />
                  )}
                  <span className="text-[10px] font-bold" style={{ color: s.changeType === 'increase' ? card.success : card.danger }}>
                    {s.change}
                  </span>
                </div>
              </div>
              <p className="font-display text-lg font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: card.muted }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 3D Revenue Trajectory Chart (Takes up 2 columns) */}
        <div className="lg:col-span-2 rounded-2xl border p-6 backdrop-blur-xl relative overflow-hidden"
          style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold" style={{ color: card.text }}>Revenue Trajectory</h3>
              <p className="text-[11px]" style={{ color: card.subtle }}>Pharmacokinetic momentum curve</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: card.primary }}>Period Total</p>
              <span className="font-display text-2xl font-bold" style={{ color: card.primary }}>
                <AnimatedCounter value={metrics.totalRevenue} prefix="GH₵ " isDark={isDark} duration={2000} />
              </span>
            </div>
          </div>
          <div className="-mx-4 -mb-4">
            <PharmaChart data={metrics.trendData} isDark={isDark} accent={card.primary} height={260} />
          </div>
          <MolecularBg isDark={isDark} />
        </div>

        {/* Payment Methods Breakdown (Takes up 1 column) */}
        <div className="rounded-2xl border p-5 backdrop-blur-xl flex flex-col" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
          <h3 className="font-display text-sm font-bold mb-1" style={{ color: card.text }}>Payment Methods</h3>
          <p className="text-[11px] mb-4" style={{ color: card.subtle }}>Method distribution across sales</p>
          <div className="space-y-4 flex-1">
            {Object.entries(metrics.paymentBreakdown).map(([method, amount]) => {
              const methodConfig = PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS];
              const percentage = (amount / metrics.totalRevenue) * 100;
              return (
                <div key={method} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24">
                    <span className="text-lg">{methodConfig?.icon}</span>
                    <span className="text-xs font-medium" style={{ color: card.text }}>{methodConfig?.label}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: methodConfig?.color }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: card.text }}>GH₵ {amount.toLocaleString()}</p>
                    <p className="text-[9px]" style={{ color: card.subtle }}>{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Products - Full Width Grid Element */}
      <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <h3 className="font-display text-sm font-bold mb-4" style={{ color: card.text }}>Top Moving SKUs</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {metrics.topProducts.map((product, index) => (
            <div key={product.productId} className="flex flex-col items-center justify-center p-4 rounded-xl text-center border transition-all hover:scale-[1.03]" style={{ background: isDark ? 'rgba(0,217,255,0.03)' : 'rgba(14,165,233,0.03)', borderColor: card.border }}>
              <div className="w-10 h-10 mb-3 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: card.primaryBg, color: card.primary }}>
                #{index + 1}
              </div>
              <p className="text-xs font-bold mb-1 line-clamp-1 w-full" style={{ color: card.text }}>{product.productName}</p>
              <p className="text-[10px] mb-2" style={{ color: card.subtle }}>
                {product.quantity} units dispensed • <span className={product.stock < 10 ? 'text-red-500 font-medium' : ''}>{product.stock} in stock</span>
              </p>
              <p className="text-sm font-mono font-bold" style={{ color: card.primary }}>GH₵ {product.revenue.toLocaleString()}</p>
            </div>
          ))}
          {metrics.topProducts.length === 0 && (
             <p className="text-xs text-center py-4 col-span-5" style={{ color: card.muted }}>No product data for this period</p>
          )}
        </div>
      </div>
        </>
      )}

      {/* Sales Table */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        {/* Filters */}
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
          <div className="flex gap-3 flex-1">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sales..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
            </div>
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}>
              <option value="all">All Payments</option>
              {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                <option key={key} value={key}>{method.label}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm focus:outline-none" style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }} />
          </div>
          <button onClick={() => refetchSales()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left relative">
            <thead className="sticky top-0 z-20" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderBottom: `1px solid ${card.border}` }}>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(248,250,252,0.95)' }}>
                {['Receipt', 'Time', 'Cashier', 'Items', 'Payment', 'Total', 'Profit', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: card.subtle, borderBottom: `1px solid ${card.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((sale, i) => {
                const methodConfig = PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS];
                const isProfitable = (sale.profit || 0) > 0;
                const isRefunded = (sale as any).status === 'REFUNDED' || (sale as any).isRefunded;
                
                return (
                  <tr key={sale.id} className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${isRefunded ? 'opacity-60 bg-red-50/30 dark:bg-red-900/10' : ''}`} style={{ borderBottom: i < paginatedSales.length - 1 ? `1px solid ${card.border}` : 'none' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowDetailsModal(true);
                          }}
                          className="font-mono text-xs font-semibold hover:underline transition-all text-left focus:outline-none focus:ring-1 focus:ring-sky-400 rounded px-1 -mx-1"
                          style={{ color: card.primary }}
                          title="View Details"
                        >
                          {(sale as any).receiptNo || sale.id.slice(-8).toUpperCase()}
                        </button>
                        {sale.customerType === 'Registered' && (
                          <Users size={12} style={{ color: card.success }} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: card.text }}>
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px]" style={{ color: card.subtle }}>
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: card.text }}>
                          {sale.user?.name?.split(' ')[0] || 'Unknown'}
                        </p>
                        <p className="text-[10px]" style={{ color: card.subtle }}>
                          {sale.user?.role?.replace('_', ' ') || 'Pharmacist'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: card.text }}>{sale.itemsCount}</p>
                        <p className="text-[10px]" style={{ color: card.subtle }}>
                          GH₵ {sale.averageItemValue.toFixed(0)} avg
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{methodConfig?.icon}</span>
                        <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: `${methodConfig?.color}18`, color: methodConfig?.color }}>
                          {methodConfig?.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className={`font-mono text-sm font-bold ${isRefunded ? 'line-through text-red-500' : ''}`} style={{ color: isRefunded ? '#EF4444' : card.text }}>
                        GH₵ {sale.totalAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <p className="font-mono text-sm font-bold" style={{ color: isProfitable ? card.success : card.danger }}>
                          {isProfitable ? '+' : ''}GH₵ {(sale.profit || 0).toLocaleString()}
                        </p>
                        {isProfitable && <TrendingUp size={12} style={{ color: card.success }} />}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {isRefunded ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg line-through" style={{ background: '#EF444418', color: '#EF4444' }}>
                          REFUNDED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: card.success + '18', color: card.success }}>
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedSale(sale); setShowDetailsModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-500" title="Print Receipt">
                          <Printer size={14} />
                        </button>
                        {isRefunded ? (
                          <span className="p-1.5 rounded-lg text-red-500" title="Already Refunded">
                            <RefreshCw size={14} />
                          </span>
                        ) : (
                          <button onClick={() => { setSelectedSale(sale); setShowRefundModal(true); }} className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500" title="Request Refund">
                            <RefreshCw size={14} />
                          </button>
                        )}
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
          <div className="flex flex-col gap-0.5">
            <p className="text-xs" style={{ color: card.muted }}>
              Showing <span className="font-bold" style={{ color: card.text }}>{startIndex}-{endIndex}</span> of <span className="font-bold" style={{ color: card.text }}>{totalItems}</span> sales
            </p>
            <p className="text-[11px] font-bold" style={{ color: card.primary }}>
              Total for this view: GH₵ {filteredSales.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2)}
            </p>
          </div>
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

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-6xl h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border transition-all duration-300 animate-in zoom-in-95 duration-200" style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: card.border }}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: card.border, background: isDark ? '#0F172A' : '#F8FAFC' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-lg" style={{ color: card.text }}>
                      Receipt: {selectedSale.receiptNo || `REC-${selectedSale.id.slice(-8).toUpperCase()}`}
                    </h2>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      selectedSale.status === 'REFUNDED' ? 'bg-red-500/10 text-red-500' :
                      selectedSale.status === 'VOIDED' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {selectedSale.status || 'COMPLETED'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: card.muted }}>
                    Transaction ID: {selectedSale.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowRefundInline(false);
                  setRefundReason('');
                }} 
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              
              {/* Left Column: Metadata & Compliance logs */}
              <div className="col-span-1 md:col-span-4 p-6 overflow-y-auto space-y-6 flex flex-col justify-between md:border-r" style={{ borderColor: card.border }}>
                <div className="space-y-6">
                  {/* Customer Information */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-slate-400">Customer Details</h3>
                    <div className="p-4 rounded-2xl border space-y-2" style={{ background: card.inputBg, borderColor: card.border }}>
                      <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: card.muted }}>Name</p>
                        <p className="font-semibold text-sm" style={{ color: card.text }}>{selectedSale.customerName || 'Walk-in Customer'}</p>
                      </div>
                      {selectedSale.customerPhone && (
                        <div>
                          <p className="text-[10px] uppercase font-bold" style={{ color: card.muted }}>Phone</p>
                          <p className="font-semibold text-sm" style={{ color: card.text }}>{selectedSale.customerPhone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: card.muted }}>Customer Type</p>
                        <p className="text-xs font-semibold" style={{ color: card.primary }}>
                          {selectedSale.customerType || (selectedSale.customerId ? 'Registered Account' : 'Walk-in Cashier Entry')}
                        </p>
                      </div>
                      {selectedSale.nhisClaimNo && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-amber-500">NHIS Claim Number</p>
                          <p className="font-mono text-xs font-bold text-amber-500">{selectedSale.nhisClaimNo}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transaction Metadata */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-slate-400">Compliance & Registry</h3>
                    <div className="p-4 rounded-2xl border space-y-3" style={{ background: card.inputBg, borderColor: card.border }}>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: card.muted }}>Issued At</span>
                        <span className="font-medium" style={{ color: card.text }}>
                          {new Date(selectedSale.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: card.muted }}>Authorized Cashier</span>
                        <span className="font-medium text-blue-500" style={{ color: card.text }}>
                          {selectedSale.user?.name || 'Staff User'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: card.muted }}>Cashier Role</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">
                          {selectedSale.user?.role || 'PHARMACIST'}
                        </span>
                      </div>
                      {selectedSale.profitMargin !== undefined && (
                        <div className="flex justify-between items-center text-xs border-t pt-2" style={{ borderColor: card.border }}>
                          <span style={{ color: card.muted }}>Est. Profit Margin</span>
                          <span className="font-semibold text-emerald-500">
                            GH₵ {Number(selectedSale.profitMargin || (selectedSale.totalAmount * 0.3)).toFixed(2)} (30%)
                          </span>
                        </div>
                      )}
                      {selectedSale.averageItemValue !== undefined && (
                        <div className="flex justify-between items-center text-xs">
                          <span style={{ color: card.muted }}>Avg Item Value</span>
                          <span className="font-medium" style={{ color: card.text }}>
                            GH₵ {Number(selectedSale.averageItemValue || (selectedSale.totalAmount / (selectedSale.items?.length || 1))).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Refund audit logs */}
                {selectedSale.isRefunded && (
                  <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs text-red-500 space-y-2 mt-4">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle size={14} /> Refunded Audit Trail
                    </p>
                    <p><b>Refunded At:</b> {selectedSale.refundedAt ? new Date(selectedSale.refundedAt).toLocaleString() : 'N/A'}</p>
                    <p className="italic"><b>Reason:</b> "{selectedSale.refundReason || 'No reason specified'}"</p>
                  </div>
                )}
              </div>

              {/* Middle Column: Itemized List */}
              <div className="col-span-1 md:col-span-5 p-6 overflow-y-auto flex flex-col" style={{ borderColor: card.border }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Items Purchased</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: card.primaryBg, color: card.primary }}>
                    {selectedSale.items?.length || 0} items
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin" style={{ maxHeight: 'calc(100% - 60px)' }}>
                  {modalPaginatedItems.map((item: any) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-slate-500/5 border hover:bg-slate-500/10 transition-colors flex justify-between items-center shadow-sm" style={{ borderColor: card.border }}>
                      <div className="space-y-1 min-w-0 flex-1 pr-3">
                        <p className="font-semibold text-sm truncate" style={{ color: card.text }}>
                          {item.product?.name || 'Unknown Product'}
                        </p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: card.muted }}>
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>Price: GH₵ {Number(item.unitPrice).toFixed(2)}</span>
                          {item.batchNo && item.batchNo !== 'N/A' && (
                            <>
                              <span>•</span>
                              <span className="font-mono bg-blue-500/10 text-blue-500 px-1 rounded text-[10px]">
                                {item.batchNo}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-bold text-sm" style={{ color: card.text }}>
                          GH₵ {Number(item.total || (item.quantity * item.unitPrice)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal Items Pagination */}
                {modalTotalPages > 1 && (
                  <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
                    <p className="text-xs" style={{ color: card.muted }}>
                      Showing <span className="font-bold" style={{ color: card.text }}>{Math.min(((modalItemsPage - 1) * modalItemsPerPage) + 1, selectedSale.items.length)}-{Math.min(modalItemsPage * modalItemsPerPage, selectedSale.items.length)}</span> of <span className="font-bold" style={{ color: card.text }}>{selectedSale.items.length}</span>
                    </p>
                    <div className="flex gap-2">
                      <button 
                        disabled={modalItemsPage === 1}
                        onClick={() => setModalItemsPage(p => p - 1)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" 
                        style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}
                      >
                        Previous
                      </button>
                      <button 
                        disabled={modalItemsPage === modalTotalPages}
                        onClick={() => setModalItemsPage(p => p + 1)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30" 
                        style={{ background: card.primary, color: '#fff' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Financial summary & Actionables */}
              <div className="col-span-1 md:col-span-3 p-6 overflow-y-auto bg-slate-50 dark:bg-[#060B14] flex flex-col justify-between md:border-l" style={{ borderColor: card.border }}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-slate-400">Payment Breakdown</h3>
                    <div className="space-y-2.5 text-xs font-medium border-b pb-4" style={{ borderColor: card.border, color: card.muted }}>
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-mono" style={{ color: card.text }}>
                          GH₵ {Number(selectedSale.subtotal || selectedSale.totalAmount).toFixed(2)}
                        </span>
                      </div>
                      {selectedSale.discountAmt > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span>Discount ({selectedSale.discountReason || 'Promo'})</span>
                          <span className="font-mono">-GH₵ {Number(selectedSale.discountAmt).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedSale.nhil > 0 && (
                        <div className="flex justify-between">
                          <span>NHIL (2.5%)</span>
                          <span className="font-mono" style={{ color: card.text }}>GH₵ {Number(selectedSale.nhil).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedSale.getfund > 0 && (
                        <div className="flex justify-between">
                          <span>GETFund (2.5%)</span>
                          <span className="font-mono" style={{ color: card.text }}>GH₵ {Number(selectedSale.getfund).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedSale.covid19Levy > 0 && (
                        <div className="flex justify-between">
                          <span>Covid Levy (1%)</span>
                          <span className="font-mono" style={{ color: card.text }}>GH₵ {Number(selectedSale.covid19Levy).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedSale.vat > 0 && (
                        <div className="flex justify-between">
                          <span>VAT (15%)</span>
                          <span className="font-mono" style={{ color: card.text }}>GH₵ {Number(selectedSale.vat).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.text }}>Grand Total</span>
                        <span className="font-display text-2xl font-black" style={{ color: card.primary }}>
                          GH₵ {Number(selectedSale.totalAmount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: card.muted }}>Amount Paid</span>
                        <span className="font-mono font-medium" style={{ color: card.text }}>
                          GH₵ {Number(selectedSale.amountPaid || selectedSale.totalAmount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: card.muted }}>Change Given</span>
                        <span className="font-mono font-medium text-emerald-500">
                          GH₵ {Number(selectedSale.change || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1 border-t" style={{ borderColor: card.border }}>
                        <span style={{ color: card.muted }}>Payment Mode</span>
                        <span className="font-bold flex items-center gap-1" style={{ color: card.text }}>
                          {PAYMENT_METHODS[selectedSale.paymentMethod as keyof typeof PAYMENT_METHODS]?.icon || '💰'} 
                          {PAYMENT_METHODS[selectedSale.paymentMethod as keyof typeof PAYMENT_METHODS]?.label || selectedSale.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 space-y-3">
                  {showRefundInline ? (
                    <div className="p-4 rounded-2xl border bg-red-500/5 space-y-3 animate-in fade-in zoom-in-95 duration-200" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Execute Return Process</p>
                      <textarea
                        value={refundReason}
                        onChange={e => setRefundReason(e.target.value)}
                        placeholder="Reason for return/refund..."
                        rows={2}
                        className="w-full p-2.5 rounded-xl text-xs outline-none resize-none focus:ring-1 focus:ring-red-500"
                        style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['Customer changed mind', 'Wrong item dispensed', 'Expired product', 'Damaged item', 'Billing error'].map(reason => (
                          <button
                            key={reason}
                            onClick={() => setRefundReason(reason)}
                            className="px-2 py-1 rounded-md text-[10px] font-medium border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-colors"
                            style={{ borderColor: card.border, color: card.muted }}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => {
                            setShowRefundInline(false);
                            setRefundReason('');
                          }} 
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                          style={{ background: card.inputBg, color: card.text }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleExecuteRefund(selectedSale.id)}
                          disabled={!refundReason.trim() || processingRefund}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                        >
                          {processingRefund ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <button 
                        onClick={() => handlePrint(selectedSale)}
                        className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg hover:shadow-xl" 
                        style={{ background: `linear-gradient(135deg, ${card.primary}, #0284C7)`, boxShadow: `0 8px 20px ${card.primaryBg}` }}
                      >
                        <Printer size={18} />
                        Print Thermal Receipt
                      </button>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownloadPdf(selectedSale)}
                          className="flex-1 py-3.5 rounded-2xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5" 
                          style={{ borderColor: card.border, color: card.text, background: card.inputBg }}
                        >
                          <Download size={14} /> Download PDF
                        </button>
                        
                        {!selectedSale.isRefunded && selectedSale.status !== 'REFUNDED' && (
                          <button 
                            onClick={() => setShowRefundInline(true)}
                            className="flex-1 py-3.5 rounded-2xl font-bold text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw size={14} /> Refund / Void
                          </button>
                        )}
                      </div>

                      {canDeleteSales && (
                        <button 
                          onClick={() => handleExecuteDelete(selectedSale.id)}
                          disabled={processingDelete}
                          className="w-full py-3 rounded-2xl font-bold text-xs bg-red-500/10 hover:bg-red-600 hover:text-white text-red-500 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 border border-red-500/20 active:scale-[0.98] mt-1"
                        >
                          {processingDelete ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete Sale Record Permanently
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl transition-all hover:scale-110 hover:-translate-y-1 z-40"
          style={{ background: card.primary, color: '#fff', boxShadow: `0 8px 24px ${card.primaryBg}` }}
          title="Scroll to top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
}
