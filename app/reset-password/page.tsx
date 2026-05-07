'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { gql, M_RESET_PASSWORD } from '@/lib/gql';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

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
      const result = await gql<{ resetPassword?: boolean }>(M_RESET_PASSWORD, {
        token,
        email,
        newPassword
      });

      if (result?.resetPassword) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError('Failed to reset password. The link may have expired.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: isDark ? '#64748B' : '#94A3B8' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>Invalid Reset Link</h2>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B' }}>This password reset link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const cardStyle = {
    background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.6)',
    color: isDark ? '#F8FAFC' : '#0F172A'
  };

  const buttonStyle = {
    background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
    color: isDark ? '#0A0E1A' : '#fff'
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="rounded-2xl border p-8" style={cardStyle}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: isDark ? 'linear-gradient(135deg, rgba(0,217,255,0.12), rgba(167,139,250,0.12))' : 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(139,92,246,0.1))',
                border: `2px solid ${isDark ? 'rgba(0,217,255,0.35)' : 'rgba(14,165,233,0.35)'}`,
              }}>
              <Lock className="w-8 h-8" style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: cardStyle.color }}>
              Reset Password
            </h1>
            <p className="text-sm" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Set a new password for {decodeURIComponent(email)}
            </p>
          </div>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-lg flex items-center gap-3"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981' }}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Password reset successful! Redirecting to login...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-lg flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
              >
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  New Password
                </label>
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
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: cardStyle.color,
                      border: '1px solid'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  Confirm Password
                </label>
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
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: cardStyle.color,
                      border: '1px solid'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={buttonStyle}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(203,213,225,0.3)' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#64748B' }} />
          <p style={{ color: '#94A3B8' }}>Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
