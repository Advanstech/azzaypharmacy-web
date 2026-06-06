'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { gql, Q_NOTIFICATION_LOGS, Q_NOTIFICATION_STATS } from '@/lib/gql';
import {
  Bell, Mail, MessageSquare, CheckCircle, XCircle, AlertCircle,
  Clock, Filter, ChevronLeft, ChevronRight, Loader2, BarChart3,
  TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';

interface NotificationLog {
  id: string;
  userId?: string;
  type: string;
  channel: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  content?: string;
  status: string;
  emailStatus?: string;
  smsStatus?: string;
  smsProvider?: string;
  errorMessage?: string;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  emailSent: number;
  smsSent: number;
  failed: number;
  byType: { type: string; count: number }[];
}

export default function NotificationsPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const itemsPerPage = 15;

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await gql<{ notificationLogs: NotificationLog[] }>(Q_NOTIFICATION_LOGS, {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        type: filterType || undefined,
        status: filterStatus || undefined,
      });
      setLogs(data.notificationLogs || []);
    } catch (e) {
      console.error('Failed to fetch notification logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await gql<{ notificationStats: NotificationStats }>(Q_NOTIFICATION_STATS, { days: 7 });
      setStats(data.notificationStats || null);
    } catch (e) {
      console.error('Failed to fetch notification stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchLogs();
      fetchStats();
    }
  }, [mounted, currentPage, filterType, filterStatus]);

  const totalPages = useMemo(() => {
    return stats ? Math.ceil(stats.total / itemsPerPage) : 1;
  }, [stats]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#10B981';
      case 'FAILED': return '#EF4444';
      case 'SENT': return '#10B981';
      default: return card.muted;
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'STAFF_INVITE': return <Mail size={14} />;
      case 'WELCOME': return <CheckCircle size={14} />;
      case 'TEMP_PASSWORD': return <Bell size={14} />;
      case 'SALE_RECEIPT': return <BarChart3 size={14} />;
      case 'REFUND_PROCESSED': return <TrendingDown size={14} />;
      case 'PASSWORD_RESET': return <AlertCircle size={14} />;
      case 'PASSWORD_CHANGED': return <CheckCircle size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!mounted) return null;

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Notifications</h1>
          <p className="text-sm" style={{ color: card.muted }}>Email & SMS delivery logs and system-wide notification history.</p>
        </div>
        <button
          onClick={() => { fetchLogs(); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: card.primaryBg, color: card.primary }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="p-5 rounded-2xl border backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: card.primaryBg, color: card.primary }}>
              <Bell size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Total (7d)</span>
          </div>
          <p className="text-2xl font-black" style={{ color: card.text }}>
            {statsLoading ? <Loader2 size={20} className="animate-spin" /> : stats?.total ?? 0}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-5 rounded-2xl border backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              <Mail size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Emails Sent</span>
          </div>
          <p className="text-2xl font-black" style={{ color: '#10B981' }}>
            {statsLoading ? <Loader2 size={20} className="animate-spin" /> : stats?.emailSent ?? 0}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-5 rounded-2xl border backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
              <MessageSquare size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>SMS Sent</span>
          </div>
          <p className="text-2xl font-black" style={{ color: '#8B5CF6' }}>
            {statsLoading ? <Loader2 size={20} className="animate-spin" /> : stats?.smsSent ?? 0}
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-5 rounded-2xl border backdrop-blur-xl"
          style={{ background: card.bg, borderColor: card.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <XCircle size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: card.subtle }}>Failed</span>
          </div>
          <p className="text-2xl font-black" style={{ color: '#EF4444' }}>
            {statsLoading ? <Loader2 size={20} className="animate-spin" /> : stats?.failed ?? 0}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 p-2 rounded-xl border" style={{ background: card.bg, borderColor: card.border }}>
          <Filter size={14} style={{ color: card.subtle }} />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-sm font-medium focus:outline-none" style={{ color: card.text }}>
            <option value="">All Types</option>
            <option value="STAFF_INVITE">Staff Invite</option>
            <option value="WELCOME">Welcome</option>
            <option value="TEMP_PASSWORD">Temp Password</option>
            <option value="PASSWORD_RESET">Password Reset</option>
            <option value="PASSWORD_CHANGED">Password Changed</option>
            <option value="SALE_RECEIPT">Sale Receipt</option>
            <option value="REFUND_PROCESSED">Refund</option>
            <option value="EXPENSE_SUBMITTED">Expense</option>
            <option value="LOW_STOCK_ALERT">Low Stock</option>
          </select>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl border" style={{ background: card.bg, borderColor: card.border }}>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-sm font-medium focus:outline-none" style={{ color: card.text }}>
            <option value="">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Notification Table */}
      <div className="rounded-2xl border overflow-hidden backdrop-blur-xl"
        style={{ background: card.bg, borderColor: card.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.9)' }}>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Type</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Channel</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Recipient</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: card.subtle }}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto" style={{ color: card.primary }} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm font-medium" style={{ color: card.muted }}>
                    No notifications found.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-t transition-colors hover:opacity-80"
                    style={{ borderColor: card.border }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: card.primary }}>{typeIcon(log.type)}</span>
                        <span className="text-xs font-bold" style={{ color: card.text }}>
                          {log.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: log.channel === 'EMAIL' ? 'rgba(16,185,129,0.1)' : log.channel === 'SMS' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)',
                          color: log.channel === 'EMAIL' ? '#10B981' : log.channel === 'SMS' ? '#8B5CF6' : card.primary,
                        }}>
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs" style={{ color: card.text }}>
                        {log.recipientEmail || log.recipientPhone || 'N/A'}
                      </div>
                      {log.subject && (
                        <div className="text-[10px] truncate max-w-[200px]" style={{ color: card.subtle }}>{log.subject}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {log.status === 'SENT' ? <CheckCircle size={12} color="#10B981" /> :
                          log.status === 'FAILED' ? <XCircle size={12} color="#EF4444" /> :
                            <Clock size={12} style={{ color: card.subtle }} />}
                        <span className="text-xs font-bold" style={{ color: statusColor(log.status) }}>{log.status}</span>
                      </div>
                      {log.errorMessage && (
                        <div className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate">{log.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-mono" style={{ color: card.subtle }}>{formatDate(log.createdAt)}</span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: card.border }}>
            <p className="text-xs font-medium" style={{ color: card.muted }}>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}
                className="p-2 rounded-lg border disabled:opacity-40 transition-colors hover:bg-black/5"
                style={{ borderColor: card.border, color: card.text }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}
                className="p-2 rounded-lg border disabled:opacity-40 transition-colors hover:bg-black/5"
                style={{ borderColor: card.border, color: card.text }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
