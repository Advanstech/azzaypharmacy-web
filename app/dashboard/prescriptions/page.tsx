'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Search, Plus, Eye, CheckCircle, Clock, XCircle, FileText, Camera, Pill } from 'lucide-react';

type RxStatus = 'PENDING' | 'PARTIAL' | 'DISPENSED' | 'EXPIRED';

type Prescription = {
  id: string;
  rxNumber: string;
  patientName: string;
  patientAge: number;
  doctorName: string;
  issueDate: string;
  status: RxStatus;
  items: number;
};

const PRESCRIPTIONS: Prescription[] = [
  { id: '1', rxNumber: 'RX-2026-001', patientName: 'Kwame Mensah', patientAge: 45, doctorName: 'Dr. Abena Osei', issueDate: '2026-05-01', status: 'PENDING', items: 3 },
  { id: '2', rxNumber: 'RX-2026-002', patientName: 'Ama Boateng', patientAge: 32, doctorName: 'Dr. Kofi Asante', issueDate: '2026-05-02', status: 'DISPENSED', items: 2 },
  { id: '3', rxNumber: 'RX-2026-003', patientName: 'Yaw Darko', patientAge: 28, doctorName: 'Dr. Abena Osei', issueDate: '2026-04-30', status: 'PARTIAL', items: 4 },
  { id: '4', rxNumber: 'RX-2026-004', patientName: 'Akosua Frimpong', patientAge: 61, doctorName: 'Dr. Emmanuel Adu', issueDate: '2026-04-28', status: 'EXPIRED', items: 2 },
  { id: '5', rxNumber: 'RX-2026-005', patientName: 'Nana Adjei', patientAge: 38, doctorName: 'Dr. Kofi Asante', issueDate: '2026-05-02', status: 'PENDING', items: 5 },
];

const STATUS_CONFIG: Record<RxStatus, { label: string; icon: React.FC<{ size?: number }>; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'Pending',   icon: Clock,         color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  PARTIAL:   { label: 'Partial',   icon: FileText,      color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  DISPENSED: { label: 'Dispensed', icon: CheckCircle,   color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  EXPIRED:   { label: 'Expired',   icon: XCircle,       color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
};

export default function PrescriptionsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
    sectionBg: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)',
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
  };

  const filtered = PRESCRIPTIONS.filter(rx => {
    const matchSearch =
      rx.rxNumber.toLowerCase().includes(search.toLowerCase()) ||
      rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
      rx.doctorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || rx.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: PRESCRIPTIONS.length,
    pending: PRESCRIPTIONS.filter(r => r.status === 'PENDING').length,
    dispensed: PRESCRIPTIONS.filter(r => r.status === 'DISPENSED').length,
    partial: PRESCRIPTIONS.filter(r => r.status === 'PARTIAL').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Prescriptions</h1>
          <p className="text-sm" style={{ color: card.muted }}>
            Manage and dispense patient prescriptions with AI verification.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <Camera size={17} />
            Scan Rx
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: counts.total, icon: FileText, color: card.primary },
          { label: 'Pending', value: counts.pending, icon: Clock, color: '#F59E0B' },
          { label: 'Dispensed', value: counts.dispensed, icon: CheckCircle, color: '#10B981' },
          { label: 'Partial', value: counts.partial, icon: Pill, color: '#8B5CF6' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-5 backdrop-blur-xl"
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

      {/* Table */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>

        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between"
          style={{ borderColor: card.border, background: card.sectionBg }}>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: card.subtle }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by Rx number, patient or doctor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#fff', border: `1px solid ${card.border}`, color: card.text }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'PENDING', 'PARTIAL', 'DISPENSED', 'EXPIRED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
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

        {/* List */}
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText size={40} style={{ color: card.subtle, opacity: 0.3, marginBottom: 12 }} />
              <p className="text-sm" style={{ color: card.subtle }}>No prescriptions found</p>
            </div>
          ) : filtered.map((rx, i) => {
            const st = STATUS_CONFIG[rx.status];
            const StatusIcon = st.icon;
            return (
              <div key={rx.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors group cursor-pointer"
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${card.divider}` : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(0,217,255,0.03)' : 'rgba(14,165,233,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {/* Rx Number */}
                <div className="shrink-0 w-32">
                  <p className="font-mono text-sm font-bold" style={{ color: card.primary }}>{rx.rxNumber}</p>
                  <p className="text-[11px]" style={{ color: card.subtle }}>
                    {new Date(rx.issueDate).toLocaleDateString('en-GB')}
                  </p>
                </div>

                {/* Patient */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: card.text }}>{rx.patientName}</p>
                  <p className="text-xs" style={{ color: card.subtle }}>Age {rx.patientAge} • {rx.items} items</p>
                </div>

                {/* Doctor */}
                <div className="hidden md:block flex-1 min-w-0">
                  <p className="text-[11px]" style={{ color: card.subtle }}>Prescribed by</p>
                  <p className="text-sm font-medium truncate" style={{ color: card.text }}>{rx.doctorName}</p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0"
                  style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  <StatusIcon size={13} />
                  {st.label}
                </div>

                {/* Action */}
                <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  style={{ background: card.primaryBg, color: card.primary }}>
                  <Eye size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
