'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Database, Server, HardDrive, RefreshCw, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';

export default function SystemPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

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
  };

  const services = [
    { name: 'API Server', status: 'online', uptime: '99.9%', latency: '12ms', icon: Server, color: '#10B981' },
    { name: 'Database (Supabase)', status: 'online', uptime: '99.8%', latency: '8ms', icon: Database, color: '#0EA5E9' },
    { name: 'Gemini AI', status: 'online', uptime: '99.5%', latency: '340ms', icon: Zap, color: '#EC4899' },
    { name: 'Storage (Supabase)', status: 'online', uptime: '100%', latency: '5ms', icon: HardDrive, color: '#8B5CF6' },
  ];

  const dbTables = [
    { name: 'Product', rows: 26, size: '24 kB' },
    { name: 'Sale', rows: 22, size: '24 kB' },
    { name: 'StockItem', rows: 13, size: '32 kB' },
    { name: 'User', rows: 13, size: '32 kB' },
    { name: 'Prescription', rows: 18, size: '24 kB' },
    { name: 'Purchase', rows: 13, size: '16 kB' },
    { name: 'AuditLog', rows: 11, size: '16 kB' },
    { name: 'AiInsight', rows: 9, size: '16 kB' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>System</h1>
        <p className="text-sm" style={{ color: card.muted }}>Monitor infrastructure health and database status.</p>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map(svc => {
          const Icon = svc.icon;
          return (
            <div key={svc.name} className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl" style={{ background: `${svc.color}18`, color: svc.color }}>
                  <Icon size={20} />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </div>
              </div>
              <p className="font-display text-sm font-bold mb-1" style={{ color: card.text }}>{svc.name}</p>
              <div className="flex gap-3 text-[11px]" style={{ color: card.subtle }}>
                <span>↑ {svc.uptime}</span>
                <span>⚡ {svc.latency}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Database Tables */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
              <Database size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold" style={{ color: card.text }}>Database Tables</h2>
              <p className="text-xs" style={{ color: card.subtle }}>Supabase PostgreSQL — AzzayPharma</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${card.divider}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                {['Table Name', 'Columns', 'Rows (Est.)', 'Size', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: card.subtle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dbTables.map((t, i) => (
                <tr key={t.name}
                  style={{ borderBottom: i < dbTables.length - 1 ? `1px solid ${card.divider}` : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(0,217,255,0.03)' : 'rgba(14,165,233,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-5 py-3.5 font-mono text-sm font-bold" style={{ color: card.primary }}>{t.name}</td>
                  <td className="px-5 py-3.5 font-mono text-sm" style={{ color: card.muted }}>—</td>
                  <td className="px-5 py-3.5 font-mono text-sm" style={{ color: card.text }}>{t.rows}</td>
                  <td className="px-5 py-3.5 font-mono text-sm" style={{ color: card.muted }}>{t.size}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold"
                      style={{ color: '#10B981' }}>
                      <CheckCircle size={13} />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
