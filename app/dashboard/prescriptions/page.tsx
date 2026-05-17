'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { gql, M_CREATE_PRESCRIPTION, M_DISPENSE_PRESCRIPTION } from '@/lib/gql';
import { 
  Search, Plus, Eye, CheckCircle, Clock, XCircle, FileText, Camera, Pill,
  User, Phone, Calendar, ArrowRight, Loader2, X, AlertCircle
} from 'lucide-react';

type RxStatus = 'PENDING' | 'PARTIAL' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';

const STATUS_CONFIG: Record<RxStatus, { label: string; icon: React.FC<{ size?: number }>; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'Pending',   icon: Clock,         color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  PARTIAL:   { label: 'Partial',   icon: FileText,      color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  DISPENSED: { label: 'Dispensed', icon: CheckCircle,   color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  EXPIRED:   { label: 'Expired',   icon: XCircle,       color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
  CANCELLED: { label: 'Cancelled', icon: XCircle,       color: '#94A3B8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)' },
};

export default function PrescriptionsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { prescriptions, loadingPrescriptions, refetchPrescriptions, me, products } = useStore();

  useEffect(() => {
    setMounted(true);
    refetchPrescriptions();
  }, [refetchPrescriptions]);

  const isDark = mounted && theme === 'dark';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRx, setSelectedRx] = useState<any>(null);
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [rxNumber, setRxNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Items State
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemDosage, setItemDosage] = useState('1x daily');
  const [itemDuration, setItemDuration] = useState('7 days');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleAddItem = () => {
    if (!searchProduct.trim()) return;
    setSelectedItems(prev => [
      ...prev,
      {
        drugName: searchProduct.trim(),
        quantity: parseInt(itemQty) || 1,
        dosage: itemDosage.trim() || null,
        duration: itemDuration.trim() || null,
        productId: selectedProduct?.id || null
      }
    ]);
    setSearchProduct('');
    setSelectedProduct(null);
    setItemQty('1');
    setItemDosage('1x daily');
    setItemDuration('7 days');
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Action Message State
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate automated clean Rx number prefix
  useEffect(() => {
    if (showCreateModal) {
      setRxNumber(`RX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setSelectedItems([]);
    }
  }, [showCreateModal]);

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.95)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 10px 40px rgba(0,0,0,0.35)' : '0 10px 30px rgba(0,0,0,0.04)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    sectionBg: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.8)',
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.branchId) {
      setMessage({ type: 'error', text: 'You are not assigned to a branch to create prescriptions.' });
      return;
    }
    if (!patientName.trim()) {
      setMessage({ type: 'error', text: 'Patient Name is required.' });
      return;
    }
    if (selectedItems.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one medication to the prescription.' });
      return;
    }

    setCreateLoading(true);
    try {
      await gql(M_CREATE_PRESCRIPTION, {
        branchId: me.branchId,
        rxNumber,
        patientName,
        patientAge: patientAge ? parseInt(patientAge) : null,
        patientPhone,
        doctorName,
        notes,
        items: selectedItems.map(item => ({
          drugName: item.drugName,
          quantity: item.quantity,
          dosage: item.dosage,
          duration: item.duration,
          productId: item.productId
        }))
      });
      
      setMessage({ type: 'success', text: `Prescription ${rxNumber} successfully created!` });
      setShowCreateModal(false);
      refetchPrescriptions();
      
      // Clear inputs
      setPatientName('');
      setPatientAge('');
      setPatientPhone('');
      setDoctorName('');
      setNotes('');
      setSelectedItems([]);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create prescription' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDispense = async (rxId: string) => {
    if (!me?.id) return;
    try {
      await gql(M_DISPENSE_PRESCRIPTION, {
        id: rxId,
        dispensedById: me.id
      });
      setMessage({ type: 'success', text: 'Medication successfully dispensed and logged to double-entry financial ledger!' });
      setSelectedRx(null);
      refetchPrescriptions();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to dispense prescription' });
    }
  };

  const filtered = prescriptions.filter(rx => {
    const matchSearch =
      rx.rxNumber.toLowerCase().includes(search.toLowerCase()) ||
      rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
      (rx.doctorName && rx.doctorName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || rx.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: prescriptions.length,
    pending: prescriptions.filter(r => r.status === 'PENDING').length,
    dispensed: prescriptions.filter(r => r.status === 'DISPENSED').length,
    partial: prescriptions.filter(r => r.status === 'PARTIAL').length,
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">

      {/* Page Message Toasts */}
      {message && (
        <div className="fixed top-20 right-6 z-[100] max-w-sm rounded-2xl border p-4 backdrop-blur-xl shadow-2xl flex gap-3 animate-in slide-in-from-right-4 duration-300"
          style={{
            background: message.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
            borderColor: message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: '#fff'
          }}>
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-xs font-bold leading-relaxed">{message.text}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Prescriptions</h1>
          <p className="text-sm" style={{ color: card.muted }}>
            Manage patient scripts, integrate database records, and execute de-facto POS dispensations.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Camera size={17} />
            Scan Rx OCR
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
            style={{
              background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
              color: isDark ? '#0A0E1A' : '#fff',
              boxShadow: isDark ? '0 8px 25px rgba(0,217,255,0.3)' : '0 8px 25px rgba(14,165,233,0.3)',
            }}>
            <Plus size={17} />
            New Prescription
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: counts.total, icon: FileText, color: card.primary },
          { label: 'Pending', value: counts.pending, icon: Clock, color: '#F59E0B' },
          { label: 'Dispensed', value: counts.dispensed, icon: CheckCircle, color: '#10B981' },
          { label: 'Partial', value: counts.partial, icon: Pill, color: '#8B5CF6' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-5 backdrop-blur-xl transition-all hover:translate-y-[-2px]"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                  <Icon size={18} />
                </div>
                <p className="text-xs" style={{ color: card.subtle }}>{s.label}</p>
              </div>
              <p className="font-display text-2xl font-bold" style={{ color: card.text }}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Master List Section */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>

        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between"
          style={{ borderColor: card.border, background: card.sectionBg }}>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search Rx, patient or physician..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#fff', border: `1px solid ${card.border}`, color: card.text }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'PENDING', 'PARTIAL', 'DISPENSED', 'EXPIRED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={{
                  background: statusFilter === s ? card.primaryBg : 'transparent',
                  color: statusFilter === s ? card.primary : card.subtle,
                  border: statusFilter === s ? `1px solid ${card.primaryBorder}` : '1px solid transparent',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y" style={{ borderColor: card.divider }}>
          {loadingPrescriptions ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin" size={24} style={{ color: card.primary }} />
              <p className="text-xs" style={{ color: card.subtle }}>Querying Prescription Database...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText size={40} style={{ color: card.subtle, opacity: 0.3, marginBottom: 12 }} />
              <p className="text-sm font-semibold" style={{ color: card.subtle }}>No active prescriptions located</p>
            </div>
          ) : filtered.map((rx, i) => {
            const st = STATUS_CONFIG[rx.status as RxStatus] || STATUS_CONFIG.PENDING;
            const StatusIcon = st.icon;
            return (
              <div key={rx.id}
                onClick={() => setSelectedRx(rx)}
                className="flex items-center gap-4 px-6 py-4 transition-all group cursor-pointer hover:bg-slate-500/5">

                {/* Rx Number */}
                <div className="shrink-0 w-36">
                  <p className="font-mono text-sm font-bold" style={{ color: card.primary }}>{rx.rxNumber}</p>
                  <p className="text-[11px]" style={{ color: card.subtle }}>
                    {new Date(rx.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Patient */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: card.text }}>{rx.patientName}</p>
                  <p className="text-xs" style={{ color: card.subtle }}>
                    Age {rx.patientAge || 'N/A'} • {rx.items?.length || 0} drugs prescribed
                  </p>
                </div>

                {/* Doctor */}
                <div className="hidden md:block flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Physician</p>
                  <p className="text-sm font-semibold truncate" style={{ color: card.text }}>{rx.doctorName || 'General Practitioner'}</p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0"
                  style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  <StatusIcon size={12} />
                  {st.label}
                </div>

                {/* Action arrow */}
                <button className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shrink-0 hover:bg-slate-500/10"
                  style={{ color: card.primary }}>
                  <Eye size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SLIDING RX DETAILS DRAWER */}
      {/* ========================================================================= */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" onClick={() => setSelectedRx(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" />

          {/* Drawer Body */}
          <div className="relative w-full max-w-lg h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{ background: isDark ? '#0f172a' : '#fff', borderLeft: `1px solid ${card.border}` }}>
            
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: card.divider }}>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Prescription Details</span>
                <h2 className="font-mono text-xl font-bold mt-0.5" style={{ color: card.primary }}>{selectedRx.rxNumber}</h2>
              </div>
              <button onClick={() => setSelectedRx(null)} className="p-2 rounded-full hover:bg-slate-500/10 transition-colors">
                <X size={20} style={{ color: card.text }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 space-y-6">
              {/* Patient and Doctor Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border" style={{ borderColor: card.border, background: card.sectionBg }}>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1"><User size={10} /> Patient</span>
                  <p className="text-sm font-bold mt-1" style={{ color: card.text }}>{selectedRx.patientName}</p>
                  <p className="text-xs" style={{ color: card.muted }}>Age {selectedRx.patientAge || 'N/A'}</p>
                  <p className="text-xs font-mono mt-1 opacity-75" style={{ color: card.muted }}>{selectedRx.patientPhone || 'No contact'}</p>
                </div>
                <div className="p-4 rounded-2xl border" style={{ borderColor: card.border, background: card.sectionBg }}>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1"><FileText size={10} /> Prescriber</span>
                  <p className="text-sm font-bold mt-1" style={{ color: card.text }}>{selectedRx.doctorName || 'General Practitioner'}</p>
                  <p className="text-xs" style={{ color: card.muted }}>{selectedRx.doctorFacility || 'Azzay Pharmacy Partner'}</p>
                </div>
              </div>

              {/* Status and Dates */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ borderColor: card.border }}>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Status</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    style={{
                      background: (STATUS_CONFIG[selectedRx.status as RxStatus] || STATUS_CONFIG.PENDING).bg,
                      color: (STATUS_CONFIG[selectedRx.status as RxStatus] || STATUS_CONFIG.PENDING).color
                    }}>
                    {selectedRx.status}
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t" style={{ borderColor: card.divider }}>
                  <span style={{ color: card.muted }}>Issue Date:</span>
                  <span className="font-bold" style={{ color: card.text }}>{new Date(selectedRx.issueDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: card.muted }}>Expiry Date:</span>
                  <span className="font-bold text-red-500">{new Date(selectedRx.expiryDate).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              {/* Prescription Items */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Prescribed Medications</h3>
                <div className="space-y-3">
                  {selectedRx.items && selectedRx.items.length > 0 ? (
                    selectedRx.items.map((item: any) => (
                      <div key={item.id} className="p-4 rounded-2xl border flex items-center justify-between" style={{ borderColor: card.border }}>
                        <div>
                          <p className="text-sm font-bold" style={{ color: card.text }}>{item.drugName}</p>
                          <p className="text-xs" style={{ color: card.muted }}>Dosage: {item.dosage || 'As directed'} • Duration: {item.duration || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-extrabold" style={{ color: card.primary }}>Qty: {item.quantity}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.dispensed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {item.dispensed ? 'Dispensed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs" style={{ color: card.muted }}>No specific line items recorded. (Verify manually during checkout)</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedRx.notes && (
                <div className="p-4 rounded-2xl border" style={{ borderColor: card.border }}>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Clinical Notes</span>
                  <p className="text-xs leading-relaxed mt-2" style={{ color: card.muted }}>{selectedRx.notes}</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            {(selectedRx.status === 'PENDING' || selectedRx.status === 'PARTIAL') && (
              <div className="p-6 border-t flex gap-3" style={{ borderColor: card.divider, background: card.sectionBg }}>
                <button
                  onClick={() => handleDispense(selectedRx.id)}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  style={{
                    background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                    color: isDark ? '#0A0E1A' : '#fff',
                    boxShadow: isDark ? '0 4px 15px rgba(0,217,255,0.3)' : '0 4px 15px rgba(14,165,233,0.3)',
                  }}>
                  <CheckCircle size={16} />
                  Dispense Prescription Medications
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE NEW PRESCRIPTION MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg rounded-[28px] border shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ background: isDark ? '#0f172a' : '#fff', borderColor: card.border }}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: card.divider }}>
              <div>
                <h3 className="font-display text-lg font-bold" style={{ color: card.text }}>Log New Prescription</h3>
                <p className="text-xs" style={{ color: card.muted }}>Record incoming physician script details.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-full hover:bg-slate-500/10 transition-colors">
                <X size={18} style={{ color: card.text }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: card.muted }}>Rx Number</label>
                  <input
                    type="text"
                    value={rxNumber}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:outline-none opacity-60"
                    style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: card.muted }}>Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none"
                    style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: card.muted }}>Patient Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none"
                    style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: card.muted }}>Patient Phone</label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+233 24..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none"
                    style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: card.muted }}>Prescribing Physician Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Abena Osei"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none"
                  style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                />
              </div>

              {/* Medication Item Selector */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ borderColor: card.border, background: 'rgba(0,217,255,0.02)' }}>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00D9FF] block">Prescribed Medication Items</span>

                <div className="relative">
                  <input
                    type="text"
                    value={searchProduct}
                    onChange={(e) => {
                      setSearchProduct(e.target.value);
                      setShowDropdown(true);
                    }}
                    placeholder="Search database medicine or type custom drug..."
                    className="w-full px-3 py-2 rounded-lg text-xs border focus:outline-none"
                    style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                  />
                  {showDropdown && searchProduct.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-lg border shadow-xl z-50 divide-y"
                      style={{ background: isDark ? '#1e293b' : '#fff', borderColor: card.border, color: card.text }}>
                      {products
                        .filter(p => 
                          p.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
                          p.genericName?.toLowerCase().includes(searchProduct.toLowerCase())
                        )
                        .slice(0, 5)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProduct(p);
                              setSearchProduct(p.name);
                              setShowDropdown(false);
                            }}
                            className="px-3 py-2 text-xs hover:bg-slate-500/10 cursor-pointer flex justify-between"
                          >
                            <span className="font-bold">{p.name}</span>
                            <span className="text-[10px] opacity-60">Qty: {p.stockQuantity}</span>
                          </div>
                        ))}
                      {products.filter(p => 
                        p.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
                        p.genericName?.toLowerCase().includes(searchProduct.toLowerCase())
                      ).length === 0 && (
                        <div 
                          onClick={() => setShowDropdown(false)}
                          className="px-3 py-2 text-xs opacity-60 cursor-pointer"
                        >
                          Use custom drug name "{searchProduct}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mb-1">Qty</label>
                    <input
                      type="number"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      min="1"
                      className="w-full px-2 py-1.5 rounded-lg text-xs border focus:outline-none"
                      style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mb-1">Dosage</label>
                    <input
                      type="text"
                      value={itemDosage}
                      onChange={(e) => setItemDosage(e.target.value)}
                      placeholder="e.g. 1x daily"
                      className="w-full px-2 py-1.5 rounded-lg text-xs border focus:outline-none"
                      style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider opacity-60 block mb-1">Duration</label>
                      <input
                        type="text"
                        value={itemDuration}
                        onChange={(e) => setItemDuration(e.target.value)}
                        placeholder="7 days"
                        className="w-full px-2 py-1.5 rounded-lg text-xs border focus:outline-none"
                        style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#00D9FF] text-slate-900 hover:bg-[#00D9FF]/90 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Render Selected Items List inside Modal */}
                {selectedItems.length > 0 && (
                  <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg border text-xs" style={{ borderColor: card.border, background: card.sectionBg }}>
                        <div>
                          <span className="font-bold" style={{ color: card.text }}>{item.drugName}</span>
                          <span className="text-[10px] opacity-60 ml-2">Qty: {item.quantity} • {item.dosage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-600 transition-colors p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: card.muted }}>Clinical / Rx Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes, drugs prescribed, or special dosage instructions..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none resize-none"
                  style={{ background: card.sectionBg, borderColor: card.border, color: card.text }}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: card.divider }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-xl font-bold text-xs border transition-all"
                  style={{ borderColor: card.border, color: card.text }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-1/2 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: card.primary,
                    color: isDark ? '#0A0E1A' : '#fff',
                  }}>
                  {createLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
