'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Building2, MapPin, Phone, Mail, FileText, Save, AlertCircle } from 'lucide-react';

export default function OrganizationPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    name: 'Azzay Pharmacy',
    country: 'Ghana',
    currency: 'GHS',
    taxId: 'GRA-TIN-123456789',
    email: 'admin@azzay.app',
    phone: '+233 24 123 4567',
    address: 'Dormaa Central, Bono Region',
  });

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1
          className="font-display text-3xl font-bold mb-2"
          style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
        >
          Organization Settings
        </h1>
        <p className="font-ui text-sm" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          Manage your organization's core information and branding.
        </p>
      </div>

      {/* Alert */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{
          background: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
        }}
      >
        <AlertCircle size={20} style={{ color: isDark ? '#FBBF24' : '#F59E0B', flexShrink: 0 }} />
        <div>
          <p
            className="font-ui text-sm font-medium mb-1"
            style={{ color: isDark ? '#FBBF24' : '#F59E0B' }}
          >
            Admin Access Required
          </p>
          <p className="font-ui text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Changes to organization settings require ROOT or OWNER permissions and will affect all branches.
          </p>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)',
        }}
      >
        <div
          className="p-6 border-b"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.8)',
            borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{
                background: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                color: isDark ? '#00D9FF' : '#0EA5E9',
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h2
                className="font-display text-lg font-bold"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              >
                Organization Details
              </h2>
              <p className="font-ui text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                Legal and operational information
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: isDark ? '#CBD5E1' : '#475569' }}
            >
              Organization Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </div>

          {/* Country & Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? '#CBD5E1' : '#475569' }}
              >
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? '#CBD5E1' : '#475569' }}
              >
                Currency
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </div>
          </div>

          {/* Tax ID */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: isDark ? '#CBD5E1' : '#475569' }}
            >
              Tax ID (GRA TIN)
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? '#CBD5E1' : '#475569' }}
              >
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: isDark ? '#CBD5E1' : '#475569' }}
              >
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: isDark ? '#CBD5E1' : '#475569' }}
            >
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none resize-none"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)'}`,
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </div>

          {/* Save Button */}
          <button
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #00D9FF 0%, #00A3CC 100%)'
                : 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              color: isDark ? '#0A0E1A' : '#FFFFFF',
              boxShadow: isDark
                ? '0 10px 30px rgba(0, 217, 255, 0.3)'
                : '0 10px 30px rgba(14, 165, 233, 0.3)',
            }}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
