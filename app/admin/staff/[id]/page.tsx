'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/pharma-toast';
import { gql, Q_BRANCHES, Q_STAFF_ACTIVITIES } from '@/lib/gql';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Award, Briefcase, Shield,
  Clock, Activity, Package, ShoppingCart, DollarSign, UserCheck,
  FileText, BarChart3, CalendarDays, Edit2, CheckCircle2, AlertCircle,
  X, Save, Loader2, Building, ToggleLeft, ToggleRight, Key, Trash2
} from 'lucide-react';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  status: string;
  lastLogin: string;
  joinedDate: string;
  licenseNumber?: string;
  specialization?: string;
  address?: string;
  emergencyContact?: string;
  shiftsThisWeek: number;
  totalSales: number;
  performanceScore: number;
}

type StaffDetail = StaffMember | {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
  branch?: string | { name: string };
  status?: string;
  isActive?: boolean;
  lastLogin?: string;
  joinedDate?: string;
  licenseNumber?: string;
  specialization?: string;
  address?: string;
  emergencyContact?: string;
  shiftsThisWeek?: number;
  totalSales?: number;
  performanceScore?: number;
};

type BranchOption = {
  id: string;
  name: string;
  location?: string;
  phone?: string;
};

const STAFF: StaffMember[] = [
  { id: '1', firstName: 'Kwame', lastName: 'Asante', email: 'kwame@azzay.app', phone: '+233 24 000 0001', role: 'OWNER', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '2 min ago', joinedDate: '2023-01-15', licenseNumber: 'GPhC-2023-001', address: 'Dormaa Central, Bono Region', emergencyContact: '+233 24 111 1111', shiftsThisWeek: 7, totalSales: 125000, performanceScore: 98 },
  { id: '2', firstName: 'Abena', lastName: 'Mensah', email: 'abena@azzay.app', phone: '+233 24 000 0002', role: 'PHARMACIST', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '1 hr ago', joinedDate: '2023-03-10', licenseNumber: 'GPhC-2023-045', specialization: 'Clinical Pharmacy', address: 'Dormaa Ahenkro', emergencyContact: '+233 24 222 2222', shiftsThisWeek: 5, totalSales: 45000, performanceScore: 94 },
  { id: '6', firstName: 'Adua', lastName: 'Azare', email: 'adua.azare@azzay.app', phone: '+233 24 123 4567', role: 'PHARMACIST', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '15 min ago', joinedDate: '2024-06-01', licenseNumber: 'GPhC-2024-112', specialization: 'Community Pharmacy', address: 'Dormaa Central, Near Market', emergencyContact: '+233 24 987 6543', shiftsThisWeek: 4, totalSales: 32000, performanceScore: 92 },
  { id: '7', firstName: 'Otuwa', lastName: 'Francis', email: 'otuwa.francis@azzay.app', phone: '+233 24 234 5678', role: 'PHARMACIST', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '45 min ago', joinedDate: '2024-06-01', licenseNumber: 'GPhC-2024-113', specialization: 'Pharmaceutical Care', address: 'Dormaa Central, Zongo Area', emergencyContact: '+233 24 876 5432', shiftsThisWeek: 4, totalSales: 28000, performanceScore: 88 },
  { id: '8', firstName: 'Dery', lastName: 'Ancelm', email: 'dery.ancelm@azzay.app', phone: '+233 24 345 6789', role: 'PHARMACIST', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '2 hrs ago', joinedDate: '2024-06-15', licenseNumber: 'GPhC-2024-114', specialization: 'Pediatric Pharmacy', address: 'Dormaa Central, Hospital Road', emergencyContact: '+233 24 765 4321', shiftsThisWeek: 5, totalSales: 35000, performanceScore: 90 },
  { id: '9', firstName: 'Ibrahim', lastName: 'Latifa', email: 'ibrahim.latifa@azzay.app', phone: '+233 24 456 7890', role: 'PHARMACIST', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '30 min ago', joinedDate: '2024-07-01', licenseNumber: 'GPhC-2024-115', specialization: 'Compounding', address: 'Dormaa Central, Main Street', emergencyContact: '+233 24 654 3210', shiftsThisWeek: 4, totalSales: 31000, performanceScore: 91 },
  { id: '10', firstName: 'Kumi', lastName: 'Faisal', email: 'kumi.faisal@azzay.app', phone: '+233 24 567 8901', role: 'PHARMACIST', branch: 'Azzay Pharmacy', status: 'active', lastLogin: '1 hr ago', joinedDate: '2024-07-01', licenseNumber: 'GPhC-2024-116', specialization: 'Clinical Pharmacology', address: 'Dormaa Central, lorry Station', emergencyContact: '+233 24 543 2109', shiftsThisWeek: 5, totalSales: 33000, performanceScore: 89 },
  { id: '11', firstName: 'Henewaa', lastName: 'Apraku Sandr', email: 'henewaa.sandr@azzay.app', phone: '+233 24 678 9012', role: 'PHARMACIST', branch: 'Azzay Chemical Shop', status: 'active', lastLogin: '10 min ago', joinedDate: '2024-08-01', licenseNumber: 'GPhC-2024-117', specialization: 'Industrial Pharmacy', address: 'Dormaa Chemical Shop Area', emergencyContact: '+233 24 432 1098', shiftsThisWeek: 5, totalSales: 29000, performanceScore: 87 },
  { id: '12', firstName: 'Antwi', lastName: 'Emmanuel', email: 'antwi.emmanuel@azzay.app', phone: '+233 24 789 0123', role: 'PHARMACIST', branch: 'Azzay Chemical Shop', status: 'active', lastLogin: '5 min ago', joinedDate: '2024-08-01', licenseNumber: 'GPhC-2024-118', specialization: 'Quality Control', address: 'Dormaa Central, Industrial Area', emergencyContact: '+233 24 321 0987', shiftsThisWeek: 5, totalSales: 27000, performanceScore: 93 },
  { id: '3', firstName: 'Kofi', lastName: 'Boateng', email: 'kofi@azzay.app', phone: '+233 24 000 0003', role: 'CASHIER', branch: 'Azzay Chemical Shop', status: 'active', lastLogin: '3 hrs ago', joinedDate: '2023-06-20', address: 'Dormaa Central', shiftsThisWeek: 6, totalSales: 18000, performanceScore: 85 },
  { id: '4', firstName: 'Ama', lastName: 'Owusu', email: 'ama@azzay.app', phone: '+233 24 000 0004', role: 'TECHNICIAN', branch: 'Azzay Pharmacy', status: 'inactive', lastLogin: '2 days ago', joinedDate: '2023-08-15', address: 'Dormaa Central', shiftsThisWeek: 0, totalSales: 12000, performanceScore: 72 },
  { id: '5', firstName: 'Yaw', lastName: 'Darko', email: 'yaw@azzay.app', phone: '+233 24 000 0005', role: 'MANAGER', branch: 'Azzay Chemical Shop', status: 'active', lastLogin: '30 min ago', joinedDate: '2023-04-01', address: 'Dormaa Central', shiftsThisWeek: 6, totalSales: 55000, performanceScore: 96 },
];

// Activity Log Data
interface Activity {
  id: string;
  type: 'sale' | 'login' | 'logout' | 'password' | 'prescription' | 'inventory' | 'invoice' | 'shift' | 'security';
  description: string;
  timestamp: string;
  amount?: number;
  details?: string;
  date?: number;
}

const ACTIVITIES: Record<string, Activity[]> = {
  '6': [ // Adua Azare
    { id: 'a1', type: 'sale', description: 'Sold Amoxicillin 500mg (20 units)', timestamp: '2026-05-03 09:23', amount: 240.00, details: 'Receipt #POS-284756' },
    { id: 'a2', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 08:15' },
    { id: 'a3', type: 'prescription', description: 'Verified prescription for Diabetes medication', timestamp: '2026-05-03 10:45', details: 'Patient: John Doe' },
    { id: 'a4', type: 'sale', description: 'Sold Coartem Tablets (2 packs)', timestamp: '2026-05-03 11:30', amount: 70.00 },
    { id: 'a5', type: 'shift', description: 'Started morning shift', timestamp: '2026-05-03 08:00' },
    { id: 'a6', type: 'inventory', description: 'Adjusted stock for ALKA 5 SYRUP', timestamp: '2026-05-03 12:22', details: 'Quantity updated: +8 units' },
    { id: 'a7', type: 'invoice', description: 'Uploaded supplier invoice', timestamp: '2026-05-03 12:41', details: 'Invoice #INV-2026-0456' },
    { id: 'a8', type: 'password', description: 'Password changed successfully', timestamp: '2026-05-03 13:05' },
    { id: 'a9', type: 'logout', description: 'Logged out from POS terminal', timestamp: '2026-05-03 13:11' },
    { id: 'a10', type: 'security', description: '2FA verified for admin action', timestamp: '2026-05-03 13:18' },
  ],
  '7': [ // Otuwa Francis
    { id: 'a1', type: 'sale', description: 'Sold Paracetamol 500mg (100 tablets)', timestamp: '2026-05-03 09:45', amount: 25.00 },
    { id: 'a2', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 08:30' },
    { id: 'a3', type: 'inventory', description: 'Restocked Vitamin B Complex', timestamp: '2026-05-03 11:00', details: '50 units added' },
  ],
  '8': [ // Dery Ancelm
    { id: 'a1', type: 'prescription', description: 'Consulted on pediatric dosage', timestamp: '2026-05-03 09:00', details: 'Patient: Child, 5 years' },
    { id: 'a2', type: 'sale', description: 'Sold Pediatric Antibiotics', timestamp: '2026-05-03 10:15', amount: 85.00 },
    { id: 'a3', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 07:45' },
  ],
  '9': [ // Ibrahim Latifa
    { id: 'a1', type: 'sale', description: 'Compounded custom medication', timestamp: '2026-05-03 10:00', amount: 120.00, details: 'Special compound for skin treatment' },
    { id: 'a2', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 08:45' },
  ],
  '10': [ // Kumi Faisal
    { id: 'a1', type: 'sale', description: 'Sold Cardiovascular medications', timestamp: '2026-05-03 11:20', amount: 340.00 },
    { id: 'a2', type: 'prescription', description: 'Drug interaction check completed', timestamp: '2026-05-03 09:30' },
    { id: 'a3', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 08:00' },
    { id: 'a4', type: 'invoice', description: 'Reviewed supplier invoice upload', timestamp: '2026-05-03 12:05', details: 'Marked as received' },
    { id: 'a5', type: 'logout', description: 'Logged out from dashboard', timestamp: '2026-05-03 16:45' },
  ],
  '11': [ // Henewaa Apraku Sandr
    { id: 'a1', type: 'inventory', description: 'Received chemical supplies shipment', timestamp: '2026-05-03 09:00', details: 'Batch #CHM-2026-042' },
    { id: 'a2', type: 'sale', description: 'Industrial chemical sale', timestamp: '2026-05-03 14:30', amount: 1200.00 },
    { id: 'a3', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 07:30' },
  ],
  '12': [ // Antwi Emmanuel
    { id: 'a1', type: 'inventory', description: 'Quality control inspection', timestamp: '2026-05-03 10:00', details: 'All batches passed QC' },
    { id: 'a2', type: 'sale', description: 'Sold laboratory reagents', timestamp: '2026-05-03 15:00', amount: 450.00 },
    { id: 'a3', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 08:00' },
  ],
};

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  ROOT:       { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  OWNER:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  MANAGER:    { color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
  PHARMACIST: { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  TECHNICIAN: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  CASHIER:    { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  INTERN:     { color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
};

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  active:   { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'Active' },
  inactive: { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: 'Inactive' },
  pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Pending' },
  'on-leave': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', label: 'On Leave' },
};

const ACTIVITY_ICONS = {
  sale: ShoppingCart,
  login: UserCheck,
  logout: ToggleLeft,
  password: Key,
  prescription: FileText,
  inventory: Package,
  invoice: Building,
  shift: Clock,
  security: Shield,
};

const ACTIVITY_COLORS = {
  sale: '#10B981',
  login: '#0EA5E9',
  logout: '#64748B',
  password: '#F59E0B',
  prescription: '#8B5CF6',
  inventory: '#F59E0B',
  invoice: '#14B8A6',
  shift: '#6366F1',
  security: '#EC4899',
};

function toActivityDate(timestamp: string): number {
  const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return timestamp.split(' ')[1] || timestamp;
  }
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getNameParts(staff: StaffDetail) {
  const fullName = typeof (staff as any).name === 'string'
    ? (staff as any).name
    : 'firstName' in staff && staff.firstName && 'lastName' in staff && staff.lastName
      ? `${staff.firstName} ${staff.lastName}`
      : staff.email || 'Unknown';
  const [firstName = '', ...rest] = fullName.split(' ');
  const lastName = rest.join(' ');
  return { fullName, firstName, lastName };
}

function getInitials(staff: StaffDetail) {
  const { firstName, lastName } = getNameParts(staff);
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

function getFullName(staff: StaffDetail) {
  return getNameParts(staff).fullName;
}

const ROLES = ['OWNER', 'MANAGER', 'HEAD_PHARMACIST', 'PHARMACIST', 'TECHNICIAN', 'CASHIER', 'INTERN', 'SE_ADMIN'];

export default function StaffDetailPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const staffId = params.id as string;
  const { staff: liveStaff, loadingStaff, updateStaffProfile, generateTempPassword, sales, me, deleteStaff } = useStore();
  const { addToast } = useToast();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '', position: '', branchId: '', isActive: true });
  const [isSaving, setIsSaving] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [backendActivities, setBackendActivities] = useState<Activity[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  const [activityPage, setActivityPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const handleGeneratePassword = async () => {
    if (!confirm("Are you sure you want to generate a new temporary password for this user?")) return;
    setGeneratingPassword(true);
    try {
      const newPass = await generateTempPassword(staffId);
      setTempPassword(newPass);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', message: err.message || 'Could not generate password', duration: 5000 });
    } finally {
      setGeneratingPassword(false);
    }
  };

  const handleDeleteStaff = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStaff(staffId);
      setShowDeleteConfirm(false);
      addToast({ type: 'success', title: 'Staff Deleted', message: 'Staff member has been removed', duration: 4000 });
      // Navigate back to staff roster
      window.location.href = '/admin/staff';
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff member');
      addToast({ type: 'error', title: 'Failed', message: err.message || 'Could not delete staff', duration: 5000 });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const data = await gql<{ branches: BranchOption[] }>(Q_BRANCHES);
        if (!cancelled) {
          setBranches(data.branches || []);
        }
      } catch (err) {
        console.error('Failed to fetch branches', err);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    };

    fetchBranches();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !staffId) return;
    let cancelled = false;

    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const data = await gql<{ staffActivities: Activity[] }>(Q_STAFF_ACTIVITIES, { userId: staffId, limit: 100 });
        if (!cancelled) {
          setBackendActivities(
            (data.staffActivities || []).map((activity) => ({
              ...activity,
              date: activity.date ?? toActivityDate(activity.timestamp),
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch staff activities', err);
        if (!cancelled) setBackendActivities([]);
      } finally {
        if (!cancelled) {
          setActivitiesLoaded(true);
          setLoadingActivities(false);
        }
      }
    };

    setActivitiesLoaded(false);
    fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [mounted, staffId]);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const liveStaffMember = liveStaff.find(s => s.id === staffId);
  const staff = liveStaffMember ?? STAFF.find(s => s.id === staffId);
  
  const liveActivities = useMemo(() => {
    const staffSales = sales.filter(s => s.cashierId === staffId || s.user?.id === staffId);
    return staffSales.map(sale => ({
      id: sale.id,
      type: 'sale' as const,
      description: `Sale completed for GH₵ ${sale.totalAmount.toLocaleString()} (${sale.items.length} items)`,
      details: undefined,
      timestamp: new Date(sale.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ''),
      amount: sale.totalAmount,
      date: new Date(sale.createdAt).getTime()
    })).sort((a, b) => b.date - a.date);
  }, [sales, staffId]);

  const baseActivities = useMemo(
    () => (ACTIVITIES[staffId] || []).map((activity) => ({
      ...activity,
      date: activity.date ?? toActivityDate(activity.timestamp),
    })),
    [staffId]
  );

  const allActivities = useMemo(() => {
    if (activitiesLoaded) return backendActivities;
    return [...liveActivities, ...baseActivities].sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [activitiesLoaded, backendActivities, liveActivities, baseActivities]);
  
  const totalPages = Math.max(1, Math.ceil(allActivities.length / ITEMS_PER_PAGE));
  const paginatedActivities = allActivities.slice((activityPage - 1) * ITEMS_PER_PAGE, activityPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setActivityPage(1);
  }, [staffId]);

  useEffect(() => {
    setActivityPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  if (!mounted) return null;
  if (loadingStaff && !staff) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-medium" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
          Loading staff details...
        </p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
          Staff member not found
        </p>
        <Link href="/admin/staff" className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: isDark ? 'rgba(248,250,252,0.08)' : 'rgba(14,165,233,0.1)', color: isDark ? '#F8FAFC' : '#0F172A' }}>
          Back to Staff
        </Link>
      </div>
    );
  }

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

  if (!mounted) return null;
  
  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} style={{ color: card.muted }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: card.text }}>Staff member not found</p>
        <Link href="/admin/staff" className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: card.primaryBg, color: card.primary }}>
          Back to Staff
        </Link>
      </div>
    );
  }

  const roleStyle = ROLE_COLORS[staff.role] || ROLE_COLORS.CASHIER;
  const statusKey = typeof (staff as any).status === 'string'
    ? (staff as any).status
    : (staff as any).isActive
      ? 'active'
      : 'inactive';
  const statusStyle = STATUS_COLORS[statusKey] || STATUS_COLORS.active;
  const staffBranch = typeof staff.branch === 'string' ? staff.branch : staff.branch?.name || 'Main Branch';
  const todaySales = allActivities.filter(a => a.type === 'sale').reduce((sum, a) => sum + (a.amount || 0), 0);
  const todayTransactions = allActivities.filter(a => a.type === 'sale').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link href="/admin/staff" className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: card.muted }}>
        <ArrowLeft size={16} />
        Back to Staff Directory
      </Link>

      {/* Profile Header */}
      <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center shrink-0"
            style={{ background: roleStyle.bg, border: `3px solid ${roleStyle.color}40` }}>
            <span className="font-display text-3xl font-bold" style={{ color: roleStyle.color }}>
              {getInitials(staff)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold" style={{ color: card.text }}>
                {getFullName(staff)}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: statusStyle.bg, color: statusStyle.color }}>
                {statusStyle.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: card.muted }}>
              <span className="flex items-center gap-1.5">
                <Shield size={14} style={{ color: roleStyle.color }} />
                <span className="font-medium" style={{ color: roleStyle.color }}>{staff.role}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {staffBranch}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                 Last active {(staff as any).lastLogin || 'N/A'}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t" style={{ borderColor: card.divider }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.primaryBg }}>
                  <DollarSign size={14} style={{ color: card.primary }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Today&apos;s Sales</p>
                  <p className="font-display font-bold" style={{ color: card.text }}>GH₵ {todaySales.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <ShoppingCart size={14} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Transactions</p>
                  <p className="font-display font-bold" style={{ color: card.text }}>{todayTransactions}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <Activity size={14} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Performance</p>
                  <p className="font-display font-bold" style={{ color: card.warning }}>{(staff as any).performanceScore || 100}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                const branchIdFromStaff = (staff as any).branchId || (typeof staff.branch === 'object' ? (staff.branch as any)?.id : '') || '';
                const branchNameFromStaff = typeof staff.branch === 'string' ? staff.branch : (staff.branch as any)?.name;
                const matchedByName = branchNameFromStaff ? branches.find(b => b.name === branchNameFromStaff)?.id : '';

                setEditForm({
                  name: getFullName(staff) || '',
                  email: staff.email || '',
                  phone: (staff as any).phone || '',
                  role: staff.role || '',
                  position: (staff as any).position || '',
                  branchId: branchIdFromStaff || matchedByName || '',
                  isActive: (staff as any).isActive !== false,
                });
                setShowEditModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}
            >
              <Edit2 size={14} />
              Edit Profile
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Mail size={14} />
              Send Message
            </button>
            <button 
              onClick={handleGeneratePassword}
              disabled={generatingPassword}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: `1px solid rgba(239,68,68,0.3)` }}>
              {generatingPassword ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              Generate Password
            </button>
            {me?.id !== staffId && (
              <button
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteConfirm(true);
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 text-red-500 border border-red-500/30 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Delete Staff
              </button>
            )}
          </div>
        </div>
      </div>

      {tempPassword && (
        <div className="p-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 relative backdrop-blur-xl">
          <button onClick={() => setTempPassword(null)} className="absolute top-4 right-4 text-blue-500 hover:text-blue-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-500 mb-1">Temporary Password Generated</h3>
              <p className="text-sm mb-3" style={{ color: card.text }}>Please securely share this temporary password with {getFullName(staff)}. They will be prompted to change it upon next login.</p>
              <div className="px-4 py-3 rounded-lg inline-flex items-center gap-3 border border-blue-500/30" style={{ background: card.bg }}>
                <code className="text-xl font-mono font-bold tracking-wider" style={{ color: card.text }}>{tempPassword}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Details */}
        <div className="space-y-4">
          {/* Contact Information */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
              <Mail size={16} style={{ color: card.primary }} />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={14} style={{ color: card.subtle }} />
                <span className="text-sm" style={{ color: card.text }}>{staff.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={14} style={{ color: card.subtle }} />
                <span className="text-sm" style={{ color: card.text }}>{(staff as any).phone || 'N/A'}</span>
              </div>
              {(staff as any).emergencyContact && (
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                  <AlertCircle size={14} style={{ color: '#EF4444' }} />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>Emergency Contact</p>
                    <p className="text-sm" style={{ color: card.text }}>{(staff as any).emergencyContact}</p>
                  </div>
                </div>
              )}
              {(staff as any).address && (
                <div className="flex items-start gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                  <MapPin size={14} style={{ color: card.subtle }} className="mt-0.5" />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>Address</p>
                    <p className="text-sm" style={{ color: card.text }}>{(staff as any).address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Professional Details */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
              <Award size={16} style={{ color: card.primary }} />
              Professional Details
            </h3>
            <div className="space-y-3">
              {(staff as any).licenseNumber && (
                <div className="flex items-center gap-3">
                  <Shield size={14} style={{ color: card.subtle }} />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>License Number</p>
                    <p className="text-sm font-medium" style={{ color: card.text }}>{(staff as any).licenseNumber}</p>
                  </div>
                </div>
              )}
              {(staff as any).specialization && (
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                  <Briefcase size={14} style={{ color: card.subtle }} />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>Specialization</p>
                    <p className="text-sm font-medium" style={{ color: card.text }}>{(staff as any).specialization}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                <Calendar size={14} style={{ color: card.subtle }} />
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Joined Date</p>
                  <p className="text-sm font-medium" style={{ color: card.text }}>
                    {new Date((staff as any).joinedDate || (staff as any).createdAt || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                <Clock size={14} style={{ color: card.subtle }} />
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Shifts This Week</p>
                  <p className="text-sm font-medium" style={{ color: card.text }}>{(staff as any).shiftsThisWeek || 0} shifts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2" style={{ color: card.text }}>
              <BarChart3 size={16} style={{ color: card.primary }} />
              Performance Overview
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: card.muted }}>Performance Score</span>
                  <span className="text-xs font-bold" style={{ color: ((staff as any).performanceScore ?? 100) >= 90 ? '#10B981' : ((staff as any).performanceScore ?? 100) >= 75 ? '#F59E0B' : '#EF4444' }}>
                    {((staff as any).performanceScore ?? 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full transition-all" 
                    style={{ 
                      width: `${((staff as any).performanceScore ?? 100)}%`, 
                      background: ((staff as any).performanceScore ?? 100) >= 90 ? '#10B981' : ((staff as any).performanceScore ?? 100) >= 75 ? '#F59E0B' : '#EF4444'
                    }} />
                </div>
              </div>
              <div className="pt-3 border-t" style={{ borderColor: card.divider }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: card.muted }}>Total Sales (All Time)</span>
                  <span className="text-sm font-bold" style={{ color: card.text }}>GH₵ {(((staff as any).totalSales || 0) / 1000).toFixed(1)}k</span>
                </div>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: card.divider }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: card.muted }}>Average per Shift</span>
                  <span className="text-sm font-bold" style={{ color: card.text }}>
                    GH₵ {((staff as any).shiftsThisWeek || 0) > 0 ? (((staff as any).totalSales || 0) / ((staff as any).shiftsThisWeek || 0) / 4).toFixed(0) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
              <h3 className="font-display text-sm font-bold flex items-center gap-2" style={{ color: card.text }}>
                <Activity size={16} style={{ color: card.primary }} />
                Activity Log
              </h3>
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                Today
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: card.divider }}>
              {loadingActivities ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={30} className="animate-spin" style={{ color: card.subtle }} />
                  <p className="mt-3 text-sm" style={{ color: card.muted }}>Loading activity timeline...</p>
                </div>
              ) : paginatedActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity size={40} style={{ color: card.subtle }} />
                  <p className="mt-3 text-sm" style={{ color: card.muted }}>No activities recorded today</p>
                </div>
              ) : paginatedActivities.map((activity, index) => {
                const Icon = ACTIVITY_ICONS[activity.type];
                const color = ACTIVITY_COLORS[activity.type];
                return (
                  <div key={`${activity.type}-${activity.id}-${activity.timestamp}`} className="flex items-start gap-4 p-4 hover:transition-colors"
                    style={{ 
                      background: index % 2 === 0 ? 'transparent' : (isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.5)'),
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}15` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium" style={{ color: card.text }}>{activity.description}</p>
                          {activity.details && (
                            <p className="text-xs mt-0.5" style={{ color: card.muted }}>{activity.details}</p>
                          )}
                        </div>
                        <span className="text-xs shrink-0" style={{ color: card.subtle }}>
                          {formatActivityTime(activity.timestamp)}
                        </span>
                      </div>
                      {activity.amount && (
                        <p className="text-xs font-medium mt-1" style={{ color: '#10B981' }}>
                          + GH₵ {activity.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: card.divider, background: isDark ? 'rgba(15,23,42,0.2)' : 'rgba(248,250,252,0.5)' }}>
                <button
                  onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                  disabled={activityPage === 1}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: card.primaryBg, color: card.primary }}
                >
                  Previous
                </button>
                <span className="text-xs font-bold" style={{ color: card.muted }}>
                  Page {activityPage} of {totalPages}
                </span>
                <button
                  onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                  disabled={activityPage === totalPages}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: card.primaryBg, color: card.primary }}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Weekly Schedule Preview */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-2" style={{ color: card.text }}>
                <CalendarDays size={16} style={{ color: card.primary }} />
                This Week&apos;s Schedule
              </h3>
              <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: card.primaryBg, color: card.primary }}>
                View Full Roster
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const isWorking = ((staff as any).shiftsThisWeek || 0) > i;
                return (
                  <div key={day} className="text-center">
                    <div className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all
                      ${isWorking ? 'border-current' : ''}`}
                      style={{ 
                        background: isWorking ? card.primaryBg : (isDark ? 'rgba(15,23,42,0.3)' : '#F8FAFC'),
                        borderColor: isWorking ? card.primaryBorder : card.border,
                        color: isWorking ? card.primary : card.muted
                      }}>
                      <span className="text-[10px] uppercase font-medium">{day}</span>
                      {isWorking ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <span className="text-[10px]">Off</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full max-w-md rounded-3xl border shadow-2xl flex flex-col"
              style={{ background: isDark ? '#0D1424' : '#ffffff', borderColor: card.border, maxHeight: 'calc(100vh - 2rem)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0" style={{ borderColor: card.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.primaryBg }}>
                    <Edit2 size={16} style={{ color: card.primary }} />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight" style={{ color: card.text }}>Edit Profile</h2>
                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest" style={{ color: card.text }}>{getFullName(staff)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-red-500/10 text-red-400 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                {/* Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: card.text }}>
                    <UserCheck size={11} /> Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: card.text }}>
                    <Mail size={11} /> Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: card.text }}>
                    <Phone size={11} /> Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                    value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: card.text }}>
                    <Shield size={11} /> Role
                  </label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2"
                    style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: card.text }}>
                    <Briefcase size={11} /> Position / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Pharmacist"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                    value={editForm.position}
                    onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5" style={{ color: card.text }}>
                    <Building size={11} /> Branch
                  </label>
                  {branches.length > 0 ? (
                    <select
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2"
                      style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                      value={editForm.branchId}
                      onChange={e => setEditForm(f => ({ ...f, branchId: e.target.value }))}
                    >
                      <option value="">Select branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={loadingBranches ? 'Loading branches...' : 'Branch UUID'}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 font-mono"
                      style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', border: `1.5px solid ${card.border}`, color: card.text }}
                      value={editForm.branchId}
                      onChange={e => setEditForm(f => ({ ...f, branchId: e.target.value }))}
                    />
                  )}
                  <p className="text-[10px] mt-1.5" style={{ color: card.muted }}>
                    {loadingBranches ? 'Loading branch list...' : editForm.branchId ? `Selected branch ID: ${editForm.branchId}` : 'Select a branch name to set branch ID.'}
                  </p>
                </div>

                {/* Active Status */}
                <div
                  className="flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all"
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', border: `1.5px solid ${card.border}` }}
                  onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: card.text }}>Account Active</p>
                    <p className="text-xs opacity-50" style={{ color: card.text }}>Toggle to deactivate or reactivate this staff account</p>
                  </div>
                  {editForm.isActive
                    ? <ToggleRight size={28} className="text-emerald-500 shrink-0" />
                    : <ToggleLeft size={28} className="shrink-0" style={{ color: card.muted }} />
                  }
                </div>

                {/* Info note */}
                <div className="px-4 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2" style={{ background: card.primaryBg, color: card.primary }}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Updates to Name and Email will also modify the user's authentication profile.</span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 pt-3 border-t flex gap-3 shrink-0" style={{ borderColor: card.border }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:opacity-70"
                  style={{ color: card.muted, border: `1.5px solid ${card.border}` }}
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await updateStaffProfile({
                        userId: staffId,
                        name: editForm.name || undefined,
                        email: editForm.email || undefined,
                        phone: editForm.phone || undefined,
                        role: editForm.role || undefined,
                        position: editForm.position || undefined,
                        branchId: editForm.branchId || undefined,
                        isActive: editForm.isActive,
                      });
                      addToast({ type: 'success', title: 'Profile Updated', message: `${getFullName(staff)} profile has been saved.`, duration: 5000 });
                      setShowEditModal(false);
                    } catch (err: any) {
                      addToast({ type: 'error', title: 'Update Failed', message: err.message || 'Could not save changes.', duration: 6000 });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                  style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full max-w-md rounded-3xl border shadow-2xl flex flex-col"
              style={{ background: isDark ? '#0D1424' : '#ffffff', borderColor: card.border }}
            >
              <div className="flex-1 px-6 py-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-5">
                  <Trash2 size={28} />
                </div>
                <h2 className="text-xl font-black tracking-tight mb-2" style={{ color: card.text }}>
                  Delete Staff Member
                </h2>
                <p className="text-sm leading-relaxed mb-1" style={{ color: card.muted }}>
                  Are you sure you want to delete <strong style={{ color: card.text }}>{getFullName(staff)}</strong>? This action will:
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
              <div className="px-6 py-5 border-t flex gap-3 shrink-0" style={{ borderColor: card.border }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:opacity-90"
                  style={{ color: card.muted, border: `1.5px solid ${card.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStaff}
                  disabled={isDeleting}
                  className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 bg-red-500 text-white"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {isDeleting ? 'Deleting…' : 'Delete Staff'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
