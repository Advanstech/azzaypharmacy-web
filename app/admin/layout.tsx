'use client';

import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { PageTransition } from '@/components/page-transition';
import {
  LayoutDashboard,
  Shield,
  Activity,
  CreditCard,
  FileText,
  Users,
  Contact,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  ArrowLeft,
  ArrowRightLeft,
  Truck,
  Settings as SettingsIcon,
  ShieldCheck,
  Bell,
  Menu,
  Tags
} from 'lucide-react';

const adminItems = [
  { label: 'Admin Hub', href: '/admin', icon: LayoutDashboard, color: '#00D9FF' },
  { label: 'Staff Intelligence', href: '/admin/staff', icon: Users, color: '#6366F1' },
  { label: 'Customer Relations', href: '/admin/customers', icon: Contact, color: '#14B8A6' },
  { label: 'Authorizations', href: '/admin/authorizations', icon: ShieldCheck, color: '#10B981' },
  { label: 'Stock Transfers', href: '/admin/transfers', icon: ArrowRightLeft, color: '#EC4899' },
  { label: 'Price Control', href: '/admin/price-control', icon: Tags, color: '#F97316' },
  { label: 'Supplier Invoices', href: '/admin/invoices', icon: Truck, color: '#F59E0B' },
  { label: 'Financials', href: '/admin/financials', icon: CreditCard, color: '#A855F7' },
  { label: 'Reports', href: '/admin/reports', icon: FileText, color: '#3B82F6' },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell, color: '#0EA5E9' },
  { label: 'System Settings', href: '/admin/settings', icon: SettingsIcon, color: '#94A3B8' },
  { label: 'Super Terminal', href: '/admin/terminal', icon: Activity, color: '#00D9FF' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, session, loading, signOut } = useAuth();
  const { me } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log(`[ADMIN] auth check: loading=${loading} user=${user?.email ?? 'null'}`);
    if (!loading && !user) {
      console.warn('[ADMIN] No user after auth resolved — redirecting to login');
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !mounted) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center transition-colors duration-500"
        style={{
          background: mounted && theme === 'dark'
            ? 'linear-gradient(135deg, #0A0E1A 0%, #1A1F35 100%)'
            : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-full border-4 animate-spin"
            style={{
              borderTopColor: 'transparent',
              borderRightColor: mounted && theme === 'dark' ? '#EF4444' : '#EF4444',
              borderBottomColor: mounted && theme === 'dark' ? '#EF4444' : '#EF4444',
              borderLeftColor: mounted && theme === 'dark' ? '#EF4444' : '#EF4444',
            }}
          />
          <span
            className="font-ui text-sm font-medium"
            style={{ color: mounted && theme === 'dark' ? '#94A3B8' : '#64748B' }}
          >
            Loading Admin Area...
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  // Prioritize API role (me.role) over Supabase metadata role
  const role = (me?.role || (user.user_metadata?.role as string)) ?? '';

  // Role Categories
  const isSuperAdmin = role === 'SE_ADMIN' || user.email === 'root@azzaypharmacy.com';
  const isManagement = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role);

  if (!isManagement && !isSuperAdmin) {
    router.push('/dashboard');
    return null;
  }

  const filteredAdminItems = adminItems.filter(item => {
    if (isSuperAdmin) return true;
    if (item.label === 'Super Terminal') return false; // Only root sees terminal
    return isManagement;
  });

  return (
    <div
      className="w-full h-screen flex overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0A0E1A 0%, #1A1F35 50%, #0A0E1A 100%)'
          : 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 50%, #FFF1F2 100%)',
      }}
    >
      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <aside
        className={`fixed md:relative z-50 h-full flex flex-col border-r backdrop-blur-xl transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          width: collapsed ? '80px' : '280px',
          background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
        }}
      >
        {/* Logo & Collapse Button */}
        <div
          className="flex items-center justify-between px-5 h-16 shrink-0 border-b"
          style={{ borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)' }}
        >
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2
                  className="font-display text-sm font-bold leading-tight"
                  style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                >
                  Admin Portal
                </h2>
                <span
                  className="font-data text-[9px] tracking-wider uppercase"
                  style={{ color: isDark ? '#EF4444' : '#EF4444' }}
                >
                  v2.0
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{
              background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isDark ? '#EF4444' : '#EF4444',
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Prominent Back to Nexus Button Wrapper to stick */}
          <div className="sticky top-0 z-20 pb-2 pt-1 -mt-1 backdrop-blur-xl" style={{ margin: '-12px -12px 0 -12px', padding: '12px 12px 8px 12px', background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)' }}>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-ui font-bold text-base transition-all group ${
                collapsed ? 'justify-center px-2' : ''
              }`}
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(56, 189, 248, 0.3) 100%)'
                  : 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(56, 189, 248, 0.25) 100%)',
                color: isDark ? '#38BDF8' : '#0284C7',
                border: `1.5px solid ${isDark ? 'rgba(14, 165, 233, 0.4)' : 'rgba(14, 165, 233, 0.5)'}`,
              }}
            >
              <ArrowLeft
                size={collapsed ? 22 : 20}
                strokeWidth={2.5}
              />
              {!collapsed && <span>Back to Nexus</span>}
            </Link>

            {/* Divider */}
            <div className="h-px mt-4 mb-1" style={{ background: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.4)' }} />
          </div>

          {/* Main Navigation */}
          {!collapsed && (
            <div className="sticky top-[84px] z-10 backdrop-blur-xl pt-2 pb-1 -mx-3 px-6 mb-1"
                 style={{ background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)' }}>
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: isDark ? '#64748B' : '#94A3B8' }}
              >
                Administration
              </p>
            </div>
          )}
          {filteredAdminItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-ui text-sm transition-all group"
                style={{
                  background: isActive
                    ? isDark
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(239, 68, 68, 0.1)'
                    : 'transparent',
                  color: isActive
                    ? '#EF4444'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                  border: isActive
                    ? `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    : '1px solid transparent',
                }}
              >
                <Icon
                  size={18}
                  style={{
                    color: isActive ? item.color : undefined,
                    filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : undefined,
                  }}
                />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div
          className="p-4 border-t"
          style={{ borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)' }}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  <span
                    className="font-display text-sm font-bold"
                    style={{ color: isDark ? '#EF4444' : '#EF4444' }}
                  >
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-ui text-xs font-medium truncate"
                    style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                  >
                    {user.email}
                  </p>
                  <p
                    className="font-data text-[10px] uppercase"
                    style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                  >
                    {me?.branch?.name ?? me?.branchId ?? 'Branch'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                    color: isDark ? '#00D9FF' : '#0EA5E9',
                  }}
                >
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
                  Theme
                </button>
                <button
                  onClick={signOut}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                  }}
                >
                  <LogOut size={14} />
                  Exit
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                  color: isDark ? '#00D9FF' : '#0EA5E9',
                }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={signOut}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header
          className="h-16 shrink-0 border-b backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3 md:gap-6"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
          }}
        >
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg"
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
          >
            <Menu size={24} />
          </button>

          {/* Left: Title */}
          <div className="flex flex-col min-w-max">
            <h1
              className="font-display text-lg font-bold leading-tight"
              style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
            >
              {filteredAdminItems.find((n) => n.href === pathname)?.label || 'Administration'}
            </h1>
            <div
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mt-0.5"
              style={{ color: '#EF4444' }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-400"
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                />
              </span>
              Admin Mode
            </div>
          </div>

          {/* Right: Date */}
          <div className="flex items-center min-w-max">
            <span
              className="font-data text-xs"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
