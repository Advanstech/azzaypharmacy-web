'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { PharmaChart, MolecularBg, AnimatedCounter } from '@/components/pharma-chart';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  AlertTriangle, Sparkles, Plus, BarChart3, Users,
  Pill, Activity, DollarSign, Clock, Receipt,
  CreditCard, Smartphone, Banknote, ChevronRight,
  UserCheck, FlaskConical, HeartPulse, ShieldAlert,
  Zap, Target, Calendar, Store, Award, RefreshCw
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AZZAY PHARMA NEXUS — ROLE-AWARE OVERVIEW
   Management: Executive KPIs + God's Eye analytics
   Clinical:   Prescription queue + dispensing focus
   Sales:      Shift stats + quick POS + transaction feed
   ═══════════════════════════════════════════════════════════════ */

// ─── Role Detection ────────────────────────────────────────────
function useRole() {
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as string) || '';
  const isSuperAdmin = role === 'SE_ADMIN' || user?.email === 'root@azzaypharmacy.com';
  const isManagement = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role) || isSuperAdmin;
  const isClinical = ['PHARMACIST', 'TECHNICIAN'].includes(role) || isManagement;
  const isSales = ['CASHIER', 'CHEMICAL_CASHIER'].includes(role) || isClinical;
  return { role, isSuperAdmin, isManagement, isClinical, isSales };
}

// ─── Shared Card Styles ─────────────────────────────────────────
function useCardStyles(isDark: boolean) {
  return useMemo(() => ({
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.85)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    textMain: isDark ? '#F8FAFC' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textDim: isDark ? '#64748B' : '#94A3B8',
    accent: isDark ? '#00D9FF' : '#0EA5E9',
    success: isDark ? '#34D399' : '#059669',
    danger: '#EF4444',
    warning: '#F59E0B',
  }), [isDark]);
}

// ═══════════════════════════════════════════════════════════════
//  MANAGEMENT VIEW — God's Eye Executive Overview
// ═══════════════════════════════════════════════════════════════
function ManagementOverview({ s, isDark }: { s: ReturnType<typeof useCardStyles>; isDark: boolean }) {
  const { products, sales, staff, customers, todayRevenue, todayTransactions, lowStockProducts, loadingProducts, loadingSales } = useStore();

  // Compute derived analytics
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekRevenue = sales.filter(s => new Date(s.createdAt) >= weekAgo).reduce((sum, s) => sum + s.totalAmount, 0);
  const weekTxns = sales.filter(s => new Date(s.createdAt) >= weekAgo).length;
  const avgTicket = todayTransactions > 0 ? todayRevenue / todayTransactions : 0;
  const outOfStock = lowStockProducts.filter(p => p.stockQuantity === 0).length;
  const lowStock = lowStockProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
  const staffOnDuty = staff.filter(s => s.isOnDuty).length;
  const totalStaff = staff.length;

  // Revenue by day for sparkline (last 7 days)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayMap: Record<string, number> = {};
  sales.filter(s => new Date(s.createdAt) >= weekAgo).forEach(s => {
    const d = new Date(s.createdAt).toLocaleDateString('en-GB', { weekday: 'short' });
    dayMap[d] = (dayMap[d] || 0) + s.totalAmount;
  });
  const sparkData = days.map(d => ({ day: d, amount: dayMap[d] || 0 }));

  // Top products by revenue — scoped to last 7 days
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; qty: number }> = {};
    sales.filter(s => new Date(s.createdAt) >= weekAgo).forEach(s => s.items.forEach(item => {
      const n = item.product?.name || 'Unknown';
      if (!map[n]) map[n] = { name: n, revenue: 0, qty: 0 };
      map[n].revenue += item.total;
      map[n].qty += item.quantity;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales, weekAgo]);

  // Payment method breakdown by revenue (all-time)
  const paymentMix = useMemo(() => {
    const amounts: Record<'CASH' | 'MOMO' | 'CARD' | 'NHIS', number> = {
      CASH: 0,
      MOMO: 0,
      CARD: 0,
      NHIS: 0,
    };

    sales.forEach((s) => {
      const method = (s.paymentMethod || '').toUpperCase().replace(/\s+/g, '_');
      if (method === 'MOMO' || method === 'MOBILE_MONEY') {
        amounts.MOMO += s.totalAmount;
      } else if (method === 'CASH' || method === 'CARD' || method === 'NHIS') {
        amounts[method] += s.totalAmount;
      }
    });

    const total = (amounts.CASH + amounts.MOMO + amounts.CARD + amounts.NHIS) || 1;
    return [
      { label: 'Cash', pct: Math.round(((amounts['CASH'] || 0) / total) * 100), color: '#0EA5E9', icon: Banknote },
      { label: 'MoMo', pct: Math.round(((amounts['MOMO'] || 0) / total) * 100), color: '#10B981', icon: Smartphone },
      { label: 'Card', pct: Math.round(((amounts['CARD'] || 0) / total) * 100), color: '#8B5CF6', icon: CreditCard },
      { label: 'NHIS', pct: Math.round(((amounts['NHIS'] || 0) / total) * 100), color: '#F59E0B', icon: ShieldAlert },
    ].filter(pm => pm.pct > 0);
  }, [sales]);

  // Sales by staff for manager overview
  const staffSales = useMemo(() => {
    const today = new Date().toDateString();
    const map: Record<string, { name: string; revenue: number; count: number }> = {};
    sales.filter(s => new Date(s.createdAt).toDateString() === today).forEach(s => {
      const name = s.user?.name || 'Unknown Staff';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += s.totalAmount;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── WELCOME + ROLE BADGE ─────────────────────────────── */}
      <div className="sticky -top-6 z-20 flex items-center justify-between pb-4 pt-4 -mt-6 backdrop-blur-xl"
        style={{ 
          background: isDark ? 'rgba(10, 14, 26, 0.85)' : 'rgba(240, 249, 255, 0.85)',
          borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)'}`,
          marginLeft: '-24px',
          marginRight: '-24px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div>
          <h2 className="font-display text-xl font-bold" style={{ color: s.textMain }}>Executive Command</h2>
          <p className="text-xs mt-1" style={{ color: s.textMuted }}>Real-time pulse of Azzay Pharmacy operations</p>
        </div>
        <span className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm"
          style={{ background: `${s.accent}18`, color: s.accent, border: `1px solid ${s.accent}40` }}>
          Management
        </span>
      </div>

      {/* ── EXECUTIVE KPI ROW ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: loadingSales ? '…' : `GH₵${todayRevenue.toLocaleString('en-GH',{minimumFractionDigits:2})}`, sub: `${todayTransactions} txns · Avg GH₵${avgTicket.toFixed(2)}`, icon: DollarSign, color: s.accent },
          { label: '7-Day Revenue', value: loadingSales ? '…' : `GH₵${weekRevenue.toLocaleString('en-GH',{minimumFractionDigits:2})}`, sub: `${weekTxns} transactions this week`, icon: TrendingUp, color: '#10B981' },
          { label: 'Inventory Health', value: loadingProducts ? '…' : `${outOfStock}`, sub: `${lowStock} low stock · ${products.length} total SKUs`, icon: Package, color: outOfStock > 0 ? '#EF4444' : '#F59E0B' },
          { label: 'Staff on Duty', value: `${staffOnDuty}/${totalStaff}`, sub: `${totalStaff - staffOnDuty} off duty · ${staff.filter(s => !s.isActive).length} inactive`, icon: UserCheck, color: '#6366F1' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.01]"
            style={{ background: isDark ? 'rgba(15,23,42,0.35)' : 'rgba(240,249,255,0.6)', borderColor: s.border, boxShadow: s.shadow }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg" style={{ background: `${kpi.color}18`, color: kpi.color }}>
                <kpi.icon size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.textDim }}>{kpi.label}</span>
            </div>
            <p className="font-display text-2xl font-bold mb-1" style={{ color: s.textMain }}>{kpi.value}</p>
            <p className="text-[11px]" style={{ color: s.textMuted }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID: Sparkline + Top Products + Payments ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Trajectory — Animated Pharmaceutical Chart */}
        <div className="lg:col-span-2 rounded-2xl border p-6 backdrop-blur-xl relative overflow-hidden"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>Revenue Trajectory</h3>
                <p className="text-[11px] mt-0.5" style={{ color: s.textDim }}>Last 7 days · Pharmacokinetic curve</p>
              </div>
              <Link href="/dashboard/analytics" className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:opacity-80"
                style={{ color: s.accent }}>Full Report <ChevronRight size={14} /></Link>
            </div>
            <div className="mb-3">
              <span className="font-display text-2xl font-bold" style={{ color: s.accent }}>
                <AnimatedCounter value={weekRevenue} prefix="GH₵" isDark={isDark} duration={2000} />
              </span>
              <span className="text-[11px] ml-2" style={{ color: s.textMuted }}>this week</span>
            </div>
          </div>
          <PharmaChart data={sparkData} isDark={isDark} accent={s.accent} height={220} />
          <MolecularBg isDark={isDark} />
        </div>

        {/* Payment Mix Ring */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <h3 className="font-display text-sm font-bold mb-1" style={{ color: s.textMain }}>Payment Mix</h3>
          <p className="text-[11px] mb-5" style={{ color: s.textDim }}>All-time method distribution</p>
          <div className="space-y-4">
            {paymentMix.map(pm => (
              <div key={pm.label} className="flex items-center gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${pm.color}18`, color: pm.color }}>
                  <pm.icon size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: s.textMuted }}>{pm.label}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: pm.color }}>{pm.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(203,213,225,0.3)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pm.pct}%`, background: pm.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECOND GRID: Top Products + Alerts + Customers ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Products */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <h3 className="font-display text-sm font-bold mb-4" style={{ color: s.textMain }}>Top Performers</h3>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: s.textMuted }}>No sales data yet</p>
            ) : topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: i === 0 ? `${s.accent}20` : `${s.textDim}15`, color: i === 0 ? s.accent : s.textDim }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: s.textMain }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{p.qty} units sold</p>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: s.accent }}>GH₵{p.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>Stock Alerts</h3>
            {outOfStock > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EF444418', color: '#EF4444' }}>
                {outOfStock} Critical
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="p-2 rounded-lg mb-2" style={{ background: `${s.success}18` }}>
                  <Package size={20} style={{ color: s.success }} />
                </div>
                <p className="text-xs font-medium" style={{ color: s.success }}>All inventory healthy</p>
              </div>
            ) : lowStockProducts.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: p.stockQuantity === 0 ? '#EF444408' : '#F59E0B08', border: `1px solid ${p.stockQuantity === 0 ? '#EF444420' : '#F59E0B20'}` }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.stockQuantity === 0 ? '#EF4444' : '#F59E0B' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: s.textMain }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{p.brand || p.category}</p>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: p.stockQuantity === 0 ? '#EF4444' : '#F59E0B' }}>
                  {p.stockQuantity === 0 ? 'ZERO' : `${p.stockQuantity} left`}
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/inventory" className="flex items-center justify-center gap-1 mt-3 py-2 rounded-xl text-[11px] font-medium transition-colors"
            style={{ background: `${s.accent}10`, color: s.accent }}>
            Manage Inventory <ChevronRight size={14} />
          </Link>
        </div>

        {/* Staff Performance */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>Staff Performance</h3>
            <Users size={16} style={{ color: s.accent }} />
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {staffSales.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: s.textMuted }}>No staff sales recorded today</p>
            ) : staffSales.map((staff, i) => (
              <div key={staff.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: i === 0 ? `${s.success}15` : `${s.textDim}10`, color: i === 0 ? s.success : s.textDim }}>
                  {staff.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: s.textMain }}>{staff.name}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{staff.count} sales today</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold" style={{ color: s.success }}>GH₵{staff.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/staff" className="flex items-center justify-center gap-1 mt-3 py-2 rounded-xl text-[11px] font-medium transition-colors"
            style={{ background: `${s.accent}10`, color: s.accent }}>
            View All Staff <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── RECENT TRANSACTIONS ──────────────────────────────── */}
      <div className="rounded-2xl border p-6 backdrop-blur-xl"
        style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>Recent Transactions</h3>
            <p className="text-[11px]" style={{ color: s.textDim }}>Latest 3 across all staff</p>
          </div>
          <Link href="/dashboard/sales" className="text-[11px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: `${s.accent}18`, color: s.accent }}>View All <ChevronRight size={14} /></Link>
        </div>
        {loadingSales ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderTopColor: 'transparent', borderColor: s.accent }} />
          </div>
        ) : sales.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: s.textMuted }}>No transactions recorded yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3).map(sale => (
              <div key={sale.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:scale-[1.01]"
                style={{ background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(203,213,225,0.2)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.success}15` }}>
                  <Receipt size={18} style={{ color: s.success }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: s.textMain }}>{sale.customerName || 'Walk-in'}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{sale.user?.name || 'Staff'} · {sale.paymentMethod}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold" style={{ color: s.accent }}>GH₵{sale.totalAmount.toFixed(2)}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{new Date(sale.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CLINICAL VIEW — Pharmacist / Technician Overview
// ═══════════════════════════════════════════════════════════════
function ClinicalOverview({ s, isDark }: { s: ReturnType<typeof useCardStyles>; isDark: boolean }) {
  const { products, sales, todayRevenue, todayTransactions, lowStockProducts, loadingProducts, loadingSales, me, updateDutyStatus } = useStore();

  const criticalDrugs = lowStockProducts.filter(p =>
    ['Antimalarial', 'Antibiotic', 'Chronic', 'Pain Relief'].includes(p.category)
  );

  const myTodaySales = sales.filter(s => s.user?.id === me?.id && new Date(s.createdAt).toDateString() === new Date().toDateString());
  const myRevenue = myTodaySales.reduce((sum, s) => sum + s.totalAmount, 0);

  const { isManagement } = useRole();
  const visibleSales = isManagement 
    ? sales 
    : sales.filter(sale => sale.user?.id === me?.id);

  // Hourly Activity for today
  const hourlyData = useMemo(() => {
    const hours = ['8 AM','10 AM','12 PM','2 PM','4 PM','6 PM','8 PM'];
    const data = hours.map(h => ({ day: h, amount: 0 })); // 'day' is used by PharmaChart as label
    myTodaySales.forEach(s => {
      const hour = new Date(s.createdAt).getHours();
      if (hour >= 8 && hour < 10) data[0].amount += s.totalAmount;
      else if (hour >= 10 && hour < 12) data[1].amount += s.totalAmount;
      else if (hour >= 12 && hour < 14) data[2].amount += s.totalAmount;
      else if (hour >= 14 && hour < 16) data[3].amount += s.totalAmount;
      else if (hour >= 16 && hour < 18) data[4].amount += s.totalAmount;
      else if (hour >= 18 && hour < 20) data[5].amount += s.totalAmount;
      else if (hour >= 20) data[6].amount += s.totalAmount;
    });
    return data;
  }, [myTodaySales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── WELCOME ────────────────────────────────────────────── */}
      <div className="sticky -top-6 z-20 flex items-center justify-between pb-4 pt-4 -mt-6 backdrop-blur-xl"
        style={{ 
          background: isDark ? 'rgba(10, 14, 26, 0.85)' : 'rgba(240, 249, 255, 0.85)',
          borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)'}`,
          marginLeft: '-24px',
          marginRight: '-24px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div>
          <h2 className="font-display text-xl font-bold" style={{ color: s.textMain }}>Clinical Station</h2>
          <p className="text-xs mt-1" style={{ color: s.textMuted }}>Dispensing, verification & patient care</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (me?.id) {
              await updateDutyStatus(me.id, !me.isOnDuty);
            }
          }}
          className="text-[10px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 border"
          style={{
            background: me?.isOnDuty ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: me?.isOnDuty ? '#10B981' : '#EF4444',
            borderColor: me?.isOnDuty ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
          }}
        >
          {me?.isOnDuty ? '● On Duty' : '○ Off Duty'}
        </button>
      </div>

      {/* ── PERSONAL STATS + QUICK ACTIONS ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Sales Today', value: loadingSales ? '…' : `GH₵${myRevenue.toFixed(2)}`, sub: `${myTodaySales.length} transactions`, icon: DollarSign, color: s.accent },
          isManagement ? 
            { label: 'Global Revenue', value: loadingSales ? '…' : `GH₵${todayRevenue.toFixed(2)}`, sub: `${todayTransactions} store txns`, icon: Store, color: '#10B981' } :
            { label: 'Avg Ticket', value: loadingSales ? '…' : `GH₵${(myTodaySales.length > 0 ? myRevenue / myTodaySales.length : 0).toFixed(2)}`, sub: 'Your avg sale', icon: Activity, color: '#10B981' },
          { label: 'Critical Stock', value: loadingProducts ? '…' : String(criticalDrugs.length), sub: `${lowStockProducts.length} total alerts`, icon: FlaskConical, color: criticalDrugs.length > 0 ? '#EF4444' : '#F59E0B' },
          { label: 'Products', value: loadingProducts ? '…' : String(products.length), sub: 'SKUs in formulary', icon: Pill, color: '#8B5CF6' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.01]"
            style={{ background: isDark ? 'rgba(15,23,42,0.35)' : 'rgba(240,249,255,0.6)', borderColor: s.border, boxShadow: s.shadow }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg" style={{ background: `${kpi.color}18`, color: kpi.color }}>
                <kpi.icon size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.textDim }}>{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold mb-1" style={{ color: s.textMain }}>{kpi.value}</p>
            <p className="text-[11px]" style={{ color: s.textMuted }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Intelligence / Performance Chart */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl relative overflow-hidden flex flex-col"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="relative z-10 mb-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>My Activity Pulse</h3>
                <p className="text-[11px] mt-0.5" style={{ color: s.textDim }}>Your hourly performance trajectory</p>
              </div>
            </div>
            <div className="mb-2">
              <span className="font-display text-2xl font-bold" style={{ color: s.accent }}>
                <AnimatedCounter value={myRevenue} prefix="GH₵" isDark={isDark} duration={2000} />
              </span>
              <span className="text-[11px] ml-2" style={{ color: s.textMuted }}>cleared today</span>
            </div>
          </div>
          <div className="h-[180px] w-full relative">
            <PharmaChart data={hourlyData} isDark={isDark} accent={s.accent} height={180} />
            <MolecularBg isDark={isDark} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border p-6 backdrop-blur-xl flex-1"
            style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
            <h3 className="font-display text-sm font-bold mb-4" style={{ color: s.textMain }}>Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Prescription', icon: Pill, href: '/dashboard/prescriptions', color: '#06B6D4', desc: 'Dispense Rx' },
                { label: 'Drug Check', icon: Sparkles, href: '/dashboard/ai', color: '#EC4899', desc: 'Interactions' },
                { label: 'POS Terminal', icon: ShoppingCart, href: '/dashboard/pos', color: '#10B981', desc: 'Quick sale' },
                { label: 'Inventory', icon: Package, href: '/dashboard/inventory', color: '#0EA5E9', desc: 'Stock check' },
              ].map(action => (
                <Link key={action.label} href={action.href}
                  className="rounded-xl border p-4 backdrop-blur-xl transition-all hover:scale-[1.02] block"
                  style={{ background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.6)', borderColor: s.border }}>
                  <div className="p-2 rounded-lg mb-2 inline-flex" style={{ background: `${action.color}18`, color: action.color }}>
                    <action.icon size={18} />
                  </div>
                  <p className="font-display text-xs font-bold" style={{ color: s.textMain }}>{action.label}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{action.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Drug Stock */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>Critical Formulary</h3>
            <HeartPulse size={16} style={{ color: '#EF4444' }} />
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {criticalDrugs.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="p-2 rounded-lg mb-2" style={{ background: `${s.success}18` }}>
                  <HeartPulse size={24} style={{ color: s.success }} />
                </div>
                <p className="text-xs font-medium" style={{ color: s.success }}>All critical drugs stocked</p>
              </div>
            ) : criticalDrugs.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: p.stockQuantity === 0 ? '#EF444408' : '#F59E0B08', border: `1px solid ${p.stockQuantity === 0 ? '#EF444420' : '#F59E0B20'}` }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.stockQuantity === 0 ? '#EF4444' : '#F59E0B' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: s.textMain }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: s.textDim }}>{p.strength} · {p.category}</p>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: p.stockQuantity === 0 ? '#EF4444' : '#F59E0B' }}>
                  {p.stockQuantity === 0 ? 'OUT' : `${p.stockQuantity}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RECENT TRANSACTIONS ──────────────────────────────── */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl flex flex-col"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>Recent Transactions</h3>
            <Link href="/dashboard/sales" className="text-[11px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80" 
              style={{ background: `${s.accent}18`, color: s.accent }}>View All <ChevronRight size={14} /></Link>
          </div>
          <div className="flex-1">
            {loadingSales ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderTopColor: 'transparent', borderColor: s.accent }} />
              </div>
            ) : visibleSales.slice(0, 3).length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: s.textMuted }}>No transactions yet today</p>
            ) : (
              <div className="space-y-3">
                {visibleSales.slice(0, 3).map(sale => (
                  <div key={sale.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:scale-[1.01]"
                    style={{ background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(203,213,225,0.2)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.success}15` }}>
                      <Receipt size={18} style={{ color: s.success }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: s.textMain }}>{sale.customerName || 'Walk-in Customer'}</p>
                      <p className="text-[11px] font-medium" style={{ color: s.textDim }}>{sale.items.length} items · {sale.paymentMethod}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold" style={{ color: s.accent }}>GH₵{sale.totalAmount.toFixed(2)}</p>
                      <p className="text-[11px] font-medium" style={{ color: s.textDim }}>{new Date(sale.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SALES VIEW — Cashier / Chemical Cashier Overview
// ═══════════════════════════════════════════════════════════════
function SalesOverview({ s, isDark }: { s: ReturnType<typeof useCardStyles>; isDark: boolean }) {
  const { sales, todayRevenue, todayTransactions, lowStockProducts, loadingSales, me, updateDutyStatus } = useStore();

  const myTodaySales = sales.filter(s => s.user?.id === me?.id && new Date(s.createdAt).toDateString() === new Date().toDateString());
  const myRevenue = myTodaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const myTxns = myTodaySales.length;

  // Hourly Activity for today
  const hourlyData = useMemo(() => {
    const hours = ['8 AM','10 AM','12 PM','2 PM','4 PM','6 PM','8 PM'];
    const data = hours.map(h => ({ day: h, amount: 0 })); // 'day' is used by PharmaChart as label
    myTodaySales.forEach(s => {
      const hour = new Date(s.createdAt).getHours();
      if (hour >= 8 && hour < 10) data[0].amount += s.totalAmount;
      else if (hour >= 10 && hour < 12) data[1].amount += s.totalAmount;
      else if (hour >= 12 && hour < 14) data[2].amount += s.totalAmount;
      else if (hour >= 14 && hour < 16) data[3].amount += s.totalAmount;
      else if (hour >= 16 && hour < 18) data[4].amount += s.totalAmount;
      else if (hour >= 18 && hour < 20) data[5].amount += s.totalAmount;
      else if (hour >= 20) data[6].amount += s.totalAmount;
    });
    return data;
  }, [myTodaySales]);

  // Payment breakdown for today
  const todayPayment = useMemo(() => {
    const counts: Record<string, number> = {};
    myTodaySales.forEach(s => { counts[s.paymentMethod] = (counts[s.paymentMethod] || 0) + s.totalAmount; });
    return [
      { label: 'Cash', amount: counts['CASH'] || 0, color: '#0EA5E9', icon: Banknote },
      { label: 'MoMo', amount: counts['MOMO'] || 0, color: '#10B981', icon: Smartphone },
      { label: 'Card', amount: counts['CARD'] || 0, color: '#8B5CF6', icon: CreditCard },
      { label: 'NHIS', amount: counts['NHIS'] || 0, color: '#F59E0B', icon: ShieldAlert },
    ].filter(p => p.amount > 0);
  }, [myTodaySales]);

  const shiftStart = me?.lastSeen ? new Date(me.lastSeen) : null;
  const shiftDuration = shiftStart ? Math.floor((Date.now() - shiftStart.getTime()) / 60000) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── WELCOME ────────────────────────────────────────────── */}
      <div className="sticky -top-6 z-20 flex items-center justify-between pb-4 pt-4 -mt-6 backdrop-blur-xl"
        style={{ 
          background: isDark ? 'rgba(10, 14, 26, 0.85)' : 'rgba(240, 249, 255, 0.85)',
          borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)'}`,
          marginLeft: '-24px',
          marginRight: '-24px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div>
          <h2 className="font-display text-xl font-bold" style={{ color: s.textMain }}>Sales Terminal</h2>
          <p className="text-xs mt-1" style={{ color: s.textMuted }}>Shift operations & transaction flow</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (me?.id) {
              await updateDutyStatus(me.id, !me.isOnDuty);
            }
          }}
          className="text-[10px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 border"
          style={{
            background: me?.isOnDuty ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: me?.isOnDuty ? '#10B981' : '#EF4444',
            borderColor: me?.isOnDuty ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
          }}
        >
          {me?.isOnDuty ? `● On Shift · ${shiftDuration}m` : '○ Off Shift'}
        </button>
      </div>

      {/* ── BIG POS BUTTON + SHIFT STATS ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Giant POS Launch */}
        <Link href="/dashboard/pos"
          className="md:col-span-1 rounded-2xl border p-6 backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col items-center justify-center text-center gap-3"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.25) 100%)'
              : 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.2) 100%)',
            borderColor: isDark ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.5)',
            boxShadow: isDark ? '0 8px 32px rgba(16,185,129,0.15)' : '0 8px 32px rgba(16,185,129,0.2)',
          }}>
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.2)' }}>
            <Zap size={32} style={{ color: '#34D399', filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.5))' }} />
          </div>
          <div>
            <p className="font-display text-lg font-bold" style={{ color: isDark ? '#34D399' : '#059669' }}>Launch POS</p>
            <p className="text-[11px]" style={{ color: isDark ? 'rgba(52,211,153,0.7)' : 'rgba(5,150,105,0.8)' }}>New sale · Quick checkout</p>
          </div>
        </Link>

        {/* My Shift Stats */}
        {[
          { label: 'My Revenue', value: loadingSales ? '…' : `GH₵${myRevenue.toFixed(2)}`, sub: `${myTxns} sales today`, icon: Target, color: s.accent },
          { 
            label: 'Avg Sale Value', 
            value: loadingSales ? '…' : `GH₵${(myTxns > 0 ? myRevenue / myTxns : 0).toFixed(2)}`, 
            sub: 'Your shift average', 
            icon: Activity, 
            color: '#10B981' 
          },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border p-5 backdrop-blur-xl transition-all hover:scale-[1.01]"
            style={{ background: isDark ? 'rgba(15,23,42,0.35)' : 'rgba(240,249,255,0.6)', borderColor: s.border, boxShadow: s.shadow }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg" style={{ background: `${kpi.color}18`, color: kpi.color }}>
                <kpi.icon size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.textDim }}>{kpi.label}</span>
            </div>
            <p className="font-display text-2xl font-bold mb-1" style={{ color: s.textMain }}>{kpi.value}</p>
            <p className="text-[11px]" style={{ color: s.textMuted }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Intelligence / Performance Chart */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl relative overflow-hidden flex flex-col"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="relative z-10 mb-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>My Activity Pulse</h3>
                <p className="text-[11px] mt-0.5" style={{ color: s.textDim }}>Your hourly performance trajectory</p>
              </div>
            </div>
            <div className="mb-2">
              <span className="font-display text-2xl font-bold" style={{ color: s.accent }}>
                <AnimatedCounter value={myRevenue} prefix="GH₵" isDark={isDark} duration={2000} />
              </span>
              <span className="text-[11px] ml-2" style={{ color: s.textMuted }}>cleared today</span>
            </div>
          </div>
          <div className="h-[180px] w-full relative">
            <PharmaChart data={hourlyData} isDark={isDark} accent={s.accent} height={180} />
            <MolecularBg isDark={isDark} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Today's Payment Breakdown */}
          <div className="rounded-2xl border p-6 backdrop-blur-xl flex-1"
            style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
            <h3 className="font-display text-sm font-bold mb-1" style={{ color: s.textMain }}>Payment Breakdown</h3>
            <p className="text-[11px] mb-5" style={{ color: s.textDim }}>Your shift payment methods</p>
            {todayPayment.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: s.textMuted }}>No sales yet this shift</p>
            ) : (
              <div className="space-y-4">
                {todayPayment.map(pm => (
                  <div key={pm.label} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg shrink-0" style={{ background: `${pm.color}18`, color: pm.color }}>
                      <pm.icon size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: s.textMuted }}>{pm.label}</span>
                        <span className="text-xs font-mono font-bold" style={{ color: pm.color }}>GH₵{pm.amount.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(203,213,225,0.3)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${myRevenue > 0 ? (pm.amount / myRevenue) * 100 : 0}%`, background: pm.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <h3 className="font-display text-sm font-bold mb-4" style={{ color: s.textMain }}>Quick Access</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'End of Day', icon: Calendar, href: '/dashboard/end-of-day', color: '#10B981', desc: 'Close shift' },
              { label: 'Refunds', icon: RefreshCw, href: '/dashboard/refund', color: '#EF4444', desc: 'Process return' },
              { label: 'Inventory', icon: Package, href: '/dashboard/inventory', color: '#0EA5E9', desc: 'Stock check' },
              { label: 'Expenses', icon: CreditCard, href: '/dashboard/expenses', color: '#F59E0B', desc: 'Log expense' },
            ].map(action => (
              <Link key={action.label} href={action.href}
                className="rounded-xl border p-4 backdrop-blur-xl transition-all hover:scale-[1.02] block"
                style={{ background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.6)', borderColor: s.border }}>
                <div className="p-2 rounded-lg mb-2 inline-flex" style={{ background: `${action.color}18`, color: action.color }}>
                  <action.icon size={18} />
                </div>
                <p className="font-display text-xs font-bold" style={{ color: s.textMain }}>{action.label}</p>
                <p className="text-[10px]" style={{ color: s.textDim }}>{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── RECENT TRANSACTIONS ──────────────────────────────── */}
        <div className="rounded-2xl border p-6 backdrop-blur-xl flex flex-col"
          style={{ background: s.bg, borderColor: s.border, boxShadow: s.shadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold" style={{ color: s.textMain }}>My Recent Sales</h3>
            <Link href="/dashboard/sales" className="text-[11px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80" 
              style={{ background: `${s.accent}18`, color: s.accent }}>View All <ChevronRight size={14} /></Link>
          </div>
          <div className="flex-1">
            {loadingSales ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderTopColor: 'transparent', borderColor: s.accent }} />
              </div>
            ) : myTodaySales.slice(0, 3).length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: s.textMuted }}>No sales yet this shift</p>
            ) : (
              <div className="space-y-3">
                {myTodaySales.slice(0, 3).map(sale => (
                  <div key={sale.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:scale-[1.01]"
                    style={{ background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(203,213,225,0.2)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.success}15` }}>
                      <Receipt size={18} style={{ color: s.success }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: s.textMain }}>{sale.customerName || 'Walk-in'}</p>
                      <p className="text-[11px] font-medium" style={{ color: s.textDim }}>{sale.items.length} items · {sale.paymentMethod}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold" style={{ color: s.accent }}>GH₵{sale.totalAmount.toFixed(2)}</p>
                      <p className="text-[11px] font-medium" style={{ color: s.textDim }}>{new Date(sale.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── LOW STOCK WARNING ────────────────────────────────── */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl border p-5 backdrop-blur-xl"
          style={{ background: '#F59E0B08', borderColor: '#F59E0B30', boxShadow: s.shadow }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>{lowStockProducts.length} items running low</p>
              <p className="text-[11px]" style={{ color: s.textDim }}>Inform management to restock soon</p>
            </div>
            <Link href="/dashboard/inventory" className="ml-auto text-[11px] font-medium px-3 py-1.5 rounded-lg"
              style={{ background: '#F59E0B18', color: '#F59E0B' }}>Check</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT — Role Router
// ═══════════════════════════════════════════════════════════════
export default function DashboardOverview() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const { isManagement, isClinical } = useRole();
  const s = useCardStyles(isDark);

  if (!mounted) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderTopColor: 'transparent', borderColor: isDark ? '#00D9FF' : '#0EA5E9' }} />
      </div>
    );
  }

  // Route to the right view
  if (isManagement) return <ManagementOverview s={s} isDark={isDark} />;
  if (isClinical) return <ClinicalOverview s={s} isDark={isDark} />;
  return <SalesOverview s={s} isDark={isDark} />;
}

