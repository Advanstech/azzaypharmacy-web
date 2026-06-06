'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Shield, Key, Eye, Lock, UserCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const AUDIT_LOGS = [
  { id: '1', user: 'root@azzaypharmacy.com', action: 'LOGIN', entity: 'Auth', timestamp: '2026-05-02 20:15:32', ip: '192.168.0.10', status: 'success' },
  { id: '2', user: 'root@azzaypharmacy.com', action: 'CREATE', entity: 'Product', timestamp: '2026-05-02 19:44:11', ip: '192.168.0.10', status: 'success' },
  { id: '3', user: 'staff@azzay.app', action: 'SALE', entity: 'Sale', timestamp: '2026-05-02 18:30:05', ip: '192.168.0.12', status: 'success' },
  { id: '4', user: 'unknown@test.com', action: 'LOGIN', entity: 'Auth', timestamp: '2026-05-02 17:12:44', ip: '41.66.100.22', status: 'failed' },
  { id: '5', user: 'staff@azzay.app', action: 'UPDATE', entity: 'StockItem', timestamp: '2026-05-02 16:05:18', ip: '192.168.0.12', status: 'success' },
];

export default function SecurityPage() {
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

  const securityItems = [
    { label: 'Auth Provider', value: 'Supabase Auth', status: 'active', icon: Shield, color: '#10B981' },
    { label: 'JWT Verification', value: 'RS256 — Active', status: 'active', icon: Key, color: '#0EA5E9' },
    { label: 'Row Level Security', value: 'Enabled on all tables', status: 'active', icon: Lock, color: '#8B5CF6' },
    { label: 'Failed Logins (24h)', value: '1 attempt', status: 'warning', icon: AlertTriangle, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Security</h1>
        <p className="text-sm" style={{ color: card.muted }}>Audit logs, access control, and security monitoring.</p>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border p-5 backdrop-blur-xl"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl" style={{ background: `${item.color}18`, color: item.color }}>
                  <Icon size={20} />
                </div>
                {item.status === 'active'
                  ? <CheckCircle size={16} style={{ color: '#10B981' }} />
                  : <AlertTriangle size={16} style={{ color: '#F59E0B' }} />}
              </div>
              <p className="font-display text-xs font-bold mb-1" style={{ color: card.muted }}>{item.label}</p>
              <p className="text-sm font-medium" style={{ color: card.text }}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* API Keys */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
              <Key size={18} />
            </div>
            <h2 className="font-display text-base font-bold" style={{ color: card.text }}>API Keys</h2>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {[
            { name: 'Supabase Anon Key', key: 'sb_publishable_gYGLJt...', scope: 'Public', active: true },
            { name: 'Gemini API Key', key: 'AIzaSyDjBz14Vi...', scope: 'Server-only', active: true },
          ].map(k => (
            <div key={k.name} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,250,252,0.8)', border: `1px solid ${card.border}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: card.text }}>{k.name}</p>
                <p className="font-mono text-xs" style={{ color: card.subtle }}>{k.key}</p>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg"
                style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBorder}` }}>
                {k.scope}
              </span>
              <button className="p-2 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
                <Eye size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="p-5 border-b"
          style={{ borderColor: card.border, background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)' }}>
          <h2 className="font-display text-base font-bold" style={{ color: card.text }}>Audit Log</h2>
          <p className="text-xs mt-0.5" style={{ color: card.subtle }}>Recent system access and actions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${card.divider}`, background: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(248,250,252,0.6)' }}>
                {['Timestamp', 'User', 'Action', 'Entity', 'IP Address', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: card.subtle }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOGS.map((log, i) => (
                <tr key={log.id}
                  style={{ borderBottom: i < AUDIT_LOGS.length - 1 ? `1px solid ${card.divider}` : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(0,217,255,0.03)' : 'rgba(14,165,233,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-5 py-3.5 font-mono text-xs" style={{ color: card.subtle }}>{log.timestamp}</td>
                  <td className="px-5 py-3.5 text-xs font-medium" style={{ color: card.text }}>{log.user}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-[11px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: card.primaryBg, color: card.primary }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: card.muted }}>{log.entity}</td>
                  <td className="px-5 py-3.5 font-mono text-xs" style={{ color: card.subtle }}>{log.ip}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold"
                      style={{ color: log.status === 'success' ? '#10B981' : '#EF4444' }}>
                      {log.status === 'success'
                        ? <CheckCircle size={13} />
                        : <AlertTriangle size={13} />}
                      {log.status}
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
