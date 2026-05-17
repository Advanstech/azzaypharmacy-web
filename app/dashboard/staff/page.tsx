'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { gql, M_FORGOT_PASSWORD, M_GENERATE_TEMP_PASSWORD } from '@/lib/gql';
import { 
  Search, Plus, Shield, UserCheck, UserX, MoreVertical, Mail, Phone, Calendar, 
  Clock, Activity, TrendingUp, Package, ShoppingCart, DollarSign, MapPin,
  Award, Briefcase, ChevronRight, X, Copy, Check, Send, Filter, Download,
  Users, Timer, BarChart3, FileText, AlertCircle, CheckCircle2, XCircle,
  UserPlus, ClipboardList, CalendarDays, LayoutGrid, List, ChevronLeft, ChevronRight as ChevronRightIcon,
  LogOut, Loader2, KeyRound
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'SE_ADMIN' | 'OWNER' | 'MANAGER' | 'PHARMACIST' | 'CHEMICAL_CASHIER' | 'CASHIER' | 'HEAD_PHARMACIST' | 'TECHNICIAN' | 'DEVELOPER' | 'USER';
  branchId?: string;
  branch?: { name: string };
  isOnDuty: boolean;
  lastSeen?: string;
  position?: string;
  isActive: boolean;
}

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  SE_ADMIN:        { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  OWNER:           { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  MANAGER:         { color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
  PHARMACIST:      { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  HEAD_PHARMACIST: { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  CHEMICAL_CASHIER:{ color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  CASHIER:         { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  TECHNICIAN:      { color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
  DEVELOPER:       { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  USER:            { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
};

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  active:   { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'Active' },
  inactive: { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: 'Inactive' },
  'on-duty': { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'On Duty' },
  'off-duty': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Off Duty' },
};

// Staff modal for invite / create actions
interface StaffModalProps {
  isOpen: boolean;
  action: 'invite' | 'create';
  onClose: () => void;
  isDark: boolean;
  card: any;
  onInvite: (args: { email: string; name: string; role: string; branchId: string }) => Promise<boolean>;
  onCreateAccount: (args: { email: string; password: string; name: string; role: string; branchId: string; position?: string }) => Promise<boolean>;
}

const BRANCH_OPTIONS = [
  { id: '1', label: 'Azzay Pharmacy' },
  { id: '2', label: 'Azzay Chemical Shop' },
];

const ROLE_OPTIONS = [
  'OWNER', 'MANAGER', 'PHARMACIST', 'HEAD_PHARMACIST', 'CHEMICAL_CASHIER', 'CASHIER', 'TECHNICIAN', 'DEVELOPER', 'USER'
] as const;

function StaffModal({ isOpen, action, onClose, isDark, card, onInvite, onCreateAccount }: StaffModalProps) {
  const [mode, setMode] = useState<'invite' | 'create'>(action);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PHARMACIST',
    branchId: '1',
    position: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(action);
      setMessage(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'PHARMACIST',
        branchId: '1',
        position: '',
      });
      setSubmitting(false);
    }
  }, [isOpen, action]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    if (!formData.name.trim() || !formData.email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required.' });
      setSubmitting(false);
      return;
    }

    try {
      if (mode === 'invite') {
        const success = await onInvite({
          email: formData.email,
          name: formData.name,
          role: formData.role,
          branchId: formData.branchId,
        });
        if (success) {
          setMessage({ type: 'success', text: `Invitation sent to ${formData.email}.` });
          setTimeout(onClose, 800);
        } else {
          setMessage({ type: 'error', text: 'Failed to send invitation. Please try again.' });
        }
      } else {
        if (!formData.password.trim()) {
          setMessage({ type: 'error', text: 'Password is required for account creation.' });
          setSubmitting(false);
          return;
        }

        const success = await onCreateAccount({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          branchId: formData.branchId,
          position: formData.position,
        });
        if (success) {
          setMessage({ type: 'success', text: `${formData.name} was added successfully.` });
          setTimeout(onClose, 800);
        } else {
          setMessage({ type: 'error', text: 'Failed to create staff account. Please check the details and try again.' });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error?.message || 'Something went wrong.'}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto pt-8 sm:pt-16 md:pt-24" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-300" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, boxShadow: '0 25px 60px rgba(0,0,0,0.4)', maxHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b flex flex-col gap-3" style={{ borderColor: card.border, background: card.primaryBg }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>
                {mode === 'invite' ? 'Invite Staff Member' : 'Create Staff Account'}
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: card.muted }}>
                {mode === 'invite'
                  ? 'Send a secure join invitation by email.'
                  : 'Add a new team member with active login.'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 transition hover:bg-white/10" style={{ color: card.muted }}>
              <X size={16} />
            </button>
          </div>
          
          {/* Segmented Control Toggle */}
          <div className="grid grid-cols-2 p-0.5 rounded-xl border bg-opacity-40" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F1F5F9', borderColor: card.border }}>
            <button
              type="button"
              onClick={() => setMode('invite')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'invite' ? 'shadow-sm' : ''}`}
              style={{
                background: mode === 'invite' ? card.primary : 'transparent',
                color: mode === 'invite' ? (isDark ? '#060B14' : '#fff') : card.muted
              }}
            >
              Invite Mode
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'create' ? 'shadow-sm' : ''}`}
              style={{
                background: mode === 'create' ? card.primary : 'transparent',
                color: mode === 'create' ? (isDark ? '#060B14' : '#fff') : card.muted
              }}
            >
              Direct Creation
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {message && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {/* Unified Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: card.muted }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Adua Azare"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-1"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: card.muted }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@azzay.app"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-1"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: card.muted }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password (min 6 chars)"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-1"
                  style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
                />
              </div>
            )}
            {mode === 'create' && (
              <div>
                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: card.muted }}>
                  Position
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={e => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Pharmacist"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-1"
                  style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: card.muted }}>
                Role
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-1"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>{role.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: card.muted }}>
                Branch Assignment
              </label>
              <select
                value={formData.branchId}
                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-1"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              >
                {BRANCH_OPTIONS.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: card.border }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={{ borderColor: card.border, color: card.text, background: isDark ? 'rgba(15,23,42,0.2)' : '#F8FAFC' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}
            >
              {submitting ? (mode === 'invite' ? 'Sending...' : 'Creating...') : (mode === 'invite' ? 'Send Invite' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// End of Day Modal Component
function EndOfDayModal({ isOpen, onClose, isDark, card, onComplete }: { isOpen: boolean; onClose: () => void; isDark: boolean; card: any; onComplete: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const { closeTerminal } = useStore();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      closeTerminal().then(setReport).finally(() => setLoading(false));
    }
  }, [isOpen, closeTerminal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-md rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            <LogOut size={32} />
          </div>
          <h2 className="font-display text-xl font-bold mb-1" style={{ color: card.text }}>End of Day Reconciliation</h2>
          <p className="text-sm" style={{ color: card.muted }}>Summary of your clinical session today</p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin" size={32} style={{ color: card.primary }} />
            <p className="text-xs font-medium" style={{ color: card.muted }}>Generating financial report...</p>
          </div>
        ) : report ? (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border text-center" style={{ borderColor: card.border, background: card.primaryBg }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: card.muted }}>Total Sales</p>
                <p className="text-xl font-display font-bold" style={{ color: card.primary }}>GH₵ {report.totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl border text-center" style={{ borderColor: card.border, background: card.primaryBg }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: card.muted }}>Transactions</p>
                <p className="text-xl font-display font-bold" style={{ color: card.primary }}>{report.transactionCount}</p>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-xl border" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: card.muted }}>Cash Sales</span>
                <span className="font-bold" style={{ color: card.text }}>GH₵ {report.cashSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: card.muted }}>Mobile Money</span>
                <span className="font-bold" style={{ color: card.text }}>GH₵ {report.momoSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: card.muted }}>NHIS/Credit</span>
                <span className="font-bold" style={{ color: card.text }}>GH₵ {(report.nhisSales + report.creditSales).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium border" style={{ borderColor: card.border, color: card.text }}>
                Continue Selling
              </button>
              <button 
                onClick={onComplete}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-danger text-white flex items-center justify-center gap-2"
                style={{ background: '#EF4444' }}
              >
                Sign Out & Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm text-danger">Failed to generate report. Please try again.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl border" style={{ borderColor: card.border, color: card.text }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [staffModalMode, setStaffModalMode] = useState<'invite' | 'create'>('invite');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { staff: liveStaff, me, loadingStaff, inviteStaff: storeInviteStaff, createStaffAccount, updateDutyStatus, updateStaffProfile } = useStore();
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; email: string; password: string } | null>(null);
  
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleGenerateTempPassword = async (staffId: string, staffName: string, staffEmail: string) => {
    setActiveDropdownId(null);
    try {
      const result = await gql<{ generateTempPassword: string }>(M_GENERATE_TEMP_PASSWORD, { userId: staffId });
      if (result?.generateTempPassword) {
        setTempPasswordInfo({ name: staffName, email: staffEmail, password: result.generateTempPassword });
      }
    } catch (err: any) {
      setPageMessage({ type: 'error', text: err?.message || 'Failed to generate temporary password' });
      setTimeout(() => setPageMessage(null), 5000);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await gql(M_FORGOT_PASSWORD, { email });
      setPageMessage({ type: 'success', text: `A secure password reset link has been successfully emailed to ${email}.` });
      setTimeout(() => setPageMessage(null), 5000);
    } catch (err: any) {
      setPageMessage({ type: 'error', text: err?.message || 'Failed to send password reset link' });
      setTimeout(() => setPageMessage(null), 5000);
    }
  };

  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const [activeTab, setActiveTab] = useState<'staff' | 'roster' | 'invites'>('staff');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'on-duty' | 'off-duty'>('all');
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);
  const [localAvatars, setLocalAvatars] = useState<Record<string, string>>({});

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 20px 50px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.04)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
    success: '#10B981',
    warning: '#F59E0B',
  };

  const filteredStaff = liveStaff.filter(s => {
    const fullName = s.name.toLowerCase();
    const matchSearch = fullName.includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || 
      (filter === 'active' && s.isActive) ||
      (filter === 'inactive' && !s.isActive) ||
      (filter === 'on-duty' && s.isActive && s.isOnDuty) ||
      (filter === 'off-duty' && s.isActive && !s.isOnDuty);
    return matchSearch && matchFilter;
  });

  const isManager = ['ROOT', 'OWNER', 'MANAGER', 'SE_ADMIN'].includes(me?.role || '');

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users size={24} />
            </div>
            <h1 className="font-display text-4xl font-black tracking-tight" style={{ color: card.text }}>
              {isManager ? 'Staff Nexus' : 'Clinical Team'}
            </h1>
          </div>
          <p className="text-sm font-medium ml-11" style={{ color: card.muted }}>
            {isManager ? 'Orchestrate your pharmacy workforce and permissions' : 'Your professional colleagues at Azzay Pharmacy'}
          </p>
        </div>
        
        <div className="flex gap-3 ml-11 md:ml-0">
          {isManager ? (
            <>
              <button 
                onClick={() => { setStaffModalMode('invite'); setShowStaffModal(true); }}
                className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all hover:scale-105 active:scale-95"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                INVITE STAFF
              </button>
              <button 
                onClick={() => { setStaffModalMode('create'); setShowStaffModal(true); }}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20"
                style={{ background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: isDark ? '#060B14' : '#fff' }}>
                <Plus size={20} /> ADD NEW STAFF
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowEndOfDayModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all hover:scale-105 active:scale-95 bg-red-500 text-white shadow-xl shadow-red-500/20 uppercase tracking-widest">
              <LogOut size={18} /> End of Session
            </button>
          )}
        </div>
      </div>

      {/* Stats (Glassmorphism cards) */}
      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Personnel', value: liveStaff.length, icon: Users, color: '#0EA5E9' },
            { label: 'Currently Active', value: liveStaff.filter(s => s.isActive && s.isOnDuty).length, icon: Activity, color: '#10B981' },
            { label: 'Available / Off', value: liveStaff.filter(s => s.isActive && !s.isOnDuty).length, icon: Timer, color: '#F59E0B' },
            { label: 'Permissions Restricted', value: liveStaff.filter(s => !s.isActive).length, icon: Shield, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} className="rounded-[24px] border p-5 backdrop-blur-2xl transition-all hover:translate-y-[-2px]"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                  <s.icon size={22} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="font-display text-2xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1.5" style={{ color: card.muted }}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Page messages */}
      {pageMessage && (
        <div className={`rounded-2xl border px-6 py-4 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${pageMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {pageMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {pageMessage.text}
        </div>
      )}

      {/* Tools & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-2">
        <div className="relative w-full md:w-[400px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-500" size={18} style={{ color: card.subtle }} />
          <input 
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or role..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm font-medium outline-none border transition-all focus:ring-4 focus:ring-blue-500/10"
            style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#fff', borderColor: card.border, color: card.text }}
          />
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          <div className="flex gap-1.5 p-1 rounded-2xl border" style={{ borderColor: card.border, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(248,250,252,0.8)' }}>
            {(['all', 'active', 'on-duty', 'inactive'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'shadow-sm' : ''}`}
                style={{
                  background: filter === f ? card.primary : 'transparent',
                  color: filter === f ? (isDark ? '#060B14' : '#fff') : card.subtle,
                }}>
                {f}
              </button>
            ))}
          </div>
          
          <div className="flex gap-1 p-1 rounded-2xl border" style={{ borderColor: card.border, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(248,250,252,0.8)' }}>
            <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-400'}`}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('cards')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-400'}`}>
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {viewMode === 'table' ? (
          <div className="overflow-hidden rounded-[32px] border backdrop-blur-xl" style={{ borderColor: card.border, background: card.bg, boxShadow: card.shadow }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: card.divider, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: card.muted }}>Personnel</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: card.muted }}>Credential</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: card.muted }}>Assignment</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: card.muted }}>Session Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: card.muted }}>Control</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: card.divider }}>
                {filteredStaff.map(staff => {
                  const roleStyle = ROLE_COLORS[staff.role] || ROLE_COLORS.CASHIER;
                  const statusKey = !staff.isActive ? 'inactive' : staff.isOnDuty ? 'on-duty' : 'off-duty';
                  const statusStyle = STATUS_COLORS[statusKey];
                  return (
                    <tr key={staff.id} className="group transition-all hover:bg-blue-500/[0.02]">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${roleStyle.color}20, ${roleStyle.color}10)`, border: `1px solid ${roleStyle.color}30` }}>
                            <span className="font-display text-lg font-black" style={{ color: roleStyle.color }}>
                              {staff.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-display text-base font-bold" style={{ color: card.text }}>{staff.name}</p>
                            <p className="text-xs font-medium" style={{ color: card.muted }}>{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest"
                          style={{ background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.color}20` }}>
                          <Shield size={12} /> {staff.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: card.text }}>
                          <MapPin size={14} className="text-blue-500" />
                          {staff.branch?.name || 'Main Nexus'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            style={{ color: statusStyle.color }}>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusStyle.color }} />
                            {statusStyle.label}
                          </span>
                          <p className="text-[10px] font-medium" style={{ color: card.subtle }}>
                            {staff.isOnDuty ? 'Session Active' : `Last seen: ${staff.lastSeen || 'N/A'}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <Link href={`/dashboard/staff/${staff.id}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-800 border border-transparent hover:border-blue-500/50 hover:text-blue-500"
                          style={{ color: card.text, borderColor: card.border }}>
                          Profile <ChevronRightIcon size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map(staff => {
              const roleStyle = ROLE_COLORS[staff.role] || ROLE_COLORS.CASHIER;
              const statusKey = !staff.isActive ? 'inactive' : staff.isOnDuty ? 'on-duty' : 'off-duty';
              const statusStyle = STATUS_COLORS[statusKey];
              return (
                <div key={staff.id} 
                  onClick={() => router.push(`/dashboard/staff/${staff.id}`)}
                  className="group relative rounded-[30px] border p-5 transition-all duration-300 hover:translate-y-[-6px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] cursor-pointer overflow-visible"
                  style={{ 
                    background: isDark 
                      ? 'linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.85))' 
                      : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(241,245,249,0.8))',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(203,213,225,0.6)',
                    boxShadow: card.shadow 
                  }}>
                  
                  {/* Top Header - Dots action menu and mini badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {/* Ellipsis Actions Trigger */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === staff.id ? null : staff.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-slate-500/10 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdownId === staff.id && (
                        <div 
                          className="absolute right-0 mt-2 w-48 rounded-2xl border backdrop-blur-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
                          style={{ 
                            background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)', 
                            borderColor: card.border 
                          }}
                        >
                          <button 
                            onClick={() => router.push(`/dashboard/staff/${staff.id}`)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-500/10 transition-colors flex items-center gap-2"
                            style={{ color: card.text }}
                          >
                            <Users size={13} />
                            View Profile
                          </button>
                          
                          <button 
                            onClick={() => handleSendPasswordReset(staff.email)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-500/10 transition-colors flex items-center gap-2"
                            style={{ color: card.text }}
                          >
                            <Shield size={13} />
                            Send Reset Link
                          </button>

                          <button 
                            onClick={() => handleGenerateTempPassword(staff.id, staff.name, staff.email)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-500/10 transition-colors flex items-center gap-2"
                            style={{ color: '#F59E0B' }}
                          >
                            <KeyRound size={13} />
                            Generate Temp Password
                          </button>
                          
                          <button 
                            onClick={async () => {
                              await updateStaffProfile({ userId: staff.id, isActive: !staff.isActive });
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-500/10 transition-colors flex items-center gap-2 border-t"
                            style={{ 
                              color: staff.isActive ? '#EF4444' : '#10B981',
                              borderColor: card.divider 
                            }}
                          >
                            {staff.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                            {staff.isActive ? 'Deactivate Account' : 'Activate Account'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center text-center mt-2">
                    {/* Circle Avatar with Colored Halo Ring & Glowing Status Indicator */}
                    <label className="relative cursor-pointer group/avatar mb-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setLocalAvatars(prev => ({ ...prev, [staff.id]: url }));
                          }
                        }} 
                      />
                      
                      {/* Avatar Circle Container */}
                      <div className="w-16 h-16 rounded-full p-[3px] shadow-lg transition-transform duration-300 group-hover/avatar:scale-105"
                        style={{ 
                          background: `linear-gradient(135deg, ${roleStyle.color}, ${roleStyle.color}40)`
                        }}>
                        <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-900 border-2 border-white dark:border-slate-950">
                          {localAvatars[staff.id] || staff.avatarUrl ? (
                            <img src={localAvatars[staff.id] || staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                          ) : (
                            <img src="/default_avatar.png" alt={staff.name} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <span className="text-[7px] text-white font-black tracking-widest uppercase">Upload</span>
                          </div>
                        </div>
                      </div>

                      {/* Floating Status Indicator Dot */}
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 animate-pulse shadow-md"
                        style={{ background: statusStyle.color }} 
                        title={statusStyle.label}
                      />
                    </label>
                    
                    <h3 className="font-display text-base font-bold mb-0.5" style={{ color: card.text }}>{staff.name}</h3>
                    <p className="text-[10px] font-medium mb-4 opacity-50 font-mono" style={{ color: card.text }}>{staff.email}</p>
                    
                    <div className="w-full flex justify-between items-center rounded-2xl p-3 border backdrop-blur-md" 
                      style={{ 
                        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(241,245,249,0.4)', 
                        borderColor: card.border 
                      }}>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Role</span>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: roleStyle.color }}>{staff.role.replace('_', ' ')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Branch</span>
                        <p className="text-[9px] font-bold truncate max-w-[90px] opacity-80 uppercase tracking-wider" style={{ color: card.text }}>{staff.branch?.name || 'Nexus'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredStaff.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 rounded-[32px] border border-dashed" style={{ background: card.bg, borderColor: card.border }}>
            <div className="w-20 h-20 rounded-full bg-slate-500/10 flex items-center justify-center mb-6">
              <Search size={32} style={{ color: card.subtle }} />
            </div>
            <p className="text-xl font-bold mb-2" style={{ color: card.text }}>No Personnel Found</p>
            <p className="text-sm" style={{ color: card.muted }}>Adjust your filters or try a different search term</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <StaffModal
        isOpen={showStaffModal}
        action={staffModalMode}
        onClose={() => setShowStaffModal(false)}
        isDark={isDark}
        card={card}
        onInvite={async (args) => {
          const success = await storeInviteStaff(args);
          if (success) {
            setPageMessage({ type: 'success', text: `Invitation sent to ${args.email}.` });
            return true;
          }
          return false;
        }}
        onCreateAccount={async (args) => {
          const success = await createStaffAccount(args);
          if (success) {
            setPageMessage({ type: 'success', text: `Nexus account created for ${args.name}.` });
            return true;
          }
          return false;
        }}
      />
      <EndOfDayModal isOpen={showEndOfDayModal} onClose={() => setShowEndOfDayModal(false)} isDark={isDark} card={card} onComplete={async () => {
        if (!me) return;
        await updateDutyStatus(me.id, false);
        window.location.href = '/login';
      }} />

      {/* Temp Password Modal */}
      {tempPasswordInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-2xl border overflow-hidden" style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <KeyRound size={20} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <h2 className="font-bold text-base" style={{ color: card.text }}>Temporary Password</h2>
                  <p className="text-xs" style={{ color: card.muted }}>Generated for {tempPasswordInfo.name}</p>
                </div>
              </div>
              <button onClick={() => setTempPasswordInfo(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl text-center" style={{ background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.05)', border: `1px solid rgba(245,158,11,0.3)` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#F59E0B' }}>Temporary Password</p>
                <p className="text-2xl font-mono font-bold tracking-widest" style={{ color: card.text }}>{tempPasswordInfo.password}</p>
              </div>

              <div className="text-xs rounded-xl p-3" style={{ background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', color: card.muted, border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="font-bold text-red-400 mb-1">Important</p>
                <p>This password has been emailed to <strong>{tempPasswordInfo.email}</strong>. The staff member must change it upon first login.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(tempPasswordInfo.password); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  style={{ background: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  <Copy size={14} />
                  Copy Password
                </button>
                <button
                  onClick={() => setTempPasswordInfo(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: card.primary, color: '#fff' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
