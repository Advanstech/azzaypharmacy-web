'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useCustomAuth } from '@/lib/custom-auth';
import { gql, M_GENERATE_STAFF_PASSWORDS, M_CREATE_STAFF_ACCOUNT } from '@/lib/gql';
import { Shield, Users, Mail, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function SetupStaffPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'PHARMACIST' as const,
    branchId: '1',
    position: ''
  });
  
  const { user } = useCustomAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Only allow admins/owners to access this page
  if (user?.role !== 'OWNER' && user?.role !== 'MANAGER') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: isDark ? '#64748B' : '#94A3B8' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>Access Denied</h2>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B' }}>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleGeneratePasswords = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await gql<{ generateStaffPasswords?: boolean }>(M_GENERATE_STAFF_PASSWORDS);
      if (result?.generateStaffPasswords) {
        setMessage({
          type: 'success',
          text: 'Staff passwords generated successfully! Temporary passwords have been emailed to all staff members.'
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to generate passwords. Please check the console for errors.'
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await gql<{ createStaffAccount?: boolean }>(M_CREATE_STAFF_ACCOUNT, {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        branchId: formData.branchId,
        position: formData.position
      });
      
      if (result?.createStaffAccount) {
        setMessage({
          type: 'success',
          text: `Account created for ${formData.name}! They can now login with their email and password.`
        });
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'PHARMACIST',
          branchId: '1',
          position: ''
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to create account. Please check the details and try again.'
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen p-6" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: cardStyle.color }}>
            Staff Password Setup
          </h1>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Generate passwords for staff members to enable login access
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Setup */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6" style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }} />
              <h2 className="text-xl font-bold">Quick Setup</h2>
            </div>
            <p className="text-sm mb-6" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Generate temporary passwords for all staff members without accounts
            </p>
            <button
              onClick={handleGeneratePasswords}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={buttonStyle}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Passwords...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Generate All Staff Passwords
                </>
              )}
            </button>
            <p className="text-xs mt-3 text-center" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              Passwords will be emailed to staff members
            </p>
          </div>

          {/* Manual Setup */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6" style={{ color: isDark ? '#00D9FF' : '#0EA5E9' }} />
              <h2 className="text-xl font-bold">Manual Setup</h2>
            </div>
            <p className="text-sm mb-6" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Create an account for a specific staff member
            </p>
            
            {!manualMode ? (
              <button
                onClick={() => setManualMode(true)}
                className="w-full py-3 rounded-xl font-bold transition-all border-2 border-dashed"
                style={{
                  borderColor: isDark ? 'rgba(0,217,255,0.3)' : 'rgba(14,165,233,0.3)',
                  color: isDark ? '#00D9FF' : '#0EA5E9'
                }}
              >
                Create Individual Account
              </button>
            ) : (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: cardStyle.color,
                      border: '1px solid'
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: cardStyle.color,
                      border: '1px solid'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: cardStyle.color,
                      border: '1px solid'
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                    style={buttonStyle}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode(false)}
                    className="px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      color: cardStyle.color
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 rounded-2xl border" style={cardStyle}>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: isDark ? '#F59E0B' : '#D97706' }} />
            Security Notes
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            <li>• Temporary passwords are generated automatically and sent via email</li>
            <li>• Staff members should change their password after first login</li>
            <li>• Accounts are created with email confirmation automatically verified</li>
            <li>• Only Owners and Managers can access this setup page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
