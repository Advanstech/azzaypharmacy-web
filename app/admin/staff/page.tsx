'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, TrendingUp, Target, Activity, Shield, Phone, MapPin, 
  Mail, Award, CheckCircle, XCircle, Plus, X, Key, Eye, EyeOff, Loader2, AlertCircle, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useState, useMemo, useEffect } from 'react';
import { StaffMember } from '@/lib/store';
import { useTheme } from 'next-themes';
import { gql, Q_BRANCHES } from '@/lib/gql';
import Link from 'next/link';

export default function StaffIntelligencePage() {
  const { staff, sales, updateDutyStatus, updateStaffProfile, createStaffAccount, me, deleteStaff } = useStore();
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  const [mounted, setMounted] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Onboarding Modal states
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formRole, setFormRole] = useState('CASHIER');
  const [formBranchId, setFormBranchId] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingOnboard, setSubmittingOnboard] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Delete confirmation states
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { 
    setMounted(true); 
  }, []);

  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const data = await gql<{ branches: any[] }>(Q_BRANCHES);
      setBranches(data.branches || []);
      if (data.branches?.length > 0) {
        setFormBranchId(data.branches[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch branches", e);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchBranches();
    }
  }, [mounted]);

  const totalPages = Math.ceil(staff.length / itemsPerPage);
  const paginatedStaff = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return staff.slice(startIndex, startIndex + itemsPerPage);
  }, [staff, currentPage]);

  const activeStaffCount = useMemo(() => staff.filter(s => s.isActive).length, [staff]);

  const { topPerformer, topPerformerRevenue, totalRevenue, totalTransactions } = useMemo(() => {
    let revenue = 0;
    const staffSales: Record<string, { name: string; revenue: number; txCount: number }> = {};

    sales.forEach(sale => {
      revenue += sale.totalAmount;
      if (sale.user?.id) {
        if (!staffSales[sale.user.id]) {
          staffSales[sale.user.id] = { name: sale.user.name, revenue: 0, txCount: 0 };
        }
        staffSales[sale.user.id].revenue += sale.totalAmount;
        staffSales[sale.user.id].txCount += 1;
      }
    });

    let topName = 'N/A';
    let maxRev = 0;
    Object.values(staffSales).forEach(s => {
      if (s.revenue > maxRev) {
        maxRev = s.revenue;
        topName = s.name;
      }
    });

    return {
      topPerformer: topName,
      topPerformerRevenue: maxRev,
      totalRevenue: revenue,
      totalTransactions: sales.length
    };
  }, [sales]);

  const handleDutyToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDutyStatus(userId, !currentStatus);
    } catch (e) {
      console.error("Failed to update duty status", e);
    }
  };

  const handleActiveToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await updateStaffProfile({ userId, isActive: !currentStatus });
    } catch (e) {
      console.error("Failed to update active status", e);
    }
  };

  const handleDeleteStaff = async () => {
    if (!confirmDeleteStaff) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStaff(confirmDeleteStaff.id);
      setConfirmDeleteStaff(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff member');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pass);
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formBranchId || !formPassword) {
      setOnboardError("Please fill all required fields");
      return;
    }
    setOnboardError(null);
    setSubmittingOnboard(true);
    try {
      const success = await createStaffAccount({
        email: formEmail,
        password: formPassword,
        name: formName,
        role: formRole,
        branchId: formBranchId,
        position: formPosition || undefined,
      });

      if (success) {
        alert(`Staff account for ${formName} created successfully!\nEmail: ${formEmail}\nPassword: ${formPassword}\n\nPlease share these credentials with the new staff member.`);
        // Reset form
        setFormName('');
        setFormEmail('');
        setFormPosition('');
        setFormRole('CASHIER');
        setFormPassword('');
        setOnboardModalOpen(false);
      } else {
        setOnboardError("Failed to create staff account. The email might already be registered.");
      }
    } catch (err: any) {
      console.error(err);
      setOnboardError(err.message || "Failed to create staff account");
    } finally {
      setSubmittingOnboard(false);
    }
  };

  const card = {
    bg: isDark ? '#0F172A' : '#FFFFFF',
    border: isDark ? '#1E293B' : '#E2E8F0',
    text: isDark ? '#E2E8F0' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    inputBg: isDark ? '#1E293B' : '#F8FAFC',
  };

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>Staff Intelligence</h1>
          <p className="text-sm font-medium mt-1" style={{ color: card.muted }}>
            Profile-based analytics, sales performance, and access management.
          </p>
        </div>
        <button 
          onClick={() => setOnboardModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
        >
          <Plus size={16} />
          Onboard New Staff
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ background: card.bg, borderColor: card.border }}>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: card.muted }}>Active Staff</p>
          <p className="text-3xl font-display font-black" style={{ color: card.text }}>{activeStaffCount}</p>
        </motion.div>
        
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ background: card.bg, borderColor: card.border }}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
            <Award size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: card.muted }}>Top Performer</p>
          <p className="text-2xl font-display font-bold truncate" style={{ color: card.text }}>{topPerformer}</p>
          <p className="text-xs font-mono font-medium text-emerald-500 mt-1">GH₵ {topPerformerRevenue.toFixed(2)}</p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ background: card.bg, borderColor: card.border }}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: card.muted }}>Total Team Revenue</p>
          <p className="text-3xl font-display font-black" style={{ color: card.text }}>GH₵ {totalRevenue.toFixed(2)}</p>
        </motion.div>
        
        <motion.div whileHover={{ y: -4 }} className="p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ background: card.bg, borderColor: card.border }}>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: card.muted }}>Total Transactions</p>
          <p className="text-3xl font-display font-black" style={{ color: card.text }}>{totalTransactions}</p>
        </motion.div>
      </div>

      <div className="mt-8 rounded-3xl border overflow-hidden shadow-sm" style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: card.border }}>
        <div className="px-6 py-5 border-b flex justify-between items-center" style={{ borderColor: card.border, background: isDark ? '#0F172A' : '#F8FAFC' }}>
          <h2 className="font-display font-bold text-lg" style={{ color: card.text }}>Staff Roster</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: isDark ? '#0F172A' : '#F8FAFC', borderBottom: `1px solid ${card.border}` }}>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Staff Member</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: card.muted }}>Branch</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center" style={{ color: card.muted }}>On Duty</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center" style={{ color: card.muted }}>Account Active</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center" style={{ color: card.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaff.map((member, index) => (
                <motion.tr 
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  style={{ borderBottom: `1px solid ${card.border}` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-lg shadow-sm" style={{ background: isDark ? '#1E293B' : '#F1F5F9', color: isDark ? '#94A3B8' : '#64748B' }}>
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <Link href={`/admin/staff/${member.id}`} className="font-bold text-base hover:text-blue-500 hover:underline transition-colors block" style={{ color: card.text }}>
                          {member.name}
                        </Link>
                        <p className="text-xs font-medium mt-0.5 flex items-center gap-1" style={{ color: card.muted }}>
                          <Mail size={12} /> {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {member.branch?.name ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: card.text }}>
                          <MapPin size={12} style={{ color: card.muted }} />
                          {member.branch.name.toLowerCase().includes('chemical') ? 'Chemical Shop' : 'Main Branch'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs opacity-50" style={{ color: card.muted }}>No branch assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDutyToggle(member.id, member.isOnDuty)}
                      className="inline-flex flex-col items-center justify-center p-2 rounded-xl transition-all hover:scale-105"
                      disabled={me?.id === member.id && !member.isOnDuty}
                    >
                      {member.isOnDuty ? (
                        <CheckCircle size={28} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                      ) : (
                        <XCircle size={28} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleActiveToggle(member.id, member.isActive)}
                      className="inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors relative"
                      style={{ background: member.isActive ? '#10B981' : (isDark ? '#334155' : '#CBD5E1') }}
                      disabled={me?.id === member.id}
                    >
                      <span 
                        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm"
                        style={{ transform: member.isActive ? 'translateX(10px)' : 'translateX(-10px)' }}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setConfirmDeleteStaff(member);
                      }}
                      disabled={me?.id === member.id}
                      className="inline-flex items-center justify-center p-2 rounded-lg transition-all hover:scale-105 hover:bg-red-500/10 text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={me?.id === member.id ? 'Cannot delete yourself' : 'Delete staff member'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: card.border, background: isDark ? '#0F172A' : '#F8FAFC' }}>
            <p className="text-xs font-medium" style={{ color: card.muted }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, staff.length)} of {staff.length} staff
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ borderColor: card.border, color: card.text }}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      currentPage === i + 1 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    style={{ 
                      color: currentPage === i + 1 ? '#FFF' : card.text,
                      border: currentPage === i + 1 ? 'none' : `1px solid ${card.border}`
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ borderColor: card.border, color: card.text }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteStaff && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
              style={{ background: card.bg, borderColor: card.border }}
            >
              <div className="p-6 md:p-8">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-5">
                  <Trash2 size={28} />
                </div>
                <h2 className="text-xl font-black tracking-tight mb-2" style={{ color: card.text }}>
                  Delete Staff Member
                </h2>
                <p className="text-sm leading-relaxed mb-1" style={{ color: card.muted }}>
                  Are you sure you want to delete <strong style={{ color: card.text }}>{confirmDeleteStaff.name}</strong>? This action will:
                </p>
                <ul className="text-sm list-disc list-inside mb-4" style={{ color: card.muted }}>
                  <li>Deactivate their account</li>
                  <li>Remove them from the roster</li>
                  <li>Disable their login access</li>
                </ul>
                <p className="text-xs font-bold" style={{ color: '#EF4444' }}>This action cannot be undone.</p>
                {deleteError && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle size={16} />
                    {deleteError}
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 shrink-0 border-t flex gap-4" style={{ borderColor: card.border, background: isDark ? '#0F172A' : '#F8FAFC' }}>
                <button
                  onClick={() => setConfirmDeleteStaff(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  style={{ color: card.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStaff}
                  disabled={isDeleting}
                  className="flex-[2] py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-70"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {isDeleting ? 'Deleting...' : 'Delete Staff'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboard New Staff Modal */}
      <AnimatePresence>
        {onboardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pb-4 px-4 sm:px-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setOnboardModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[32px] overflow-hidden border shadow-2xl"
              style={{ background: isDark ? '#0A0F1E' : '#FFFFFF', borderColor: card.border }}
            >
              {/* Header */}
              <div className="p-6 md:p-8 shrink-0 border-b flex items-center justify-between" style={{ borderColor: card.border }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold" style={{ color: card.text }}>Onboard New Staff</h2>
                    <p className="text-xs" style={{ color: card.muted }}>Create user profile and configure credentials</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setOnboardModalOpen(false);
                    setOnboardError(null);
                  }} 
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                {onboardError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{onboardError}</span>
                  </div>
                )}

                <form id="onboard-staff-form" onSubmit={handleOnboardSubmit} className="space-y-8">
                  {/* Section 1 */}
                  <div>
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
                      <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">1</span>
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Full Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" required value={formName} onChange={e => setFormName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Email Address <span className="text-red-500">*</span></label>
                        <input 
                          type="email" required value={formEmail} onChange={e => setFormEmail(e.target.value)}
                          placeholder="john.doe@gmail.com"
                          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2 */}
                  <div className="pt-6 border-t" style={{ borderColor: card.border }}>
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
                      <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">2</span>
                      Role & Assignment
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Designated Role <span className="text-red-500">*</span></label>
                        <select 
                          value={formRole} onChange={e => setFormRole(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                        >
                          <option value="CASHIER">Cashier</option>
                          <option value="PHARMACIST">Pharmacist</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Assigned Branch <span className="text-red-500">*</span></label>
                        <select 
                          value={formBranchId} onChange={e => setFormBranchId(e.target.value)} required
                          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                        >
                          {loadingBranches ? (
                            <option>Loading branches...</option>
                          ) : branches.length === 0 ? (
                            <option value="">No branches found</option>
                          ) : (
                            branches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-2 block" style={{ color: card.muted }}>
                        Position / Title <span className="font-normal opacity-70 normal-case">(Optional)</span>
                      </label>
                      <input 
                        type="text" value={formPosition} onChange={e => setFormPosition(e.target.value)}
                        placeholder="e.g. Head Pharmacist, Intern"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                      />
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div className="pt-6 border-t" style={{ borderColor: card.border }}>
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
                      <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">3</span>
                      Security Credentials
                    </h3>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider mb-2 block" style={{ color: card.muted }}>Initial Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'} required value={formPassword} onChange={e => setFormPassword(e.target.value)}
                          placeholder="Configure secure password"
                          className="w-full pl-4 pr-24 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                          style={{ background: card.inputBg, border: `1px solid ${card.border}`, color: card.text }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button" onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 transition-colors"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            type="button" onClick={handleGeneratePassword}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors"
                            title="Generate Password"
                          >
                            <Key size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] mt-2 font-medium opacity-70" style={{ color: card.muted }}>Staff can securely change their password later from their profile settings.</p>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 shrink-0 border-t bg-black/5 dark:bg-white/5 flex gap-4" style={{ borderColor: card.border }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setOnboardModalOpen(false);
                    setOnboardError(null);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  style={{ color: card.text }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="onboard-staff-form"
                  disabled={submittingOnboard}
                  className="flex-[2] py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-70"
                >
                  {submittingOnboard ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Complete Onboarding
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
