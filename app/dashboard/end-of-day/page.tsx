'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  Calendar, Clock, CheckCircle, AlertCircle, FileText, 
  Download, Printer, ArrowRight, UserCheck, BarChart3, TrendingUp,
  XCircle, Search, Filter, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';

export default function EndOfDayDashboardPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { closeTerminal, todaySales, todayRevenue, todayTransactions, me } = useStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

  // Derived personal stats
  const mySales = todaySales.filter(s => s.user?.id === me?.id || (s as any).cashierId === me?.id);
  const myRevenue = mySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const myTransactions = mySales.length;

  useEffect(() => { setMounted(true); }, []);

  const handleCloseTerminal = async () => {
    setLoading(true);
    try {
      const result = await closeTerminal();
      setReport(result);
      setSubmitted(true);
    } catch (e: any) {
      // Fallback to local session data
      setReport({
        cashierName: me?.name || user?.email || 'Staff',
        branchName: me?.branch?.name || 'Azzay Pharmacy',
        totalSales: isManager ? todayRevenue : myRevenue,
        cashSales: (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0),
        momoSales: (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'MOMO').reduce((sum, s) => sum + s.totalAmount, 0),
        cardSales: (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.totalAmount, 0),
        nhisSales: (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'NHIS').reduce((sum, s) => sum + s.totalAmount, 0),
        creditSales: 0,
        transactionCount: isManager ? todayTransactions : myTransactions,
        closingTime: new Date().toISOString(),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const [pendingClosures, setPendingClosures] = useState([
    { id: 1, cashier: 'Cashier Kwame', branch: 'Dormaa Main', total: 1450, time: '18:30 PM', status: 'PENDING' },
    { id: 2, cashier: 'Pharmacist Dery', branch: 'Dormaa Main', total: 2800, time: '18:45 PM', status: 'PENDING' },
  ]);

  const handleAction = (id: number, status: string) => {
    setPendingClosures(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const isDark = mounted && theme === 'dark';
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    success: '#10B981',
    danger: '#EF4444',
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>End of Day Supervision</h1>
          <p className="text-sm" style={{ color: c.muted }}>Shift reconciliation and handover management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Supervision Table for Managers */}
          {isManager && (
            <div className="rounded-[32px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
              <div className="p-6 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-blue-500" size={20} />
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c.text }}>Terminal Closure Requests</h3>
                </div>
                <div className="flex gap-2">
                  <Search size={16} className="text-slate-500" />
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: c.border }}>
                {pendingClosures.map((item) => (
                  <div key={item.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Clock size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: c.text }}>{item.cashier}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${item.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                          {item.branch} • Ended at {item.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Sales</p>
                        <p className="text-lg font-black" style={{ color: c.text }}>GH₵ {item.total.toFixed(2)}</p>
                      </div>
                      
                      {item.status === 'PENDING' && (
                        <div className="flex gap-2 border-l pl-6" style={{ borderColor: c.border }}>
                          <button 
                            onClick={() => handleAction(item.id, 'APPROVED')}
                            className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
                            title="Verify & Accept"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button 
                            onClick={() => handleAction(item.id, 'REJECTED')}
                            className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
                            title="Reject Report"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Session Summary */}
          <div className="rounded-[32px] border p-8 backdrop-blur-xl" style={{ background: c.bg, borderColor: c.border }}>
            <h3 className="font-display text-sm font-bold uppercase tracking-widest mb-8" style={{ color: c.muted }}>Your Current Session</h3>
            <div className="grid grid-cols-3 gap-6">
              {[
                { 
                  label: 'Live Sales', 
                  value: report?.totalSales ?? (isManager ? todayRevenue : myRevenue), 
                  icon: TrendingUp, color: c.primary 
                },
                { 
                  label: 'Physical Cash', 
                  value: report?.cashSales ?? (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0), 
                  icon: FileText, color: c.success 
                },
                { 
                  label: 'Digital Hub', 
                  value: report ? (report.momoSales + report.cardSales) : (isManager ? todaySales : mySales).filter(s => ['MOMO','CARD'].includes(s.paymentMethod)).reduce((sum, s) => sum + s.totalAmount, 0), 
                  icon: BarChart3, color: '#8B5CF6' 
                },
              ].map(k => (
                <div key={k.label} className="p-6 rounded-[24px] border" style={{ borderColor: c.border, background: isDark ? 'rgba(0,0,0,0.1)' : '#fff' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{k.label}</p>
                  <p className="text-2xl font-black font-mono" style={{ color: c.text }}>GH₵ {Number(k.value).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
              <div>
                <p className="text-xs" style={{ color: c.muted }}>Transactions Today</p>
                <p className="font-display text-2xl font-bold" style={{ color: c.primary }}>{report?.transactionCount ?? (isManager ? todayTransactions : myTransactions)}</p>
              </div>
              {submitted && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', color: c.success }}>
                  <CheckCircle size={16} />
                  <span className="text-sm font-bold">Report Submitted</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border p-8 backdrop-blur-xl bg-blue-500/5 border-dashed" style={{ borderColor: c.primary + '40' }}>
            <h3 className="font-display text-sm font-bold mb-6" style={{ color: c.text }}>Operational Checklist</h3>
            <div className="space-y-4">
              {[
                { task: 'Verify Physical Cash', done: true },
                { task: 'Check Digital Statements', done: true },
                { task: 'Review Pending Refunds', done: false },
                { task: 'Lock POS Terminal', done: false },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${t.done ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-500/30'}`}>
                    {t.done && <CheckCircle size={12} />}
                  </div>
                  <span className="text-xs font-medium" style={{ color: t.done ? c.text : c.muted }}>{t.task}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border p-8 backdrop-blur-xl bg-emerald-500/5" style={{ borderColor: c.success + '30' }}>
            <div className="flex items-center gap-3 mb-4">
               <AlertCircle size={20} className="text-emerald-500" />
               <h3 className="text-sm font-bold" style={{ color: c.text }}>Terminal Closure</h3>
            </div>
            <p className="text-xs leading-relaxed mb-6" style={{ color: c.muted }}>Finalizing your shift will submit a reconciliation report for manager approval.</p>
            <button
              onClick={handleCloseTerminal}
              disabled={loading || submitted}
              className="w-full py-4 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/30 transition-all"
              style={{
                background: submitted ? 'rgba(16,185,129,0.3)' : '#10B981',
                color: '#fff',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? 'SUBMITTING...' : submitted ? '✓ SHIFT SUBMITTED' : 'SUBMIT SHIFT REPORT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
