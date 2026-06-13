'use client';

import { useAuth } from '@/lib/auth-context';
import { StoreProvider, useStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { PageTransition } from '@/components/page-transition';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  Sparkles,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Activity,
  Shield,
  Database,
  FileText,
  Pill,
  Building2,
  CreditCard,
  Truck,
  RefreshCw,
  User as UserIcon,
  Clock,
  Menu,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, color: '#00D9FF' },
  { label: 'Sales', href: '/dashboard/sales', icon: FileText, color: '#3B82F6' },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Package, color: '#F59E0B' },
  { label: 'Suppliers', href: '/dashboard/suppliers', icon: Truck, color: '#F97316' },
  { label: 'Market Intelligence', href: '/dashboard/market-intelligence', icon: TrendingUp, color: '#8B5CF6' },
  { label: 'Expenses', href: '/dashboard/expenses', icon: CreditCard, color: '#EF4444' },
  { label: 'Refunds', href: '/dashboard/refund', icon: RefreshCw, color: '#F59E0B' },
  { label: 'End of Day', href: '/dashboard/end-of-day', icon: Clock, color: '#10B981' },
  { label: 'AI Assistant', href: '/dashboard/ai', icon: Sparkles, color: '#EC4899' },
];



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    if (!loading && !user) {
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
              borderRightColor: mounted && theme === 'dark' ? '#00D9FF' : '#0EA5E9',
              borderBottomColor: mounted && theme === 'dark' ? '#00D9FF' : '#0EA5E9',
              borderLeftColor: mounted && theme === 'dark' ? '#00D9FF' : '#0EA5E9',
            }}
          />
          <span
            className="font-ui text-sm font-medium"
            style={{ color: mounted && theme === 'dark' ? '#94A3B8' : '#64748B' }}
          >
            Loading NEXUS...
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const role = user.user_metadata?.role as string;

  // Role Categories
  const isSuperAdmin = role === 'SE_ADMIN' || user.email === 'root@azzaypharmacy.com';
  const isManagement = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role);
  const isClinical = ['PHARMACIST', 'TECHNICIAN'].includes(role) || isManagement;
  const isSales = ['CASHIER', 'CHEMICAL_CASHIER'].includes(role) || isClinical;

  const filteredNavItems = navItems.filter(item => {
    if (isSuperAdmin) return true;
    if (isManagement) return true;
    
    // Clinical roles (PHARMACIST, TECHNICIAN) - view only access
    if (isClinical) {
      const allowedForClinical = [
        'Overview',
        'Sales',
        'Inventory',
        'Suppliers',
        'Expenses',
        'Refunds',
        'End of Day',
      ];
      return allowedForClinical.includes(item.label);
    }
    
    // Sales-only roles (CASHIER, CHEMICAL_CASHIER)
    const allowedForSales = [
      'Overview',
      'Sales',
      'Expenses',
      'Refunds',
      'End of Day',
    ];
    return allowedForSales.includes(item.label);
  });



  const canSeeAdmin = isManagement || isSuperAdmin;

  return (
    <div
      className="w-full h-screen flex overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0A0E1A 0%, #1A1F35 50%, #0A0E1A 100%)'
          : 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #F0F9FF 100%)',
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
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(14, 165, 233, 0.15)',
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
                    ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  border: `1px solid ${isDark ? 'rgba(0, 217, 255, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`,
                }}
              >
                <img src="/azzay-logo.png" alt="Azzay" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2
                  className="font-display text-sm font-bold leading-tight"
                  style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                >
                  Azzay NEXUS
                </h2>
                <span
                  className="font-data text-[9px] tracking-wider uppercase"
                  style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}
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
              background: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(14, 165, 233, 0.1)',
              color: isDark ? '#00D9FF' : '#0EA5E9',
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Prominent POS Terminal Button Wrapper to stick */}
          <div className="sticky top-0 z-20 pb-2 pt-1 -mt-1 backdrop-blur-xl" style={{ margin: '-12px -12px 0 -12px', padding: '12px 12px 8px 12px', background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)' }}>
            <Link
              href="/dashboard/pos"
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-ui font-bold text-base transition-all group ${
                collapsed ? 'justify-center px-2' : ''
              }`}
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                color: isDark ? '#34D399' : '#059669',
                border: `1.5px solid ${isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
                boxShadow: isDark
                  ? '0 4px 20px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : '0 4px 20px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <ShoppingCart
                size={collapsed ? 22 : 20}
                strokeWidth={2.5}
                style={{
                  filter: isDark
                    ? 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.5))'
                    : 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))',
                }}
              />
              {!collapsed && <span>POS Terminal</span>}
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
                Core Modules
              </p>
            </div>
          )}
          {filteredNavItems.map((item) => {
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
                      ? 'rgba(0, 217, 255, 0.1)'
                      : 'rgba(14, 165, 233, 0.1)'
                    : 'transparent',
                  color: isActive
                    ? isDark
                      ? '#00D9FF'
                      : '#0EA5E9'
                    : isDark
                    ? '#94A3B8'
                    : '#64748B',
                  border: isActive
                    ? `1px solid ${isDark ? 'rgba(0, 217, 255, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`
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

          {/* Admin Section Link */}
          {canSeeAdmin && (
            <div className={`mt-4 transition-all duration-300`}>
              <div 
                className={`sticky z-10 backdrop-blur-xl transition-all ${!collapsed ? 'top-[84px] mb-2' : ''}`}
                style={{ 
                  margin: !collapsed ? '0' : '0 -4px',
                  padding: !collapsed ? '4px 0' : '0',
                }}
              >
                {!collapsed ? (
                  <p
                    className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em]"
                    style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                  >
                    Administration
                  </p>
                ) : (
                  <div
                    className="h-px mx-3 my-2"
                    style={{ background: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.3)' }}
                  />
                )}
              </div>
              
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-ui font-bold text-base transition-all group ${
                  collapsed ? 'justify-center px-2' : ''
                }`}
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.3) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)',
                  color: isDark ? '#F87171' : '#DC2626',
                  border: `1.5px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.5)'}`,
                  boxShadow: isDark
                    ? '0 4px 20px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : '0 4px 20px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                <Shield
                  size={collapsed ? 22 : 20}
                  strokeWidth={2.5}
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 8px rgba(248, 113, 113, 0.5))'
                      : 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.4))',
                  }}
                />
                {!collapsed && (
                  <span>
                    Admin Dashboard
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* Settings */}
          {!collapsed && (
            <div className="pt-4">
              <p
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: isDark ? '#64748B' : '#94A3B8' }}
              >
                System
              </p>
            </div>
          )}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-ui text-sm transition-all"
            style={{
              background: pathname === '/dashboard/profile'
                ? isDark
                  ? 'rgba(0, 217, 255, 0.1)'
                  : 'rgba(14, 165, 233, 0.1)'
                : 'transparent',
              color: pathname === '/dashboard/profile'
                ? isDark
                  ? '#00D9FF'
                  : '#0EA5E9'
                : isDark
                ? '#94A3B8'
                : '#64748B',
            }}
          >
            <UserIcon size={18} />
            {!collapsed && <span className="font-medium">My Profile</span>}
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-ui text-sm transition-all"
            style={{
              background: pathname === '/dashboard/settings'
                ? isDark
                  ? 'rgba(0, 217, 255, 0.1)'
                  : 'rgba(14, 165, 233, 0.1)'
                : 'transparent',
              color: pathname === '/dashboard/settings'
                ? isDark
                  ? '#00D9FF'
                  : '#0EA5E9'
                : isDark
                ? '#94A3B8'
                : '#64748B',
            }}
          >
            <Settings size={18} />
            {!collapsed && <span className="font-medium">Settings</span>}
          </Link>
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
                      ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: `1px solid ${isDark ? 'rgba(0, 217, 255, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`,
                  }}
                >
                  <span
                    className="font-display text-sm font-bold"
                    style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}
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
                    {(me?.branch?.name || '').toLowerCase().includes('chemical') ? 'Chemical Shop' : 'Main Branch'}
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
            borderColor: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(14, 165, 233, 0.15)',
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

          {/* Left: Title & Branch */}
          <div className="flex flex-col min-w-max">
            <h1
              className="font-display text-lg font-bold leading-tight"
              style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
            >
              {navItems.find((n) => n.href === pathname)?.label ||
                (pathname === '/dashboard/suppliers' ? 'Suppliers' :
                 pathname === '/dashboard/stock-sync' ? 'Stock Sync' : 'Dashboard')}
            </h1>
            <div
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mt-0.5"
              style={{ color: isDark ? '#34D399' : '#059669' }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: isDark ? '#34D399' : '#059669' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: isDark ? '#34D399' : '#059669' }}
                />
              </span>
              Dormaa Central
            </div>
          </div>

          {/* Middle: News Ticker */}
          <div className="flex-1 overflow-hidden h-full hidden md:flex items-center group relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
            <div className="flex w-max animate-marquee">
              {[1, 2].map((trackIdx) => (
                <div key={trackIdx} className="flex items-center gap-12 text-xs font-bold min-w-max px-6" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  <Link href="/dashboard/market-intelligence" className="hover:underline hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <span>🚨</span> WHO issues new guidelines for Malaria treatment protocols
                  </Link>
                  <Link href="/dashboard/market-intelligence" className="hover:underline transition-colors flex items-center gap-2" style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}>
                    <span>📈</span> Ghana FDA approves local manufacturing of generic Amlodipine
                  </Link>
                  <Link href="/dashboard/market-intelligence" className="hover:underline transition-colors flex items-center gap-2" style={{ color: '#F59E0B' }}>
                    <span>⚠️</span> Supply chain disruptions expected for Paracetamol API
                  </Link>
                  <Link href="/dashboard/market-intelligence" className="hover:underline hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <span>ℹ️</span> NHIS announces revised reimbursement rates for first-line antibiotics
                  </Link>
                  <Link href="/dashboard/market-intelligence" className="hover:underline transition-colors flex items-center gap-2" style={{ color: '#EF4444' }}>
                    <span>🚨</span> Spike in Cholera cases reported in coastal regions; stock ORS
                  </Link>
                </div>
              ))}
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
          <StoreProvider token={session?.access_token}>
            <PageTransition>{children}</PageTransition>
          </StoreProvider>
        </div>
      </main>
    </div>
  );
}
