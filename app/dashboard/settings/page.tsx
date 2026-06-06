'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Shield, Building, Globe, Zap, Bell, Palette, Lock, Eye, EyeOff, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { gql, M_CHANGE_PASSWORD } from '@/lib/gql';

export default function SettingsPage() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
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
    sectionBg: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)',
  };

  const themeOptions = [
    { label: 'Light', icon: Sun, value: 'light' },
    { label: 'Dark', icon: Moon, value: 'dark' },
    { label: 'System', icon: Monitor, value: 'system' },
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await gql<{ changePassword?: boolean }>(M_CHANGE_PASSWORD, {
        currentPassword,
        newPassword
      });

      if (result?.changePassword) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError('Failed to change password. Please check your current password.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    {
      title: 'Organization',
      desc: 'Manage institutional identity and branch defaults.',
      icon: Building,
      color: '#F97316',
      items: ['Organization Name', 'Branch Settings', 'Regional Preferences', 'Currency & Tax'],
    },
    {
      title: 'Notifications',
      desc: 'Configure alerts for stock, sales, and system events.',
      icon: Bell,
      color: '#0EA5E9',
      items: ['Low Stock Alerts', 'Expiry Warnings', 'Daily Sales Summary', 'AI Insights Digest'],
    },
    {
      title: 'Security',
      desc: 'Access control, PIN management, and session settings.',
      icon: Lock,
      color: '#EF4444',
      items: ['Change Password', 'PIN Code', 'Session Timeout', 'Two-Factor Auth'],
    },
  ];

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: card.text }}>Settings</h1>
        <p className="text-sm" style={{ color: card.muted }}>Configure terminal protocols and system preferences.</p>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
        <div className="p-5 border-b flex items-center gap-3"
          style={{ borderColor: card.border, background: card.sectionBg }}>
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
            <Palette size={20} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold" style={{ color: card.text }}>Appearance</h2>
            <p className="text-xs" style={{ color: card.subtle }}>Customize how NEXUS looks on your device.</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: card.subtle }}>Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(opt => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all"
                  style={{
                    background: active ? card.primaryBg : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(248,250,252,0.8)',
                    borderColor: active ? card.primaryBorder : card.border,
                    color: active ? card.primary : card.muted,
                    boxShadow: active ? `0 0 20px ${isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)'}` : 'none',
                  }}>
                  <Icon size={22} />
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Other Settings */}
      {settingsSections.map(section => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
            <div className="p-5 border-b flex items-center gap-3"
              style={{ borderColor: card.border, background: card.sectionBg }}>
              <div className="p-2.5 rounded-xl" style={{ background: `${section.color}18`, color: section.color }}>
                <Icon size={20} />
              </div>
              <div>
                <h2 className="font-display text-base font-bold" style={{ color: card.text }}>{section.title}</h2>
                <p className="text-xs" style={{ color: card.subtle }}>{section.desc}</p>
              </div>
            </div>
            <div className="p-2">
              {section.items.map((item, i) => (
                <button key={item}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                  style={{ color: card.text }}
                  onClick={() => item === 'Change Password' && setShowPasswordModal(true)}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(0,217,255,0.04)' : 'rgba(14,165,233,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span>{item}</span>
                  <span style={{ color: card.subtle }}>›</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-2xl overflow-hidden border"
              style={{
                background: card.bg,
                borderColor: card.border,
                boxShadow: card.shadow
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: card.text }}>
                      Change Password
                    </h2>
                    <p className="text-sm opacity-60" style={{ color: card.muted }}>
                      Update your account password
                    </p>
                  </div>
                  <button onClick={() => setShowPasswordModal(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <X className="w-6 h-6" style={{ color: card.text }} />
                  </button>
                </div>

                {success && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-3"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981' }}>
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Password changed successfully!</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-3"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: card.muted }}>Current Password</label>
                    <div className="relative">
                      <input 
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter current password"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                        style={{
                          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                          borderColor: card.border,
                          color: card.text,
                          border: '1px solid'
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: card.muted }}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: card.muted }}>New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter new password"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                        style={{
                          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                          borderColor: card.border,
                          color: card.text,
                          border: '1px solid'
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: card.muted }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: card.muted }}>Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                        style={{
                          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                          borderColor: card.border,
                          color: card.text,
                          border: '1px solid'
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: card.muted }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                    style={{
                      background: card.primary,
                      color: isDark ? '#0A0E1A' : '#fff',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
