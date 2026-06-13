'use client';

import { useState, useEffect, use } from 'react';
import { useTheme } from 'next-themes';
import { 
  ArrowLeft, Calendar, Clock, User, DollarSign, FileText, 
  Download, Printer, CheckCircle, XCircle, AlertCircle, 
  Receipt, Building2, Phone, Mail, MapPin, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { gql, Q_SHIFT_RECONCILIATION_BY_ID } from '@/lib/gql';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ShiftReconciliationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { me } = useStore();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = mounted && (resolvedTheme ?? theme) === 'dark';

  const card = {
    bg: isDark ? '#0F172A' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    muted: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#1E293B' : '#E2E8F0',
    inputBg: isDark ? '#1E293B' : '#F8FAFC',
    primary: '#0EA5E9',
    primaryBg: isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.1)',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    subtle: isDark ? '#64748B' : '#94A3B8',
  };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchShift = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gql<{ shiftReconciliation: any }>(Q_SHIFT_RECONCILIATION_BY_ID, { id });
        if (data.shiftReconciliation) {
          setShift(data.shiftReconciliation);
        } else {
          setError('Shift reconciliation not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load shift reconciliation');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchShift();
    }
  }, [id]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalDeclared = Number(shift.physicalCash) + Number(shift.digitalPayments);
    const diff = Number(shift.discrepancy);

    printWindow.document.write(`
      <html>
        <head>
          <title>Shift Reconciliation - ${shift.id.slice(-8).toUpperCase()}</title>
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
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .store-name {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 6px;
              letter-spacing: 1px;
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
            }
            .section-title {
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 12px 0 8px 0;
              border-bottom: 2px solid #000;
              padding-bottom: 4px;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: 700;
              padding: 4px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: 900;
              padding: 8px 0;
              border-top: 2px solid #000;
              margin-top: 8px;
            }
            .status-badge {
              text-align: center;
              font-size: 14px;
              font-weight: 900;
              padding: 8px;
              margin: 10px 0;
              text-transform: uppercase;
            }
            .status-approved { background: #000; color: #fff; }
            .status-rejected { background: #000; color: #fff; }
            .status-pending { background: #000; color: #fff; }
            .notes-section {
              font-size: 11px;
              font-weight: 600;
              margin: 10px 0;
              padding: 8px;
              border: 2px dashed #000;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              font-weight: 700;
              margin-top: 12px;
              padding-top: 10px;
              border-top: 3px dashed #000;
            }
            @media print {
              body { width: 80mm; max-width: 80mm; padding: 4mm; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="store-name">AZZAY PHARMACY</div>
            <div class="bold">Shift Reconciliation Report</div>
          </div>

          <div class="divider"></div>

          <div class="info-row">
            <span>Shift ID:</span>
            <span>${shift.id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(shift.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="info-row">
            <span>Cashier:</span>
            <span>${shift.pharmacist?.name || 'Staff'}</span>
          </div>
          <div class="info-row">
            <span>Branch:</span>
            <span>${shift.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (shift.branch?.name ? 'Main Branch' : 'Branch')}</span>
          </div>

          <div class="divider"></div>

          <div class="section-title">Financial Summary</div>
          <div class="amount-row">
            <span>Expected Revenue:</span>
            <span>GH₵ ${Number(shift.totalRevenue).toFixed(2)}</span>
          </div>
          <div class="amount-row">
            <span>Physical Cash:</span>
            <span>GH₵ ${Number(shift.physicalCash).toFixed(2)}</span>
          </div>
          <div class="amount-row">
            <span>Digital Payments:</span>
            <span>GH₵ ${Number(shift.digitalPayments).toFixed(2)}</span>
          </div>
          <div class="amount-row">
            <span>Total Declared:</span>
            <span>GH₵ ${totalDeclared.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Discrepancy:</span>
            <span>GH₵ ${diff.toFixed(2)}</span>
          </div>

          <div class="divider"></div>

          <div class="section-title">Status</div>
          <div class="status-badge status-${shift.status?.toLowerCase()}">
            ${shift.status || 'PENDING'}
          </div>

          ${shift.approvedBy ? `
            <div class="info-row">
              <span>Approved By:</span>
              <span>${shift.approvedBy.name}</span>
            </div>
            <div class="info-row">
              <span>Approved At:</span>
              <span>${new Date(shift.approvedAt).toLocaleString('en-GB')}</span>
            </div>
          ` : ''}

          ${shift.notes ? `
            <div class="divider"></div>
            <div class="section-title">Notes</div>
            <div class="notes-section">
              ${shift.notes}
            </div>
          ` : ''}

          <div class="divider-dashed"></div>

          <div class="footer">
            <p style="font-size: 13px;">Official Shift Reconciliation Record</p>
            <p>Azzay Pharmacy NEXUS System</p>
            <p>${new Date().toLocaleString('en-GB')}</p>
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

  const handleExport = () => {
    const totalDeclared = Number(shift.physicalCash) + Number(shift.digitalPayments);
    const diff = Number(shift.discrepancy);

    const rows = [
      ['Shift Reconciliation Report'],
      [''],
      ['Shift ID', shift.id.slice(-8).toUpperCase()],
      ['Date', new Date(shift.createdAt).toLocaleString('en-GB')],
      ['Cashier', shift.user?.name || 'Staff'],
      ['Branch', shift.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (shift.branch?.name || 'Branch')],
      [''],
      ['Financial Summary'],
      ['Expected Revenue', `GH₵ ${Number(shift.totalRevenue).toFixed(2)}`],
      ['Physical Cash', `GH₵ ${Number(shift.physicalCash).toFixed(2)}`],
      ['Digital Payments', `GH₵ ${Number(shift.digitalPayments).toFixed(2)}`],
      ['Total Declared', `GH₵ ${totalDeclared.toFixed(2)}`],
      ['Discrepancy', `GH₵ ${diff.toFixed(2)}`],
      [''],
      ['Status', shift.status || 'PENDING'],
      [''],
      shift.approvedBy ? ['Approved By', shift.approvedBy.name] : [],
      shift.approvedBy ? ['Approved At', new Date(shift.approvedAt).toLocaleString('en-GB')] : [],
      [''],
      shift.notes ? ['Notes', shift.notes] : [],
      [''],
      ['Generated at', new Date().toLocaleString('en-GB')],
    ].filter(row => row.length > 0);

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shift-reconciliation-${shift.id.slice(-8)}.csv`;
    link.click();
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent animate-spin rounded-full" />
          <p className="text-sm font-bold" style={{ color: card.text }}>Loading shift reconciliation...</p>
        </div>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
        <div className="text-center">
          <XCircle size={48} className="mx-auto mb-4" style={{ color: card.danger }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: card.text }}>Error Loading Shift</h2>
          <p className="text-sm mb-4" style={{ color: card.muted }}>{error || 'Shift reconciliation not found'}</p>
          <Link 
            href="/dashboard/end-of-day"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
            style={{ background: card.primary, color: '#fff' }}
          >
            <ArrowLeft size={16} /> Back to History
          </Link>
        </div>
      </div>
    );
  }

  const totalDeclared = Number(shift.physicalCash) + Number(shift.digitalPayments);
  const diff = Number(shift.discrepancy);

  return (
    <div className="min-h-screen p-6" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/dashboard/end-of-day"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            style={{ background: card.inputBg, color: card.text, border: `1px solid ${card.border}` }}
          >
            <ArrowLeft size={16} /> Back to History
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
              style={{ background: card.inputBg, color: card.text, border: `1px solid ${card.border}` }}
            >
              <Download size={16} /> Export CSV
            </button>
            <button 
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
              style={{ background: card.primary, color: '#fff' }}
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border }}>
          {/* Status Banner */}
          <div className={`p-6 ${
            shift.status === 'APPROVED' ? 'bg-emerald-500/10' :
            shift.status === 'REJECTED' ? 'bg-red-500/10' :
            'bg-amber-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {shift.status === 'APPROVED' ? (
                  <CheckCircle size={32} className="text-emerald-500" />
                ) : shift.status === 'REJECTED' ? (
                  <XCircle size={32} className="text-red-500" />
                ) : (
                  <Clock size={32} className="text-amber-500" />
                )}
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: card.text }}>
                    Shift Reconciliation
                  </h1>
                  <p className="text-sm" style={{ color: card.muted }}>
                    ID: {shift.id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <span className={`px-4 py-2 rounded-xl font-bold text-sm tracking-wider uppercase ${
                shift.status === 'APPROVED' ? 'bg-emerald-500 text-white' :
                shift.status === 'REJECTED' ? 'bg-red-500 text-white' :
                'bg-amber-500 text-white'
              }`}>
                {shift.status || 'PENDING'}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: card.muted }}>
                  Shift Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} style={{ color: card.subtle }} />
                    <div>
                      <p className="text-xs" style={{ color: card.muted }}>Date & Time</p>
                      <p className="text-sm font-bold" style={{ color: card.text }}>
                        {new Date(shift.createdAt).toLocaleString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User size={18} style={{ color: card.subtle }} />
                    <div>
                      <p className="text-xs" style={{ color: card.muted }}>Cashier</p>
                      <p className="text-sm font-bold" style={{ color: card.text }}>
                        {shift.pharmacist?.name || 'Staff'}
                      </p>
                      {shift.pharmacist?.email && (
                        <p className="text-xs" style={{ color: card.muted }}>{shift.pharmacist.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 size={18} style={{ color: card.subtle }} />
                    <div>
                      <p className="text-xs" style={{ color: card.muted }}>Branch</p>
                      <p className="text-sm font-bold" style={{ color: card.text }}>
                        {shift.branch?.name?.toLowerCase().includes('chemical') ? 'Chemical Shop' : (shift.branch?.name || 'Branch')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: card.muted }}>
                  Approval Status
                </h3>
                <div className="space-y-3">
                  {shift.approvedBy ? (
                    <>
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={18} style={{ color: card.success }} />
                        <div>
                          <p className="text-xs" style={{ color: card.muted }}>Approved By</p>
                          <p className="text-sm font-bold" style={{ color: card.text }}>
                            {shift.approvedBy.name}
                          </p>
                          {shift.approvedBy.email && (
                            <p className="text-xs" style={{ color: card.muted }}>{shift.approvedBy.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock size={18} style={{ color: card.subtle }} />
                        <div>
                          <p className="text-xs" style={{ color: card.muted }}>Approved At</p>
                          <p className="text-sm font-bold" style={{ color: card.text }}>
                            {new Date(shift.approvedAt).toLocaleString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <AlertCircle size={18} style={{ color: card.warning }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: card.warning }}>
                          Pending Manager Review
                        </p>
                        <p className="text-xs" style={{ color: card.muted }}>
                          Awaiting approval from manager
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-6 rounded-2xl border" style={{ background: card.inputBg, borderColor: card.border }}>
              <h3 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: card.muted }}>
                Financial Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: card.text }}>Expected Revenue</span>
                  <span className="text-sm font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {Number(shift.totalRevenue).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: card.text }}>Physical Cash</span>
                  <span className="text-sm font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {Number(shift.physicalCash).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: card.text }}>Digital Payments</span>
                  <span className="text-sm font-mono font-bold" style={{ color: card.text }}>
                    GH₵ {Number(shift.digitalPayments).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-3 mt-3" style={{ borderColor: card.border }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold" style={{ color: card.text }}>Total Declared</span>
                    <span className="text-sm font-mono font-bold" style={{ color: card.text }}>
                      GH₵ {totalDeclared.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3" style={{ borderColor: card.border }}>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black" style={{ color: card.text }}>Discrepancy</span>
                    <span className={`text-base font-mono font-black ${diff === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      GH₵ {diff.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {shift.notes && (
              <div className="p-6 rounded-2xl border" style={{ background: card.inputBg, borderColor: card.border }}>
                <h3 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: card.muted }}>
                  Notes / Reason
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: card.text }}>
                  {shift.notes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="p-6 rounded-2xl border" style={{ background: card.inputBg, borderColor: card.border }}>
              <h3 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: card.muted }}>
                System Metadata
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold" style={{ color: card.muted }}>Created At</p>
                  <p style={{ color: card.text }}>{new Date(shift.createdAt).toLocaleString('en-GB')}</p>
                </div>
                <div>
                  <p className="font-bold" style={{ color: card.muted }}>Updated At</p>
                  <p style={{ color: card.text }}>{new Date(shift.updatedAt).toLocaleString('en-GB')}</p>
                </div>
                <div>
                  <p className="font-bold" style={{ color: card.muted }}>Shift ID</p>
                  <p className="font-mono" style={{ color: card.text }}>{shift.id}</p>
                </div>
                <div>
                  <p className="font-bold" style={{ color: card.muted }}>User ID</p>
                  <p className="font-mono" style={{ color: card.text }}>{shift.pharmacistId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
