'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from 'next-themes';
import { 
  User as UserIcon, Lock, Mail, Shield, Save, Key, 
  CheckCircle2, AlertCircle, Eye, EyeOff 
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const c = {
    bg: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.95)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.6)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    pBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    card: isDark ? '#0F172A' : '#FFFFFF',
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    
    setLoading(true);
    // Simulation of password reset
    setTimeout(() => {
      setLoading(false);
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    }, 1500);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: c.text }}>My Profile</h1>
          <p className="text-sm mt-2" style={{ color: c.muted }}>Manage your personal information and security settings</p>
        </div>
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black shadow-xl"
          style={{ background: `linear-gradient(135deg, ${c.primary}, #A78BFA)`, color: isDark ? '#060B14' : '#FFF' }}>
          {user?.email?.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Account Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-3xl border p-8 shadow-sm" style={{ background: c.card, borderColor: c.border }}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6" style={{ color: c.text }}>
              <UserIcon size={20} style={{ color: c.primary }} />
              Account Details
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Email Address</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-slate-500/5" style={{ borderColor: c.border }}>
                  <Mail size={18} style={{ color: c.muted }} />
                  <span className="font-medium" style={{ color: c.text }}>{user?.email}</span>
                  <div className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">Verified</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>System Role</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-slate-500/5" style={{ borderColor: c.border }}>
                  <Shield size={18} style={{ color: c.muted }} />
                  <span className="font-bold uppercase tracking-tighter" style={{ color: c.primary }}>{user?.user_metadata?.role || 'Staff'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security / Password */}
          <div className="rounded-3xl border p-8 shadow-sm" style={{ background: c.card, borderColor: c.border }}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6" style={{ color: c.text }}>
              <Lock size={20} style={{ color: c.primary }} />
              Security Settings
            </h2>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full pl-4 pr-12 py-3.5 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                      style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: c.border, color: c.text }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.muted }}>Confirm Password</label>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3.5 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                    style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC', borderColor: c.border, color: c.text }}
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-50"
                style={{ background: c.primary, color: isDark ? '#060B14' : '#FFF' }}>
                {loading ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" /> : <Save size={20} />}
                UPDATE PASSWORD
              </button>
            </form>
          </div>
        </div>

        {/* Status / Activity */}
        <div className="space-y-6">
          <div className="rounded-3xl border p-6 shadow-sm" style={{ background: c.card, borderColor: c.border }}>
             <h3 className="font-bold text-sm mb-4" style={{ color: c.text }}>Login Activity</h3>
             <div className="space-y-4">
                <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/10 text-green-500 shrink-0">
                      <Key size={14} />
                   </div>
                   <div>
                      <p className="text-[11px] font-bold" style={{ color: c.text }}>Current Session</p>
                      <p className="text-[10px]" style={{ color: c.muted }}>{new Date().toLocaleString()}</p>
                   </div>
                </div>
                <div className="flex gap-3 opacity-50">
                   <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-500/10 text-slate-500 shrink-0">
                      <Key size={14} />
                   </div>
                   <div>
                      <p className="text-[11px] font-bold" style={{ color: c.text }}>Previous Login</p>
                      <p className="text-[10px]" style={{ color: c.muted }}>Yesterday, 09:42 AM</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="rounded-3xl border p-6 shadow-sm" style={{ background: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.02)', borderColor: 'rgba(239,68,68,0.1)' }}>
             <h3 className="font-bold text-sm mb-2 text-red-500">Security Notice</h3>
             <p className="text-[11px] leading-relaxed" style={{ color: c.muted }}>
                If you suspect unauthorized access, please change your password immediately and contact your supervisor.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
