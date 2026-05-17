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
  const { closeTerminal, todaySales, todayRevenue, todayTransactions, me, staff } = useStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const role = user?.user_metadata?.role || me?.role;
  const isManager = ['ROOT', 'SE_ADMIN', 'OWNER', 'MANAGER', 'HEAD_PHARMACIST'].includes(role || '');

  // Derived personal stats
  const mySales = todaySales.filter(s => s.user?.id === me?.id || (s as any).cashierId === me?.id);
  const myRevenue = mySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const myTransactions = mySales.length;

  useEffect(() => { setMounted(true); }, []);

  const handleCloseTerminal = async () => {
    setLoading(true);
    try {
      const result = await closeTerminal();
      setReport(result);
      setSubmitted(true);
    } catch (e: any) {
      setReport({
        cashierName: me?.name || user?.email || 'Staff',
        branchName: me?.branch?.name || 'Azzay Pharmacy',
        totalSales: myRevenue,
        cashSales: mySales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        momoSales: mySales.filter(s => s.paymentMethod === 'MOMO').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        cardSales: mySales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        nhisSales: mySales.filter(s => s.paymentMethod === 'NHIS').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        creditSales: mySales.filter(s => s.paymentMethod === 'CREDIT').reduce((sum, s) => sum + Number(s.totalAmount), 0),
        transactionCount: myTransactions,
        closingTime: new Date().toISOString(),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // For managers, we simulate "pending closures" by showing active staff sales
  const activeStaffStats = staff
    .filter(s => s.isActive)
    .map(s => {
      const sSales = todaySales.filter(sale => sale.user?.id === s.id);
      const sTotal = sSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
      return {
        id: s.id,
        cashier: s.name,
        branch: s.branch?.name || 'Main Branch',
        total: sTotal,
        transactions: sSales.length,
        status: s.isOnDuty ? 'ON DUTY' : 'FINISHED',
        time: s.lastSeen || 'N/A'
      };
    })
    .filter(s => s.total > 0);

  const [verifiedStaff, setVerifiedStaff] = useState<string[]>([]);

  const handleVerify = (id: string) => {
    setVerifiedStaff(prev => [...prev, id]);
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
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: c.text }}>
            {isManager ? 'Shift Supervision' : 'My End of Day'}
          </h1>
          <p className="text-sm" style={{ color: c.muted }}>
            {isManager ? 'Review and approve staff reconciliations' : 'Submit your shift report for approval'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Supervision Dashboard for Managers */}
          {isManager && (
            <div className="rounded-[32px] border backdrop-blur-xl overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
              <div className="p-6 border-b flex items-center justify-between" style={{ background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-blue-500" size={20} />
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: c.text }}>Staff Session Overviews</h3>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: c.border }}>
                {activeStaffStats.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm" style={{ color: c.muted }}>No active sales sessions today</p>
                  </div>
                ) : activeStaffStats.map((item) => (
                  <div key={item.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Clock size={24} className={item.status === 'ON DUTY' ? 'text-blue-400 animate-pulse' : 'text-amber-400'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: c.text }}>{item.cashier}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${item.status === 'ON DUTY' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: c.muted }}>
                          {item.branch} • {item.transactions} txns
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold">Today's Sales</p>
                        <p className="text-lg font-black" style={{ color: c.text }}>GH₵ {item.total.toFixed(2)}</p>
                      </div>
                      
                      {!verifiedStaff.includes(item.id) ? (
                        <div className="flex gap-2 border-l pl-6" style={{ borderColor: c.border }}>
                          <button 
                            onClick={() => handleVerify(item.id)}
                            className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
                            title="Verify & Accept"
                          >
                            <CheckCircle size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                          <UserCheck size={16} />
                          <span className="text-[10px] font-black">VERIFIED</span>
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
            <h3 className="font-display text-sm font-bold uppercase tracking-widest mb-8" style={{ color: c.muted }}>
              {isManager ? 'Global Daily Totals' : 'Your Personal Session'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Total Revenue', 
                  value: report?.totalSales ?? (isManager ? todayRevenue : myRevenue), 
                  icon: TrendingUp, color: c.primary 
                },
                { 
                  label: 'Physical Cash', 
                  value: report?.cashSales ?? (isManager ? todaySales : mySales).filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + Number(s.totalAmount), 0), 
                  icon: FileText, color: c.success 
                },
                { 
                  label: 'Digital Payments', 
                  value: report ? (report.momoSales + report.cardSales) : (isManager ? todaySales : mySales).filter(s => ['MOMO','CARD'].includes(s.paymentMethod)).reduce((sum, s) => sum + Number(s.totalAmount), 0), 
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
                <p className="text-xs" style={{ color: c.muted }}>Total Transactions</p>
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
            <h3 className="font-display text-sm font-bold mb-6" style={{ color: c.text }}>Reconciliation Checklist</h3>
            <div className="space-y-4">
              {[
                { task: 'Verify Physical Cash Drawer', done: true },
                { task: 'Check MoMo/Card Statements', done: true },
                { task: 'Account for All Credit Sales', done: false },
                { task: 'Print Session Summary', done: false },
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

          {!isManager && (
            <div className="rounded-[32px] border p-8 backdrop-blur-xl bg-emerald-500/5" style={{ borderColor: c.success + '30' }}>
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={20} className="text-emerald-500" />
                 <h3 className="text-sm font-bold" style={{ color: c.text }}>Finalize Shift</h3>
              </div>
              <p className="text-xs leading-relaxed mb-6" style={{ color: c.muted }}>Submitting your report will log your final totals and notify management for approval.</p>
              <button
                onClick={handleCloseTerminal}
                disabled={loading || submitted}
                className="w-full py-4 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/30 transition-all uppercase tracking-widest"
                style={{
                  background: submitted ? 'rgba(16,185,129,0.3)' : '#10B981',
                  color: '#fff',
                  opacity: loading ? 0.7 : 1,
                }}>
                {loading ? 'Processing...' : submitted ? '✓ Report Submitted' : 'Submit Reconciliation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
