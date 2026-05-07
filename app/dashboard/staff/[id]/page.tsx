'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Award, Briefcase, Shield,
  Clock, Activity, TrendingUp, Package, ShoppingCart, DollarSign, UserCheck,
  FileText, BarChart3, Timer, ChevronRight, Edit2, MoreVertical, CheckCircle2,
  AlertCircle, XCircle, ClipboardList, CalendarDays
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
  type: 'sale' | 'login' | 'prescription' | 'inventory' | 'shift';
  description: string;
  timestamp: string;
  amount?: number;
  details?: string;
}

const ACTIVITIES: Record<string, Activity[]> = {
  '6': [ // Adua Azare
    { id: 'a1', type: 'sale', description: 'Sold Amoxicillin 500mg (20 units)', timestamp: '2026-05-03 09:23', amount: 240.00, details: 'Receipt #POS-284756' },
    { id: 'a2', type: 'login', description: 'Logged in to system', timestamp: '2026-05-03 08:15' },
    { id: 'a3', type: 'prescription', description: 'Verified prescription for Diabetes medication', timestamp: '2026-05-03 10:45', details: 'Patient: John Doe' },
    { id: 'a4', type: 'sale', description: 'Sold Coartem Tablets (2 packs)', timestamp: '2026-05-03 11:30', amount: 70.00 },
    { id: 'a5', type: 'shift', description: 'Started morning shift', timestamp: '2026-05-03 08:00' },
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
  prescription: FileText,
  inventory: Package,
  shift: Clock,
};

const ACTIVITY_COLORS = {
  sale: '#10B981',
  login: '#0EA5E9',
  prescription: '#8B5CF6',
  inventory: '#F59E0B',
  shift: '#6366F1',
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getFullName(staff: StaffMember) {
  return `${staff.firstName} ${staff.lastName}`;
}

export default function StaffDetailPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;
  
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const staff = STAFF.find(s => s.id === staffId);
  const activities = ACTIVITIES[staffId] || [];

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
        <Link href="/dashboard/staff" className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: card.primaryBg, color: card.primary }}>
          Back to Staff
        </Link>
      </div>
    );
  }

  const roleStyle = ROLE_COLORS[staff.role] || ROLE_COLORS.CASHIER;
  const statusStyle = STATUS_COLORS[staff.status];
  const todaySales = activities.filter(a => a.type === 'sale').reduce((sum, a) => sum + (a.amount || 0), 0);
  const todayTransactions = activities.filter(a => a.type === 'sale').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link href="/dashboard/staff" className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
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
              {getInitials(staff.firstName, staff.lastName)}
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
                {staff.branch}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                Last active {staff.lastLogin}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t" style={{ borderColor: card.divider }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.primaryBg }}>
                  <DollarSign size={14} style={{ color: card.primary }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Today's Sales</p>
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
                  <p className="font-display font-bold" style={{ color: card.warning }}>{staff.performanceScore}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: card.primary, color: isDark ? '#060B14' : '#fff' }}>
              <Edit2 size={14} />
              Edit Profile
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
              <Mail size={14} />
              Send Message
            </button>
          </div>
        </div>
      </div>

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
                <span className="text-sm" style={{ color: card.text }}>{staff.phone}</span>
              </div>
              {staff.emergencyContact && (
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                  <AlertCircle size={14} style={{ color: '#EF4444' }} />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>Emergency Contact</p>
                    <p className="text-sm" style={{ color: card.text }}>{staff.emergencyContact}</p>
                  </div>
                </div>
              )}
              {staff.address && (
                <div className="flex items-start gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                  <MapPin size={14} style={{ color: card.subtle }} className="mt-0.5" />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>Address</p>
                    <p className="text-sm" style={{ color: card.text }}>{staff.address}</p>
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
              {staff.licenseNumber && (
                <div className="flex items-center gap-3">
                  <Shield size={14} style={{ color: card.subtle }} />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>License Number</p>
                    <p className="text-sm font-medium" style={{ color: card.text }}>{staff.licenseNumber}</p>
                  </div>
                </div>
              )}
              {staff.specialization && (
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                  <Briefcase size={14} style={{ color: card.subtle }} />
                  <div>
                    <p className="text-xs" style={{ color: card.muted }}>Specialization</p>
                    <p className="text-sm font-medium" style={{ color: card.text }}>{staff.specialization}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                <Calendar size={14} style={{ color: card.subtle }} />
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Joined Date</p>
                  <p className="text-sm font-medium" style={{ color: card.text }}>
                    {new Date(staff.joinedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: card.divider }}>
                <Clock size={14} style={{ color: card.subtle }} />
                <div>
                  <p className="text-xs" style={{ color: card.muted }}>Shifts This Week</p>
                  <p className="text-sm font-medium" style={{ color: card.text }}>{staff.shiftsThisWeek} shifts</p>
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
                  <span className="text-xs font-bold" style={{ color: staff.performanceScore >= 90 ? '#10B981' : staff.performanceScore >= 75 ? '#F59E0B' : '#EF4444' }}>
                    {staff.performanceScore}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#E2E8F0' }}>
                  <div className="h-full rounded-full transition-all" 
                    style={{ 
                      width: `${staff.performanceScore}%`, 
                      background: staff.performanceScore >= 90 ? '#10B981' : staff.performanceScore >= 75 ? '#F59E0B' : '#EF4444'
                    }} />
                </div>
              </div>
              <div className="pt-3 border-t" style={{ borderColor: card.divider }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: card.muted }}>Total Sales (All Time)</span>
                  <span className="text-sm font-bold" style={{ color: card.text }}>GH₵ {(staff.totalSales / 1000).toFixed(1)}k</span>
                </div>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: card.divider }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: card.muted }}>Average per Shift</span>
                  <span className="text-sm font-bold" style={{ color: card.text }}>
                    GH₵ {staff.shiftsThisWeek > 0 ? (staff.totalSales / staff.shiftsThisWeek / 4).toFixed(0) : 0}
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
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity size={40} style={{ color: card.subtle }} />
                  <p className="mt-3 text-sm" style={{ color: card.muted }}>No activities recorded today</p>
                </div>
              ) : activities.map((activity, index) => {
                const Icon = ACTIVITY_ICONS[activity.type];
                const color = ACTIVITY_COLORS[activity.type];
                return (
                  <div key={activity.id} className="flex items-start gap-4 p-4 hover:transition-colors"
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
                          {activity.timestamp.split(' ')[1]}
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
          </div>

          {/* Weekly Schedule Preview */}
          <div className="rounded-2xl border p-5 backdrop-blur-xl" style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-2" style={{ color: card.text }}>
                <CalendarDays size={16} style={{ color: card.primary }} />
                This Week's Schedule
              </h3>
              <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: card.primaryBg, color: card.primary }}>
                View Full Roster
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const isWorking = staff.shiftsThisWeek > i;
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
    </div>
  );
}
