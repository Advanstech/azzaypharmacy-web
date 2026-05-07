'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { 
  Search, Plus, Shield, UserCheck, UserX, MoreVertical, Mail, Phone, Calendar, 
  Clock, Activity, TrendingUp, Package, ShoppingCart, DollarSign, MapPin,
  Award, Briefcase, ChevronRight, X, Copy, Check, Send, Filter, Download,
  Users, Timer, BarChart3, FileText, AlertCircle, CheckCircle2, XCircle,
  UserPlus, ClipboardList, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon,
  LogOut, Loader2
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

// Invite Staff Modal Component
function InviteModal({ isOpen, onClose, isDark, card, onInvite }: { isOpen: boolean; onClose: () => void; isDark: boolean; card: any; onInvite: (args: { email: string; name: string; role: string; branchId: string }) => Promise<any> }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'PHARMACIST',
    branch: 'Azzay Pharmacy',
  });
  const [copied, setCopied] = useState(false);
  const inviteLink = `https://azzay.app/invite/${Math.random().toString(36).substring(7)}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-lg rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{ background: isDark ? '#0F172A' : '#fff', borderColor: card.border, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: card.border, background: card.primaryBg }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold" style={{ color: card.text }}>Invite Staff Member</h2>
              <p className="text-xs" style={{ color: card.muted }}>Send an invitation to join your pharmacy team</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: card.muted }}>First Name</label>
              <input 
                type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                placeholder="John" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: card.muted }}>Last Name</label>
              <input 
                type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                placeholder="Doe" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: card.muted }}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: card.subtle }} />
              <input 
                type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="staff@email.com" className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: card.muted }}>Role</label>
              <select 
                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              >
                <option value="PHARMACIST">Pharmacist</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
                <option value="TECHNICIAN">Technician</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: card.muted }}>Branch</label>
              <select 
                value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}
              >
                <option value="Azzay Pharmacy">Azzay Pharmacy</option>
                <option value="Azzay Chemical Shop">Azzay Chemical Shop</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3" style={{ borderColor: card.border }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: `1px solid ${card.border}`, color: card.text }}>
            Cancel
          </button>
          <button 
            onClick={async () => {
              if (!formData.email || !formData.firstName) return;
              try {
                const branchId = formData.branch === 'Azzay Pharmacy' ? 'branch-1' : 'branch-2';
                await onInvite({
                  email: formData.email,
                  name: `${formData.firstName} ${formData.lastName}`.trim(),
                  role: formData.role,
                  branchId,
                });
                onClose();
              } catch (e: any) {
                alert(`Invite failed: ${e.message}`);
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}
          >
            <Send size={14} />
            Send Invite
          </button>
        </div>
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
  const { staff: liveStaff, me, loadingStaff, inviteStaff: storeInviteStaff, updateDutyStatus } = useStore();
  
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const STAFF_DATA: StaffMember[] = liveStaff.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role as StaffMember['role'],
    branchId: s.branchId,
    branch: s.branch ? { name: s.branch.name } : undefined,
    isOnDuty: s.isOnDuty,
    lastSeen: s.lastSeen || 'Unknown',
    position: s.position || s.role,
    isActive: s.isActive,
  }));

  const [activeTab, setActiveTab] = useState<'staff' | 'roster' | 'invites'>('staff');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'on-duty' | 'off-duty'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false);

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
    divider: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.4)',
    success: '#10B981',
    warning: '#F59E0B',
  };

  const filteredStaff = STAFF_DATA.filter(s => {
    const fullName = s.name.toLowerCase();
    const matchSearch = fullName.includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || 
      (filter === 'active' && s.isActive) ||
      (filter === 'inactive' && !s.isActive) ||
      (filter === 'on-duty' && s.isActive && s.isOnDuty) ||
      (filter === 'off-duty' && s.isActive && !s.isOnDuty);
    return matchSearch && matchFilter;
  });

  const isManager = me?.role === 'MANAGER' || me?.role === 'OWNER' || me?.role === 'SE_ADMIN';

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>
            {isManager ? 'Staff Management' : 'Staff Directory'}
          </h1>
          <p className="text-sm" style={{ color: card.muted }}>
            {isManager ? 'Manage team, schedules, and invitations' : 'View your teammates and branch status'}
          </p>
        </div>
        <div className="flex gap-2">
          {isManager ? (
            <>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                <Mail size={16} /> Invite Staff
              </button>
              <button 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)', color: isDark ? '#060B14' : '#fff' }}>
                <Plus size={18} /> Add Staff
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowEndOfDayModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: '#EF4444', color: '#fff', boxShadow: '0 8px 25px rgba(239,68,68,0.3)' }}>
              <LogOut size={18} /> End of Day
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview (Managers only) */}
      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: STAFF_DATA.length, icon: Users, color: '#0EA5E9' },
            { label: 'Active Now', value: STAFF_DATA.filter(s => s.isActive && s.isOnDuty).length, icon: UserCheck, color: '#10B981' },
            { label: 'Off Duty', value: STAFF_DATA.filter(s => s.isActive && !s.isOnDuty).length, icon: Clock, color: '#F59E0B' },
            { label: 'Inactive', value: STAFF_DATA.filter(s => !s.isActive).length, icon: UserX, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4 backdrop-blur-xl"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: card.muted }}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Directory */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: card.subtle }} />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff members..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#fff', border: `1px solid ${card.border}`, color: card.text }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'on-duty', 'off-duty', 'inactive'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: filter === f ? card.primaryBg : 'transparent',
                  color: filter === f ? card.primary : card.subtle,
                  border: filter === f ? `1px solid ${card.primaryBorder}` : `1px solid ${card.border}`,
                }}>
                {f.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStaff.map(staff => {
            const roleStyle = ROLE_COLORS[staff.role] || ROLE_COLORS.CASHIER;
            const statusKey = !staff.isActive ? 'inactive' : staff.isOnDuty ? 'active' : 'off-duty';
            const statusStyle = STATUS_COLORS[statusKey];
            return (
              <div key={staff.id} className="rounded-2xl border p-4 backdrop-blur-xl transition-all hover:scale-[1.01]"
                style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
                
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: roleStyle.bg, border: `2px solid ${roleStyle.color}30` }}>
                    <span className="font-display text-sm font-bold" style={{ color: roleStyle.color }}>
                      {staff.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-bold truncate" style={{ color: card.text }}>{staff.name}</h3>
                    <p className="text-xs truncate" style={{ color: card.muted }}>{staff.email}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: roleStyle.bg, color: roleStyle.color }}>
                    <Shield size={10} /> {staff.role}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: card.subtle }}>
                    <MapPin size={10} /> {staff.branch?.name || 'Main Branch'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t" style={{ borderColor: card.divider }}>
                  <div className="text-center">
                    <p className="font-display text-xs font-bold" style={{ color: card.primary }}>{staff.position}</p>
                    <p className="text-[9px] uppercase tracking-tighter" style={{ color: card.muted }}>Position</p>
                  </div>
                  <div className="text-center border-l" style={{ borderColor: card.divider }}>
                    <p className="font-display text-xs font-bold" style={{ color: staff.isOnDuty ? card.success : card.warning }}>{staff.lastSeen}</p>
                    <p className="text-[9px] uppercase tracking-tighter" style={{ color: card.muted }}>Last Seen</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-16 rounded-2xl border" style={{ background: card.bg, borderColor: card.border }}>
            <Users size={48} style={{ color: card.subtle }} className="mx-auto mb-3" />
            <p className="text-base font-semibold" style={{ color: card.text }}>No staff members found</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} isDark={isDark} card={card} onInvite={storeInviteStaff} />
      <EndOfDayModal isOpen={showEndOfDayModal} onClose={() => setShowEndOfDayModal(false)} isDark={isDark} card={card} onComplete={async () => {
        // Log out logic
        await updateDutyStatus(me!.id, false);
        window.location.href = '/login';
      }} />
    </div>
  );
}
