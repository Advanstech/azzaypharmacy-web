'use client';

import { Building2, Activity, Shield, Database, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

const settingsCards = [
  {
    label: 'Organization',
    href: '/admin/settings/organization',
    icon: Building2,
    description: 'Manage organization details, legal info, and branding',
    color: '#0EA5E9'
  },
  {
    label: 'Branches',
    href: '/admin/settings/branches',
    icon: Activity,
    description: 'Configure branch locations and operational settings',
    color: '#10B981'
  },
  {
    label: 'Security',
    href: '/admin/settings/security',
    icon: Shield,
    description: 'Access control, permissions, and authentication settings',
    color: '#8B5CF6'
  },
  {
    label: 'System',
    href: '/admin/settings/system',
    icon: Database,
    description: 'System configuration, backups, and maintenance',
    color: '#F59E0B'
  },
];

export default function SettingsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-display font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
          System Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          Manage your organization, branches, and security configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-start gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02]"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)',
              }}
            >
              <div
                className="p-3 rounded-xl shrink-0"
                style={{ background: `${card.color}20`, color: card.color }}
              >
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {card.label}
                  </h3>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: card.color }} />
                </div>
                <p className="text-xs mt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
